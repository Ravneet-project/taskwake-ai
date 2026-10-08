import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { motion } from "framer-motion";

import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import api from "../services/api";

import "./Insights.css";
import "./Sidebar.css";
const Insights = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activityRange, setActivityRange] = useState(52);

  const [tasks, setTasks] = useState([]);

  const [smartInsight, setSmartInsight] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const navItems = [

    { label: "Dashboard", path: "/dashboard", icon: "bi-grid-fill" },

    { label: "My Tasks", path: "/tasks", icon: "bi-check2-square" },

    { label: "Reminders", path: "/reminders", icon: "bi-alarm-fill" },

    { label: "Rescheduled", path: "/rescheduled", icon: "bi-arrow-repeat" },

    { label: "Insights", path: "/insights", icon: "bi-graph-up-arrow" },

  ];

  const goTo = (path) => {

    navigate(path);

    setSidebarOpen(false);

  };

  // Keep the latest request only, including React StrictMode remounts.

  const requestId = useRef(0);

  const fetchInsights = useCallback(async () => {

    const id = ++requestId.current;

    setLoading(true);

    setError("");

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getTasksWithRetry = async () => {

      for (let attempt = 0; attempt < 3; attempt++) {

        try {

          return await api.get("/tasks", { timeout: 12000 });

        } catch (err) {

          const status = err?.response?.status;

          // Retry only temporary network/server failures, never login errors.

          if ((status && status < 500 && status !== 429) || attempt === 2) throw err;

          await wait(700 * (attempt + 1));

        }

      }

    };

    try {

      const tasksResponse = await getTasksWithRetry();

      if (id !== requestId.current) return;

      const payload = tasksResponse.data;

      setTasks(Array.isArray(payload) ? payload : Array.isArray(payload?.tasks) ? payload.tasks : []);

      // Smart insight is optional: it must not block task analytics.

      try {

        const insightResponse = await api.get("/smart/insight", { timeout: 10000 });

        if (id === requestId.current) {

          setSmartInsight(insightResponse.data?.insight ?? null);

        }

      } catch (insightError) {

        console.warn("Optional smart insight unavailable:", insightError);

        if (id === requestId.current) setSmartInsight(null);

      }

    } catch (err) {

      if (id !== requestId.current) return;

      console.error("Insights tasks request failed:", err);

      const status = err?.response?.status;

      setError(

        status === 401 || status === 403

          ? "Your session is not authorized. Please log in again."

          : status === 404

            ? "Tasks API route not found. Check /api/tasks on your backend."

            : "Unable to load tasks. Check that the backend is running, then retry."

      );

    } finally {

      if (id === requestId.current) setLoading(false);

    }

  }, []);

  useEffect(() => {

    fetchInsights();

    const onFocus = () => {

      if (document.visibilityState === "visible") fetchInsights();

    };

    const onVisible = () => {

      if (document.visibilityState === "visible") fetchInsights();

    };

    window.addEventListener("focus", onFocus);

    document.addEventListener("visibilitychange", onVisible);

    return () => {

      requestId.current += 1;

      window.removeEventListener("focus", onFocus);

      document.removeEventListener("visibilitychange", onVisible);

    };

  }, [fetchInsights]);

  const stats = useMemo(() => {

    const total = tasks.length;

    const completed = tasks.filter(

      (task) => task.status === "completed"

    ).length;

    const pending = total - completed;

    const rescheduled = tasks.filter(

      (task) =>

        task.carriedForward === true ||

        Number(task.missedCount || 0) > 0

    ).length;

    const totalMisses = tasks.reduce(

      (sum, task) => sum + Math.max(0, Number(task.missedCount) || 0),

      0

    );

    const completionRate = total

      ? Math.round((completed / total) * 100)

      : 0;

    return {

      total,

      completed,

      pending,

      rescheduled,

      totalMisses,

      completionRate,

    };

  }, [tasks]);

  const priorityData = useMemo(() => {

    const counts = { high: 0, medium: 0, low: 0 };

    tasks.forEach((task) => {

      const priority = String(task.priority || "medium").toLowerCase();

      if (priority in counts) {

        counts[priority]++;

      } else {

        counts.medium++;

      }

    });

    return [

      { label: "High", value: counts.high, className: "high" },

      { label: "Medium", value: counts.medium, className: "medium" },

      { label: "Low", value: counts.low, className: "low" },

    ];

  }, [tasks]);

  // A completion streak must use the actual completion timestamp, not the due date.

  // Tasks without a completion timestamp still count in overall stats, not the heatmap.

  const activity = useMemo(() => {

    const dateKey = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

    const today = new Date();

    today.setHours(12, 0, 0, 0);

    const counts = new Map();

    let undatedCompleted = 0;

    tasks.filter((task) => task.status === "completed").forEach((task) => {

      const raw = task.completedAt ?? task.completed_at ?? task.completionDate ?? task.completed_date;

      if (!raw) { undatedCompleted++; return; }

      const date = new Date(raw);

      if (Number.isNaN(date.getTime())) { undatedCompleted++; return; }

      const key = dateKey(date);

      counts.set(key, (counts.get(key) || 0) + 1);

    });

    const days = Array.from({ length: 364 }, (_, index) => {

      const date = new Date(today);

      date.setDate(today.getDate() - (363 - index));

      const key = dateKey(date);

      return { key, date, count: counts.get(key) || 0 };

    });

    const active = (date) => counts.has(dateKey(date));

    const yesterday = new Date(today);

    yesterday.setDate(today.getDate() - 1);

    const cursor = new Date(active(today) ? today : yesterday);

    let currentStreak = 0;

    while (active(cursor)) { currentStreak++; cursor.setDate(cursor.getDate() - 1); }

    let longestStreak = 0;

    let run = 0;

    days.forEach((day) => { run = day.count ? run + 1 : 0; longestStreak = Math.max(longestStreak, run); });

    return {

      days, currentStreak, longestStreak,

      activeDays: days.filter((day) => day.count > 0).length,

      completedInYear: days.reduce((sum, day) => sum + day.count, 0),

      undatedCompleted,

      hasTimestamps: counts.size > 0,

    };

  }, [tasks]);



  // Align calendar columns to Monday-Sunday; never count future dates as activity.

  const calendarWeeks = useMemo(() => {

    const byDate = new Map(activity.days.map((day) => [day.key, day]));

    const now = new Date();

    now.setHours(12, 0, 0, 0);

    const currentMonday = new Date(now);

    currentMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    const start = new Date(currentMonday);

    start.setDate(start.getDate() - (activityRange - 1) * 7);

    return Array.from({ length: activityRange }, (_, weekIndex) =>

      Array.from({ length: 7 }, (_, weekday) => {

        const date = new Date(start);

        date.setDate(start.getDate() + weekIndex * 7 + weekday);

        const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

        return { key, date, count: byDate.get(key)?.count ?? 0, future: date > now };

      })

    );

  }, [activity.days, activityRange]);

  const visibleActivity = useMemo(() => calendarWeeks.flat().filter((day) => !day.future), [calendarWeeks]);



  const recommendations = useMemo(() => {

    const items = [];

    if (stats.total === 0) {

      items.push({

        icon: "bi-plus-circle",

        title: "Start your productivity journey",

        description:

          "Create your first task to unlock personalized productivity analysis.",

      });

      return items;

    }

    if (stats.completionRate < 50) {

      items.push({

        icon: "bi-bullseye",

        title: "Focus on smaller goals",

        description:

          "Your completion rate is below 50%. Break larger tasks into achievable steps.",

      });

    } else {

      items.push({

        icon: "bi-trophy",

        title: "Keep your momentum",

        description:

          "You're making progress. Continue completing tasks consistently.",

      });

    }

    if (stats.totalMisses > 0) {

      items.push({

        icon: "bi-clock-history",

        title: "Review missed deadlines",

        description:

          "Some tasks have been missed. Try scheduling difficult work earlier in the day.",

      });

    }

    if (priorityData[0].value > 0) {

      items.push({

        icon: "bi-lightning-charge",

        title: "Prioritize important work",

        description:

          "Review high-priority tasks first to avoid unnecessary carry-forward.",

      });

    }

    return items;

  }, [stats, priorityData]);

  const insightText = (() => {

    if (typeof smartInsight === "string") return smartInsight;

    if (smartInsight && typeof smartInsight === "object") {

      return (

        smartInsight.message ||

        smartInsight.summary ||

        smartInsight.insight ||

        smartInsight.text ||

        null

      );

    }

    return null;

  })();

  const radius = 67;

  const circumference = 2 * Math.PI * radius;

  const progressOffset =

    circumference * (1 - stats.completionRate / 100);

  return (

    <div className="dashboard-shell">

      {sidebarOpen && (

        <div

          className="sidebar-overlay"

          onClick={() => setSidebarOpen(false)}

        />

      )}

      <aside

        className={`dashboard-sidebar ${

          sidebarOpen ? "sidebar-open" : ""

        }`}

      >

        <div className="sidebar-top">

          <div className="dashboard-brand">

            <div className="dashboard-brand-icon">

              <i className="bi bi-bell-fill" />

            </div>

            <div>

              <strong>TaskWake</strong>

              <span>AI</span>

            </div>

          </div>

          <button

            className="sidebar-close"

            type="button"

            onClick={() => setSidebarOpen(false)}

            aria-label="Close sidebar"

          >

            <i className="bi bi-x-lg" />

          </button>

        </div>

        <nav className="sidebar-nav">

          {navItems.map((item) => (

            <button

              key={item.path}

              type="button"

              className={`nav-item ${

                location.pathname === item.path ? "active" : ""

              }`}

              onClick={() => goTo(item.path)}

            >

              <i className={`bi ${item.icon}`} />

              <span>{item.label}</span>

            </button>

          ))}

        </nav>

        <div className="sidebar-card">

          <div className="sidebar-card-icon">

            <i className="bi bi-stars" />

          </div>

          <h4>Know your progress</h4>

          <p>

            Turn your task activity into practical productivity insights.

          </p>

        </div>

        <div className="sidebar-bottom">

          <button

            type="button"

            className="nav-item"

            onClick={() => goTo("/settings")}

          >

            <i className="bi bi-gear-fill" />

            <span>Settings</span>

          </button>

          <button

            type="button"

            className="nav-item logout-item"

            onClick={logout}

          >

            <i className="bi bi-box-arrow-right" />

            <span>Logout</span>

          </button>

        </div>

      </aside>

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div className="dashboard-header-left">

            <button

              type="button"

              className="menu-toggle"

              onClick={() => setSidebarOpen(true)}

              aria-label="Open menu"

            >

              <i className="bi bi-list" />

            </button>

            <div>

              <p className="dashboard-label">Productivity Intelligence</p>

              <h1>Smart Insights</h1>

            </div>

          </div>

          <div className="dashboard-header-actions">

            <button

              type="button"

              className="header-icon-button"

              title="Refresh insights"

              onClick={fetchInsights}

            >

              <i className="bi bi-arrow-clockwise" />

            </button>

            <div className="profile-chip">

              <div className="profile-avatar">

                {user?.name?.charAt(0)?.toUpperCase() || "U"}

              </div>

              <div className="profile-text">

                <strong>{user?.name || "User"}</strong>

                <span>{user?.email || ""}</span>

              </div>

              <i className="bi bi-chevron-down" />

            </div>

          </div>

        </header>

        <section className="dashboard-content insights-page">

          <motion.section

            className="insights-hero"

            initial={{ opacity: 0, y: 18 }}

            animate={{ opacity: 1, y: 0 }}

          >

            <div className="insights-hero-copy">

              <span className="insights-eyebrow">

                <i className="bi bi-stars" />

                PRODUCTIVITY ANALYTICS

              </span>

              <h2>Understand your work. Improve every day.</h2>

              <p>

                Discover task patterns, monitor completion rates

                and make better scheduling decisions.

              </p>

              <button

                type="button"

                onClick={fetchInsights}

                className="insights-refresh-button"

              >

                <i className="bi bi-arrow-clockwise" />

                Refresh Analysis

              </button>

            </div>

          <div className="insights-hero-illustration">
  <img
    src="/images/insights.gif"
    alt="Animated productivity analytics"
    className="insights-hero-gif"
    loading="eager"
  />
</div>

          </motion.section>

          {error && (

            <div className="insights-error">

              <i className="bi bi-exclamation-triangle" />

              {error}

            </div>

          )}

          {loading ? (

            <div className="insights-loading">

              <i className="bi bi-arrow-repeat" />

              <p>Analyzing your productivity...</p>

            </div>

          ) : (

            <>

              <section className="insights-stats">

                {[

                  {

                    label: "Total Tasks",

                    value: stats.total,

                    icon: "bi-list-task",

                    theme: "purple",

                  },

                  {

                    label: "Completed",

                    value: stats.completed,

                    icon: "bi-check-circle-fill",

                    theme: "green",

                  },

                  {

                    label: "Pending",

                    value: stats.pending,

                    icon: "bi-hourglass-split",

                    theme: "orange",

                  },

                  {

                    label: "Carried Forward",

                    value: stats.rescheduled,

                    icon: "bi-arrow-repeat",

                    theme: "blue",

                  },

                ].map((item) => (

                  <div className="insights-stat-card" key={item.label}>

                    <div className={`insights-stat-icon ${item.theme}`}>

                      <i className={`bi ${item.icon}`} />

                    </div>

                    <div>

                      <strong>{item.value}</strong>

                      <span>{item.label}</span>

                    </div>

                  </div>

                ))}

              </section>

              <section className="insights-chart-grid">

                <div className="insights-panel">

                  <div className="insights-panel-heading">

                    <div>

                      <span>OVERALL PERFORMANCE</span>

                      <h3>Task Completion</h3>

                    </div>

                    <i className="bi bi-pie-chart" />

                  </div>

                  <div className="insights-donut-wrap">

                    <div className="insights-donut">

                      <svg viewBox="0 0 170 170" aria-hidden="true">
                        <defs><linearGradient id="twCompletionGradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#1d4ed8" /><stop offset="100%" stopColor="#60a5fa" /></linearGradient></defs>

                        <circle

                          cx="85"

                          cy="85"

                          r={radius}

                          fill="none"

                          stroke="#eaf2ff"

                          strokeWidth="15"

                        />

                        <circle

                          cx="85"

                          cy="85"

                          r={radius}

                          fill="none"

                          stroke="url(#twCompletionGradient)"

                          strokeWidth="15"

                          strokeLinecap="round"

                          strokeDasharray={circumference}

                          strokeDashoffset={progressOffset}

                          transform="rotate(-90 85 85)"

                        />

                      </svg>

                      <div className="insights-donut-center">

                        <strong>{stats.completionRate}%</strong>

                        <span>Completed</span>

                      </div>

                    </div>

                    <div className="insights-donut-summary">

                      <h4>Your overall progress</h4>

                      <p>

                        {stats.completed} out of {stats.total} tasks

                        completed.

                      </p>

                      <div>

                        <span>

                          <i className="bi bi-circle-fill completed-dot" />

                          Completed

                        </span>

                        <strong>{stats.completed}</strong>

                      </div>

                      <div>

                        <span>

                          <i className="bi bi-circle-fill pending-dot" />

                          Pending

                        </span>

                        <strong>{stats.pending}</strong>

                      </div>

                    </div>

                  </div>

                </div>

                                <div className="insights-panel tw-priority-panel">
                  <div className="insights-panel-heading">
                    <div>
                      <span>TASK DISTRIBUTION</span>
                      <h3>Priority Analytics</h3>
                    </div>
                    <div className="tw-priority-heading-icon"><i className="bi bi-bar-chart-fill" /></div>
                  </div>
                  <div className="tw-priority-topline">
                    <div><span className="tw-priority-overline">TASKS BY PRIORITY</span><strong>{stats.total}</strong><small>Total tasks</small></div>
                    <div className="tw-priority-pill"><i className="bi bi-activity" /> Live overview</div>
                  </div>
                  <div className="tw-priority-chart" role="img" aria-label={`Task priorities: ${priorityData.map(item => `${item.label} ${item.value}`).join(', ')}`}>
                    {priorityData.map((item, index) => {
                      const percent = stats.total ? Math.round((item.value / stats.total) * 100) : 0;
                      const height = stats.total ? Math.max(8, percent) : 5;
                      return (
                        <div className="tw-priority-column" key={item.label}>
                          <div className="tw-priority-count"><strong>{item.value}</strong><span>{percent}%</span></div>
                          <div className="tw-priority-bar-area">
                            <div className={`tw-priority-bar tw-priority-bar-${index + 1}${item.value === 0 ? ' is-empty' : ''}`} style={{ height: `${height}%` }}>
                              {item.value > 0 && <span className="tw-priority-bar-glow" />}
                            </div>
                          </div>
                          <div className="tw-priority-category"><span className={`tw-priority-category-dot dot-${index + 1}`} />{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="tw-priority-footnote"><i className="bi bi-info-circle" /> Distribution based on your existing tasks</div>
                </div>
              </section>

                <section className="insights-panel tw-activity-panel">

                  <div className="tw-learning-header">

                    <div className="tw-learning-title"><span className="tw-learning-icon"><i className="bi bi-bar-chart-line-fill" /></span><div><h3>Learning Streaks</h3><p>Your daily progress over time</p></div></div>

                    <div className="tw-learning-controls">

                      <label htmlFor="tw-activity-range">View</label>

                      <select id="tw-activity-range" value={activityRange} onChange={(e) => setActivityRange(Number(e.target.value))}>

                        <option value={52}>Last 12 months</option><option value={26}>Last 6 months</option><option value={13}>Last 3 months</option>

                      </select>

                    </div>

                  </div>

                  <div className="tw-streak-summary">

                    <div><span><i className="bi bi-fire" /> Current streak</span><strong>{activity.currentStreak} <small>days</small></strong></div>

                    <div><span><i className="bi bi-trophy-fill" /> Longest streak</span><strong>{activity.longestStreak} <small>days</small></strong></div>

                    <div><span><i className="bi bi-calendar-check" /> Active days</span><strong>{visibleActivity.filter(day => day.count > 0).length} <small>days</small></strong></div>

                    <div><span><i className="bi bi-check-circle-fill" /> Completed tasks</span><strong>{visibleActivity.reduce((sum, day) => sum + day.count, 0)}</strong></div>

                  </div>

                  <div className="tw-calendar-shell">

                    <div className="tw-calendar-labels"><span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span></div>

                    <div className="tw-calendar-content">

                      <div className="tw-month-row">

                        {calendarWeeks.map((week, index) => {

                          const month = week[0].date.getMonth();

                          const previousMonth = index ? calendarWeeks[index - 1][0].date.getMonth() : -1;

                          return <span key={week[0].key}>{index === 0 || month !== previousMonth ? week[0].date.toLocaleDateString("en-US", { month: "short" }) : ""}</span>;

                        })}

                      </div>

                      <div className="tw-heatmap-scroll" role="region" aria-label="Task completion activity calendar" tabIndex={0}>

                        <div className="tw-heatmap-grid">

                          {calendarWeeks.map((week) => (

                            <div className="tw-heatmap-week" key={week[0].key}>

                              {week.map((day) => {

                                const level = day.count === 0 ? 0 : day.count === 1 ? 2 : day.count <= 3 ? 3 : 4;

                                const label = `${day.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}: ${day.count} completed ${day.count === 1 ? "task" : "tasks"}`;

                                return <div key={day.key} className={`tw-heat-cell level-${level}${day.future ? " tw-heat-future" : ""}`} title={day.future ? "Future date" : label} aria-label={day.future ? "Future date" : label} data-count={day.count} />;

                              })}

                            </div>

                          ))}

                        </div>

                      </div>

                    </div>

                  </div>

                  <div className="tw-heatmap-footer">

                    <span>{activityRange} weeks of activity</span>

                    <div className="tw-heat-legend"><span>Less</span>{[0,1,2,3,4].map(level => <i key={level} className={`tw-heat-cell level-${level}`} />)}<span>More</span><span className="tw-legend-caption">Activity Intensity</span></div>

                  </div>

                  {activity.undatedCompleted > 0 && (

                    <p className="tw-activity-note">

                      <i className="bi bi-info-circle" /> {activity.undatedCompleted} completed {activity.undatedCompleted === 1 ? "task has" : "tasks have"} no recorded completion date, so {activity.undatedCompleted === 1 ? "it is" : "they are"} excluded from this calendar and streaks.

                    </p>

                  )}

                  {!activity.hasTimestamps && (

                    <p className="tw-activity-note">To show accurate streaks, your backend needs to save <code>completedAt</code> when a task is completed.</p>

                  )}

                </section>



              <section className="insights-bottom-grid">

                <div className="insights-panel">

                  <div className="insights-panel-heading">

                    <div>

                      <span>PERSONALIZED GUIDANCE</span>

                      <h3>Smart Recommendations</h3>

                    </div>

                    <i className="bi bi-lightbulb" />

                  </div>

                  <div className="insights-recommendations">

                    {recommendations.map((item) => (

                      <div

                        className="insights-recommendation"

                        key={item.title}

                      >

                        <div>

                          <i className={`bi ${item.icon}`} />

                        </div>

                        <section>

                          <h4>{item.title}</h4>

                          <p>{item.description}</p>

                        </section>

                      </div>

                    ))}

                  </div>

                </div>

                <div className="insights-panel">

                  <div className="insights-panel-heading">

                    <div>

                      <span>BACKEND SMART ENGINE</span>

                      <h3>TaskWake AI Insight</h3>

                    </div>

                    <i className="bi bi-stars" />

                  </div>

                  <div className="insights-ai-card">

                    <div className="insights-ai-icon">

                      <i className="bi bi-stars" />

                    </div>

                    <h4>Your productivity assistant</h4>

                    <p>

                      {typeof insightText === "string"

                        ? insightText

                        : "No smart insight is available yet. Create and manage tasks to build your productivity profile."}

                    </p>

                    <div className="insights-ai-footer">

                      <i className="bi bi-check-circle" />

                      Based on available task data

                    </div>

                  </div>

                  <div className="insights-missed-summary">

                    <div>

                      <span>Total missed occurrences</span>

                      <strong>{stats.totalMisses}</strong>

                    </div>

                    <div>

                      <span>Carried-forward tasks</span>

                      <strong>{stats.rescheduled}</strong>

                    </div>

                  </div>

                </div>

              </section>

            </>

          )}

        </section>

      </main>

    </div>

  );

};

export default Insights;
