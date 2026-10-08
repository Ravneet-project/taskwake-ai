import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Settings.css";
import { syncReminderPreferences, loadReminderPreferences, startReminderPolling } from "../services/reminderClient";
import "./Sidebar.css";
const STORAGE_KEY = "taskwake_settings";

const defaults = {
  browserNotifications: true,
  emailReminders: false,
  reminderMinutes: 15,
  dailySummary: false,
  soundEnabled: true,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
};

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...defaults, ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}) };
  } catch {
    return { ...defaults };
  }
}

function notificationStatus() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [permission, setPermission] = useState(notificationStatus);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const updatePermission = () => setPermission(notificationStatus());
    window.addEventListener("focus", updatePermission);
    return () => window.removeEventListener("focus", updatePermission);
  }, []);

  useEffect(() => {
    let active = true;
    loadReminderPreferences().then((remote) => {
      if (active) setSettings((current) => ({ ...current, ...remote }));
    }).catch((error) => console.warn("Could not load remote reminder preferences:", error));
    return () => { active = false; };
  }, []);

  useEffect(() => startReminderPolling(), []);

  const update = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const notify = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const save = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      await syncReminderPreferences(settings);
      notify("Preferences saved to your account and this browser.");
    } catch {
      notify("Unable to save preferences. Check browser storage settings.", "error");
    }
  };

  const reset = async () => {
    setSettings({ ...defaults });
    try {
      localStorage.removeItem(STORAGE_KEY);
      await syncReminderPreferences(defaults);
      notify("Preferences reset and synced to your account.");
    } catch {
      notify("Defaults restored on screen, but browser storage could not be cleared.", "error");
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      notify("This browser does not support notifications.", "error");
      return;
    }
    if (!window.isSecureContext) {
      notify("Browser notifications require HTTPS or localhost.", "error");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      notify(result === "granted" ? "Browser notification permission enabled." : "Permission not granted. You can change it in browser site settings.", result === "granted" ? "success" : "error");
    } catch {
      notify("Could not request notification permission.", "error");
    }
  };

  const testNotification = () => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      notify("Allow browser notifications before sending a test.", "error");
      return;
    }
    try {
      new Notification("TaskWake AI 🔔", {
        body: "Your browser notifications are working!",
        icon: "/favicon.ico",
      });
      notify("Test notification sent. Check your browser or system notifications.");
    } catch {
      notify("Unable to show a test notification on this device.", "error");
    }
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: "bi-grid-fill" },
    { label: "My Tasks", path: "/tasks", icon: "bi-check2-square" },
    { label: "Reminders", path: "/reminders", icon: "bi-alarm-fill" },
    { label: "Rescheduled", path: "/rescheduled", icon: "bi-arrow-repeat" },
    { label: "Insights", path: "/insights", icon: "bi-graph-up-arrow" },
    { label: "Settings", path: "/settings", icon: "bi-gear-fill" },
  ];

  const goTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-shell tw-settings-page">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <div className="dashboard-brand">
            <div className="dashboard-brand-icon"><i className="bi bi-bell-fill" /></div>
            <div><strong>TaskWake</strong><span>AI</span></div>
          </div>
          <button type="button" className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.slice(0, 5).map((item) => (
            <button key={item.path} type="button" className={`nav-item ${location.pathname === item.path ? "active" : ""}`} onClick={() => goTo(item.path)}>
              <i className={`bi ${item.icon}`} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <div className="sidebar-card-icon"><i className="bi bi-sliders" /></div>
          <h4>Make it yours</h4>
          <p>Choose how TaskWake AI reminds you about important work.</p>
        </div>
        <div className="sidebar-bottom">
          <button type="button" className="nav-item active" onClick={() => goTo("/settings")}>
            <i className="bi bi-gear-fill" /><span>Settings</span>
          </button>
          <button type="button" className="nav-item logout-item" onClick={signOut}>
            <i className="bi bi-box-arrow-right" /><span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <button type="button" className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <i className="bi bi-list" />
            </button>
            <div><p className="dashboard-label">Personal Preferences</p><h1>Settings</h1></div>
          </div>
          <div className="dashboard-header-actions">
            <div className="profile-chip">
              <div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
              <div className="profile-text"><strong>{user?.name || "User"}</strong><span>{user?.email || ""}</span></div>
            </div>
          </div>
        </header>

        <section className="dashboard-content tw-settings-content">
          <div className="tw-settings-hero">
            <div className="tw-settings-hero-icon"><i className="bi bi-sliders2" /></div>
            <div><span>PERSONALIZE YOUR WORKFLOW</span><h2>Your workspace, your rules.</h2><p>Manage reminders, notification preferences and account information.</p></div>
          </div>

          {message && (
            <div className={`tw-settings-message ${messageType}`} role={messageType === "error" ? "alert" : "status"}>
              <i className={`bi ${messageType === "error" ? "bi-exclamation-triangle" : "bi-check-circle"}`} />
              <span>{message}</span>
              <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message"><i className="bi bi-x" /></button>
            </div>
          )}

          <div className="tw-settings-grid">
            <div className="tw-settings-stack">
              <section className="tw-settings-card">
                <div className="tw-settings-card-heading"><div className="tw-settings-icon purple"><i className="bi bi-bell" /></div><div><h3>Browser Notifications</h3><p>Control notifications on this device.</p></div></div>
                <div className="tw-settings-field tw-settings-toggle-row">
                  <div><strong>Browser reminder preference</strong><small>Remember whether you want browser reminders.</small></div>
                  <label className="tw-settings-switch"><input type="checkbox" checked={settings.browserNotifications} onChange={(e) => update("browserNotifications", e.target.checked)} aria-label="Browser reminder preference" /><span /></label>
                </div>
                <div className="tw-settings-permission">
                  <div><strong>Permission status</strong><span className={`tw-settings-status ${permission}`}>{permission === "granted" ? "Allowed" : permission === "denied" ? "Blocked" : permission === "default" ? "Not requested" : "Unavailable"}</span></div>
                  <p>Permission is controlled by your browser. Saving a preference does not grant permission or schedule notifications.</p>
                  <div className="tw-settings-actions">
                    <button type="button" className="tw-settings-primary" onClick={requestPermission} disabled={permission === "granted" || permission === "unsupported"}>
                      <i className="bi bi-shield-check" /> {permission === "granted" ? "Permission Granted" : "Allow Notifications"}
                    </button>
                    <button type="button" className="tw-settings-secondary" onClick={testNotification} disabled={permission !== "granted"}>
                      <i className="bi bi-send" /> Send Test
                    </button>
                  </div>
                </div>
              </section>

              <section className="tw-settings-card">
                <div className="tw-settings-card-heading"><div className="tw-settings-icon orange"><i className="bi bi-alarm" /></div><div><h3>Reminder Preferences</h3><p>Choose your preferred reminder timing.</p></div></div>
                <label className="tw-settings-field tw-settings-select-label">
                  <span><strong>Remind me before a task</strong><small>Preferred lead time for future reminder integration.</small></span>
                  <select value={settings.reminderMinutes} onChange={(e) => update("reminderMinutes", Number(e.target.value))}>
                    <option value={0}>At task time</option>
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </label>
                <div className="tw-settings-field tw-settings-toggle-row">
                  <div><strong>Notification sound preference</strong><small>For future sound-enabled reminders.</small></div>
                  <label className="tw-settings-switch"><input type="checkbox" checked={settings.soundEnabled} onChange={(e) => update("soundEnabled", e.target.checked)} aria-label="Notification sound preference" /><span /></label>
                </div>
                <div className="tw-settings-field tw-settings-toggle-row">
                  <div><strong>Quiet hours</strong><small>Preferred time window to avoid interruptions.</small></div>
                  <label className="tw-settings-switch"><input type="checkbox" checked={settings.quietHoursEnabled} onChange={(e) => update("quietHoursEnabled", e.target.checked)} aria-label="Enable quiet hours" /><span /></label>
                </div>
                {settings.quietHoursEnabled && (
                  <div className="tw-settings-time-grid">
                    <label>Start time<input type="time" value={settings.quietStart} onChange={(e) => update("quietStart", e.target.value)} /></label>
                    <label>End time<input type="time" value={settings.quietEnd} onChange={(e) => update("quietEnd", e.target.value)} /></label>
                  </div>
                )}
              </section>

              <section className="tw-settings-card">
                <div className="tw-settings-card-heading"><div className="tw-settings-icon blue"><i className="bi bi-envelope" /></div><div><h3>Email Preferences</h3><p>Choose the emails you would like to receive.</p></div></div>
                <div className="tw-settings-field tw-settings-toggle-row">
                  <div><strong>Email reminders</strong><small>Emails are sent when SMTP is configured and the scheduler is running.</small></div>
                  <label className="tw-settings-switch"><input type="checkbox" checked={settings.emailReminders} onChange={(e) => update("emailReminders", e.target.checked)} aria-label="Email reminders" /><span /></label>
                </div>
                <div className="tw-settings-field tw-settings-toggle-row">
                  <div><strong>Daily summary</strong><small>Preference for a daily productivity email.</small></div>
                  <label className="tw-settings-switch"><input type="checkbox" checked={settings.dailySummary} onChange={(e) => update("dailySummary", e.target.checked)} aria-label="Daily email summary" /><span /></label>
                </div>
                <p className="tw-settings-hint"><i className="bi bi-info-circle" /> Email delivery requires configured SMTP credentials and a running backend scheduler. Daily summary delivery is not implemented yet.</p>
              </section>
            </div>

            <div className="tw-settings-stack">
              <section className="tw-settings-card">
                <div className="tw-settings-card-heading"><div className="tw-settings-icon green"><i className="bi bi-person-circle" /></div><div><h3>Account Details</h3><p>Your signed-in account information.</p></div></div>
                <div className="tw-settings-profile"><div className="tw-settings-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div><div><strong>{user?.name || "TaskWake User"}</strong><span>Signed-in account</span></div></div>
                <div className="tw-settings-account-row"><span>Full name</span><strong>{user?.name || "Not available"}</strong></div>
                <div className="tw-settings-account-row"><span>Email address</span><strong className="tw-settings-email">{user?.email || "Not available"}</strong></div>
                <p className="tw-settings-hint"><i className="bi bi-lock" /> Account details are read from your login session. Editing them requires a backend profile endpoint.</p>
              </section>

              <section className="tw-settings-card tw-settings-help-card">
                <div className="tw-settings-card-heading"><div className="tw-settings-icon purple"><i className="bi bi-lightbulb" /></div><div><h3>How preferences work</h3><p>Important information about this version.</p></div></div>
                <p>Saving preferences also syncs them to your TaskWake account on the backend.</p>
                <p>Browser permission enables notifications, but a scheduler or service worker must be connected to deliver reminders at the right time.</p>
              </section>

              <section className="tw-settings-card tw-settings-save-card">
                <h3>Save your preferences</h3>
                <p>Save your preferences to this browser and your account.</p>
                <button type="button" className="tw-settings-primary tw-settings-full" onClick={save}><i className="bi bi-check2-circle" /> Save Changes</button>
                <button type="button" className="tw-settings-secondary tw-settings-full" onClick={reset}><i className="bi bi-arrow-counterclockwise" /> Reset to Defaults</button>
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
