const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const DEFAULTS = { browserNotifications: true, emailReminders: false, reminderMinutes: 15, dailySummary: false, soundEnabled: true, quietHoursEnabled: false, quietStart: '22:00', quietEnd: '07:00', timeZone: 'Asia/Kolkata' };
const DATA_DIR = process.env.REMINDER_DATA_DIR || path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'reminder-state.json');
const INTERVAL_MS = 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
let running = false;
let timer = null;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') console.error('[reminders] State read failed:', error.message); return { preferences: {}, deliveries: {}, inbox: {} }; }
}
function saveState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${STATE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2));
  fs.renameSync(temp, STATE_FILE);
}
function userId(user) { return String(user?.id ?? user?._id ?? user?.userId ?? ''); }
function preferences(state, id) { return { ...DEFAULTS, ...(state.preferences[id] || {}) }; }
function validatePrefs(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid preferences');
  const out = {};
  for (const key of ['browserNotifications', 'emailReminders', 'dailySummary', 'soundEnabled', 'quietHoursEnabled']) {
    if (key in input) { if (typeof input[key] !== 'boolean') throw new Error(`Invalid ${key}`); out[key] = input[key]; }
  }
  if ('reminderMinutes' in input) {
    const minutes = Number(input.reminderMinutes);
    if (![0, 5, 10, 15, 30, 60, 1440].includes(minutes)) throw new Error('Invalid reminderMinutes');
    out.reminderMinutes = minutes;
  }
  for (const key of ['quietStart', 'quietEnd']) {
    if (key in input) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input[key])) throw new Error(`Invalid ${key}`); out[key] = input[key]; }
  }
  if ('timeZone' in input) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: input.timeZone }); }
    catch { throw new Error('Invalid timeZone'); }
    out.timeZone = input.timeZone;
  }
  return out;
}
function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
function localMinutes(date, zone) { const p = localParts(date, zone); return Number(p.hour) * 60 + Number(p.minute); }
function inQuietHours(date, prefs) {
  if (!prefs.quietHoursEnabled) return false;
  const now = localMinutes(date, prefs.timeZone);
  const toMinutes = x => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
  const start = toMinutes(prefs.quietStart), end = toMinutes(prefs.quietEnd);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}
function parseTaskTime(task, timeZone) {
  const date = String(task.date || '').slice(0, 10);
  const time = String(task.time || '').slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const target = `${date} ${time}`;
  let guess = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(guess)) return null;
  // Resolve wall-clock time in the user's IANA timezone, including DST offsets.
  for (let i = 0; i < 4; i++) {
    const p = localParts(new Date(guess), timeZone);
    const actual = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
    const wanted = Date.parse(`${date}T${time}:00Z`);
    guess += wanted - actual;
  }
  const p = localParts(new Date(guess), timeZone);
  if (`${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}` !== target) return null;
  return guess;
}
function createMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
const mailer = createMailer();
async function sendEmail(user, task) {
  if (!mailer || !user.email) return false;
  await mailer.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: `TaskWake reminder: ${String(task.title || 'Task').slice(0, 100)}`, text: `Task: ${task.title || 'Untitled'}\nDue: ${task.date} ${task.time}\n\nOpen TaskWake AI to view your task.` });
  return true;
}
function normalizeTask(task) { return { id: task.id ?? task._id, title: task.title, date: task.date, time: task.time, status: task.status, userId: task.userId ?? task.user_id ?? task.ownerId }; }
function getDue(state, id, after = 0) {
  return (state.inbox[id] || []).filter(item => item.createdAt > after).slice(-100);
}
function markRead(state, id, notificationId) {
  const item = (state.inbox[id] || []).find(n => n.id === notificationId);
  if (!item) return false;
  item.read = true;
  saveState(state);
  return true;
}
async function runTick({ listTasks, findUser }) {
  if (running) return;
  running = true;
  try {
    const state = readState();
    const tasks = await listTasks(); // Must return tasks with an owner userId.
    const now = Date.now();
    for (const raw of tasks) {
      const task = normalizeTask(raw);
      const id = String(task.userId || '');
      if (!id || task.id == null || task.status === 'completed') continue;
      const prefs = preferences(state, id);
      const due = parseTaskTime(task, prefs.timeZone);
      if (due === null) continue;
      const scheduled = due - prefs.reminderMinutes * 60000;
      if (now < scheduled || now - scheduled > LOOKBACK_MS || inQuietHours(new Date(now), prefs)) continue;
      const signature = `${id}:${task.id}:${task.date}:${task.time}:${prefs.reminderMinutes}`;
      const record = state.deliveries[signature] || {};
      if (prefs.browserNotifications && !record.browser) {
        const notification = { id: `${now}-${Math.random().toString(36).slice(2, 9)}`, title: 'Task reminder', body: `${task.title || 'Task'} is due ${task.date} at ${task.time}`, taskId: task.id, createdAt: now, read: false };
        state.inbox[id] ||= [];
        state.inbox[id].push(notification);
        state.inbox[id] = state.inbox[id].slice(-200);
        record.browser = now;
      }
      if (prefs.emailReminders && !record.email && (!record.lastEmailAttempt || now - record.lastEmailAttempt > RETRY_MS)) {
        record.lastEmailAttempt = now;
        try {
          const user = await findUser(id);
          if (user && await sendEmail(user, task)) record.email = now;
          else if (!mailer) console.warn('[reminders] SMTP not configured: email skipped');
        } catch (error) { console.error('[reminders] Email failed:', error.message); }
      }
      state.deliveries[signature] = record;
    }
    // Bound retained state. Remove old delivery signatures after 30 days.
    for (const [key, item] of Object.entries(state.deliveries)) {
      const last = Math.max(item.browser || 0, item.email || 0, item.lastEmailAttempt || 0);
      if (last && now - last > 30 * 86400000) delete state.deliveries[key];
    }
    saveState(state);
  } catch (error) { console.error('[reminders] Tick failed:', error); }
  finally { running = false; }
}
function startScheduler(adapters) {
  if (timer) return () => clearInterval(timer);
  runTick(adapters);
  timer = setInterval(() => runTick(adapters), INTERVAL_MS);
  timer.unref?.();
  return () => { clearInterval(timer); timer = null; };
}
module.exports = { DEFAULTS, readState, saveState, userId, preferences, validatePrefs, getDue, markRead, startScheduler, runTick, parseTaskTime, inQuietHours };
