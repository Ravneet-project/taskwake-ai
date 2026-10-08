import api from './api';
const STORAGE_KEY = 'taskwake_settings';
export async function syncReminderPreferences(preferences) {
  const saved = preferences || JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const { data } = await api.put('/notifications/preferences', saved);
  return data.preferences;
}
export async function loadReminderPreferences() {
  const { data } = await api.get('/notifications/preferences');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.preferences));
  return data.preferences;
}
export function startReminderPolling({ onNotification } = {}) {
  let active = true;
  let busy = false;
  let lastSeen = Number(sessionStorage.getItem('taskwake_last_notification') || 0);
  async function poll() {
    if (!active || busy) return;
    busy = true;
    try {
      const { data } = await api.get('/notifications/inbox', { params: { since: lastSeen } });
      const notifications = (data.notifications || []).sort((a, b) => a.createdAt - b.createdAt);
      for (const item of notifications) {
        if (!active) break;
        onNotification?.(item);
        const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (prefs.browserNotifications !== false && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(item.title, { body: item.body, tag: item.id });
        }
        lastSeen = Math.max(lastSeen, item.createdAt);
        sessionStorage.setItem('taskwake_last_notification', String(lastSeen));
      }
    } catch (error) { console.error('Reminder polling failed:', error); }
    finally { busy = false; }
  }
  poll();
  const interval = setInterval(poll, 30000);
  return () => { active = false; clearInterval(interval); };
}
