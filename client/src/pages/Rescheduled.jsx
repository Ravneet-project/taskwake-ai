
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./sidebar.css";
const Rescheduled = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");

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

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/tasks");
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      console.error("Rescheduled fetch error:", err);
      setError("Unable to load rescheduled tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getMissedCount = (task) => {
    return Math.max(0, Number(task.missedCount) || 0);
  };

  const rescheduledTasks = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          task.carriedForward === true ||
          getMissedCount(task) > 0
      )
      .sort((a, b) => {
        const aDate = `${a.date || ""}T${a.time || "00:00"}`;
        const bDate = `${b.date || ""}T${b.time || "00:00"}`;
        return aDate.localeCompare(bDate);
      });
  }, [tasks]);

  const pendingTasks = rescheduledTasks.filter(
    (task) => task.status !== "completed"
  );

  const completedTasks = rescheduledTasks.filter(
    (task) => task.status === "completed"
  );

  const repeatedTasks = pendingTasks.filter(
    (task) => getMissedCount(task) >= 2
  );

  const highPriorityTasks = pendingTasks.filter(
    (task) => String(task.priority).toLowerCase() === "high"
  );

  const visibleTasks = rescheduledTasks.filter((task) => {
    if (filter === "pending") return task.status !== "completed";
    if (filter === "completed") return task.status === "completed";
    if (filter === "repeated") return getMissedCount(task) >= 2;
    return true;
  });

  const formatDate = (date) => {
    if (!date) return "Not scheduled";

    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "Time not set";

    const [hours, minutes] = time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return time;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getSuggestedPriority = (task) => {
    const missed = getMissedCount(task);
    const priority = String(task.priority || "medium").toLowerCase();

    if (missed >= 3) return "high";
    if (missed >= 2 && priority === "low") return "medium";
    return priority;
  };

  const getInsight = (task) => {
    const missed = getMissedCount(task);

    if (missed >= 3) {
      return "Repeatedly missed. Consider breaking this task into smaller steps.";
    }

    if (missed >= 2) {
      return "Missed multiple times. Try assigning a more realistic time.";
    }

    return "Carried forward once. Review your schedule to avoid another delay.";
  };

  const completeTask = async (id) => {
    try {
      setBusyId(id);
      setError("");

      await api.patch(`/tasks/${id}/complete`);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      setError("Unable to complete the task.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this rescheduled task permanently?")) {
      return;
    }

    try {
      setBusyId(id);
      setError("");

      await api.delete(`/tasks/${id}`);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      setError("Unable to delete the task.");
    } finally {
      setBusyId(null);
    }
  };

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
            <i className="bi bi-arrow-repeat" />
          </div>
          <h4>Keep moving forward</h4>
          <p>
            Missed a deadline? Track carried-forward work and
            get back on schedule.
          </p>
        </div>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            type="button"
            onClick={() => goTo("/settings")}
          >
            <i className="bi bi-gear-fill" />
            <span>Settings</span>
          </button>

          <button
            className="nav-item logout-item"
            type="button"
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
              className="menu-toggle"
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <i className="bi bi-list" />
            </button>

            <div>
              <p className="dashboard-label">Task Recovery Center</p>
              <h1>Rescheduled Tasks</h1>
            </div>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="header-icon-button"
              type="button"
              onClick={fetchTasks}
              title="Refresh tasks"
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

        <section className="dashboard-content rescheduled-page">
          <motion.section
            className="rescheduled-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="rescheduled-hero-content">
              <span className="rescheduled-eyebrow">
                <i className="bi bi-stars" />
                SMART TASK RECOVERY
              </span>

              <h2>Every missed task deserves a second chance.</h2>

              <p>
                See what was carried forward, identify repeated
                delays and stay focused on your next deadline.
              </p>

              <button
                type="button"
                onClick={() => goTo("/tasks")}
                className="rescheduled-hero-button"
              >
                <i className="bi bi-list-check" />
                View All Tasks
                <i className="bi bi-arrow-right" />
              </button>
            </div>

      
 <div className="rescheduled-hero-art">
  <img
    src="/images/task-recovery.gif"
    alt="Task Recovery Animation"
    className="rescheduled-recovery-gif"
    onError={(e) => {
      console.error("GIF failed to load:", e.currentTarget.src);
    }}
  />
</div>
          </motion.section>

          <div className="rescheduled-stats">
            {[
              {
                label: "Total Rescheduled",
                value: rescheduledTasks.length,
                icon: "bi-arrow-repeat",
                color: "purple",
              },
              {
                label: "Still Pending",
                value: pendingTasks.length,
                icon: "bi-hourglass-split",
                color: "orange",
              },
              {
                label: "Recovered",
                value: completedTasks.length,
                icon: "bi-check2-circle",
                color: "green",
              },
              {
                label: "Repeatedly Missed",
                value: repeatedTasks.length,
                icon: "bi-exclamation-circle",
                color: "red",
              },
            ].map((stat) => (
              <div className="rescheduled-stat-card" key={stat.label}>
                <div className={`rescheduled-stat-icon ${stat.color}`}>
                  <i className={`bi ${stat.icon}`} />
                </div>
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <section className="rescheduled-panel">
            <div className="rescheduled-panel-top">
              <div>
                <span className="rescheduled-section-label">
                  YOUR TASK HISTORY
                </span>
                <h3>Carry-forward Tracker</h3>
                <p>
                  Review tasks that have missed at least one
                  scheduled deadline.
                </p>
              </div>

              <button
                className="rescheduled-refresh"
                type="button"
                onClick={fetchTasks}
              >
                <i className="bi bi-arrow-clockwise" />
                Refresh
              </button>
            </div>

            <div className="rescheduled-filters">
              {[
                { id: "all", label: "All", count: rescheduledTasks.length },
                { id: "pending", label: "Pending", count: pendingTasks.length },
                {
                  id: "completed",
                  label: "Completed",
                  count: completedTasks.length,
                },
                {
                  id: "repeated",
                  label: "Repeated",
                  count: repeatedTasks.length,
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`rescheduled-filter ${
                    filter === item.id ? "active" : ""
                  }`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="rescheduled-error">
                <i className="bi bi-exclamation-triangle" />
                {error}
              </div>
            )}

            {loading ? (
              <div className="rescheduled-empty">
                <i className="bi bi-arrow-repeat rescheduled-spin" />
                <h4>Loading task history...</h4>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="rescheduled-empty">
                <div className="rescheduled-empty-icon">
                  <i className="bi bi-calendar2-check" />
                </div>
                <h4>No rescheduled tasks here</h4>
                <p>
                  Tasks carried forward by TaskWake will appear
                  here automatically.
                </p>
                <button type="button" onClick={() => goTo("/tasks")}>
                  Explore My Tasks
                </button>
              </div>
            ) : (
              <div className="rescheduled-task-list">
                {visibleTasks.map((task, index) => {
                  const missed = getMissedCount(task);
                  const suggested = getSuggestedPriority(task);
                  const actualPriority = String(
                    task.priority || "medium"
                  ).toLowerCase();
                  const completed = task.status === "completed";

                  return (
                    <motion.article
                      key={task.id}
                      className={`rescheduled-task-card ${
                        completed ? "is-completed" : ""
                      }`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    >
                      <div className="rescheduled-task-icon">
                        <i
                          className={`bi ${
                            completed
                              ? "bi-check-circle-fill"
                              : "bi-arrow-repeat"
                          }`}
                        />
                      </div>

                      <div className="rescheduled-task-info">
                        <div className="rescheduled-task-heading">
                          <h4>{task.title}</h4>

                          <span
                            className={`rescheduled-missed-badge ${
                              missed >= 3 ? "critical" : ""
                            }`}
                          >
                            <i className="bi bi-clock-history" />
                            {missed} {missed === 1 ? "miss" : "misses"}
                          </span>
                        </div>

                        {task.description && (
                          <p className="rescheduled-description">
                            {task.description}
                          </p>
                        )}

                        <div className="rescheduled-task-meta">
                          <span>
                            <i className="bi bi-calendar3" />
                            {formatDate(task.date)}
                          </span>

                          <span>
                            <i className="bi bi-clock" />
                            {formatTime(task.time)}
                          </span>

                          <span
                            className={`rescheduled-priority ${actualPriority}`}
                          >
                            <i className="bi bi-flag-fill" />
                            {actualPriority} priority
                          </span>

                          {completed && (
                            <span className="rescheduled-completed">
                              <i className="bi bi-check2-circle" />
                              Completed
                            </span>
                          )}
                        </div>

                        {!completed && (
                          <div className="rescheduled-ai-note">
                            <i className="bi bi-stars" />
                            <span>{getInsight(task)}</span>
                          </div>
                        )}

                        {!completed && suggested !== actualPriority && (
                          <div className="rescheduled-suggestion">
                            <i className="bi bi-lightning-charge-fill" />
                            Suggested priority:{" "}
                            <strong>{suggested.toUpperCase()}</strong>
                          </div>
                        )}
                      </div>

                      <div className="rescheduled-task-actions">
                        {!completed && (
                          <button
                            type="button"
                            className="rescheduled-done-btn"
                            disabled={busyId === task.id}
                            onClick={() => completeTask(task.id)}
                            title="Mark completed"
                          >
                            <i className="bi bi-check-lg" />
                          </button>
                        )}

                        <button
                          type="button"
                          className="rescheduled-delete-btn"
                          disabled={busyId === task.id}
                          onClick={() => deleteTask(task.id)}
                          title="Delete task"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>

          {highPriorityTasks.length > 0 && (
            <div className="rescheduled-bottom-tip">
              <i className="bi bi-lightbulb-fill" />
              <span>
                You have <strong>{highPriorityTasks.length}</strong>{" "}
                high-priority carried-forward{" "}
                {highPriorityTasks.length === 1 ? "task" : "tasks"}.
                Consider completing these first.
              </span>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Rescheduled;
