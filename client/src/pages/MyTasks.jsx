import { useCallback, useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import api from "../services/api";

import "./MyTasks.css";

import "./Sidebar.css";

const initialForm = { title: "", description: "", date: "", time: "", priority: "medium" };

const taskId = (task) => task.id ?? task._id;

const datePart = (value) => String(value || "").slice(0, 10);

const timePart = (value) => String(value || "").slice(0, 5);

const isCompleted = (task) => task.status === "completed";

const formatDate = (value) => {

  if (!value) return "No date";

  const date = new Date(`${datePart(value)}T12:00:00`);

  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

};

const formatTime = (value) => {

  if (!value) return "No time";

  const [hours, minutes] = String(value).split(":");

  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

};



export default function MyTasks() {

  const navigate = useNavigate();

  const location = useLocation();

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState(null);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("pending");
  const [historyOpen, setHistoryOpen] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState("all");

  const [sortBy, setSortBy] = useState("date");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");



  const fetchTasks = useCallback(async () => {

    try {

      setLoading(true);

      const { data } = await api.get("/tasks");

      setTasks(Array.isArray(data) ? data : Array.isArray(data?.tasks) ? data.tasks : []);

    } catch (err) {

      setError(err.response?.data?.message || "Unable to load tasks. Please check your backend connection.");

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => { fetchTasks(); }, [fetchTasks]);



  const filteredTasks = useMemo(() => tasks.filter((task) => {

    const query = search.trim().toLowerCase();

    const matchesSearch = String(task.title || "").toLowerCase().includes(query) || String(task.description || "").toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" ? !isCompleted(task) : statusFilter === "pending" ? !isCompleted(task) : isCompleted(task);

    const matchesPriority = priorityFilter === "all" || String(task.priority || "medium").toLowerCase() === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;

  }).sort((a, b) => {

    if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""));

    if (sortBy === "priority") {

      const ranks = { high: 0, medium: 1, low: 2 };

      return (ranks[String(a.priority || "medium").toLowerCase()] ?? 1) - (ranks[String(b.priority || "medium").toLowerCase()] ?? 1);

    }

    return `${datePart(a.date) || "9999-12-31"}T${a.time || "23:59"}`.localeCompare(`${datePart(b.date) || "9999-12-31"}T${b.time || "23:59"}`);

  }), [tasks, search, statusFilter, priorityFilter, sortBy]);



  const completedHistory = useMemo(() => tasks.filter(isCompleted).sort((a, b) => `${datePart(b.completedAt || b.updatedAt || b.date)}T${timePart(b.time)}`.localeCompare(`${datePart(a.completedAt || a.updatedAt || a.date)}T${timePart(a.time)}`)), [tasks]);

  const stats = useMemo(() => ({

    total: tasks.length,

    completed: tasks.filter(isCompleted).length,

    pending: tasks.filter((task) => !isCompleted(task)).length,

    rescheduled: tasks.filter((task) => task.carriedForward || Number(task.missedCount || 0) > 0).length,

  }), [tasks]);



  const openCreate = () => { setForm(initialForm); setEditingId(null); setError(""); setModalOpen(true); };

  const openEdit = (task) => {

    const id = taskId(task);

    if (id == null) { setError("Task ID is missing."); return; }

    setEditingId(id);

    setForm({ title: task.title || "", description: task.description || "", date: datePart(task.date), time: timePart(task.time), priority: String(task.priority || "medium").toLowerCase() });

    setError("");

    setModalOpen(true);

  };

  const changeForm = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));



  const saveTask = async (event) => {

    event.preventDefault();

    if (!form.title.trim() || !form.date || !form.time) { setError("Title, date and time are required."); return; }

    try {

      setSaving(true); setError(""); setSuccess("");

      const payload = { title: form.title.trim(), description: form.description.trim(), date: form.date, time: form.time, priority: form.priority };

      if (editingId == null) await api.post("/tasks", payload);

      else await api.put(`/tasks/${editingId}`, payload);

      setModalOpen(false);

      setEditingId(null);

      setSuccess(editingId == null ? "Task created successfully." : "Task updated successfully.");

      await fetchTasks();

    } catch (err) {

      setError(err.response?.data?.message || "Could not save task. Verify your backend create/update API route.");

    } finally { setSaving(false); }

  };



  const completeTask = async (id) => {

    if (id == null) return;

    try {

      setBusyId(id); setError(""); setSuccess("");

      await api.patch(`/tasks/${id}/complete`);

      setSuccess("Task completed successfully.");

      await fetchTasks();

    } catch (err) { setError(err.response?.data?.message || "Could not complete task."); }

    finally { setBusyId(null); }

  };

  const deleteTask = async (task) => {

    const id = taskId(task);

    if (id == null || !window.confirm(`Delete "${task.title}"?`)) return;

    try {

      setBusyId(id); setError(""); setSuccess("");

      await api.delete(`/tasks/${id}`);

      setSuccess("Task deleted successfully.");

      await fetchTasks();

    } catch (err) { setError(err.response?.data?.message || "Could not delete task."); }

    finally { setBusyId(null); }

  };



  const navItems = [

    { label: "Dashboard", path: "/dashboard", icon: "bi-grid-fill" },

    { label: "My Tasks", path: "/tasks", icon: "bi-check2-square" },

    { label: "Reminders", path: "/reminders", icon: "bi-alarm-fill" },

    { label: "Rescheduled", path: "/rescheduled", icon: "bi-arrow-repeat" },

    { label: "Insights", path: "/insights", icon: "bi-graph-up-arrow" },

  ];



  return (

    <div className="dashboard-shell tw-my-tasks">

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>

        <div className="sidebar-top">

          <div className="dashboard-brand"><div className="dashboard-brand-icon"><i className="bi bi-bell-fill" /></div><div><strong>TaskWake</strong><span>AI</span></div></div>

          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} type="button" aria-label="Close sidebar"><i className="bi bi-x-lg" /></button>

        </div>

        <nav className="sidebar-nav">

          {navItems.map((item) => <button key={item.path} className={`nav-item ${location.pathname === item.path ? "active" : ""}`} type="button" onClick={() => { navigate(item.path); setSidebarOpen(false); }}><i className={`bi ${item.icon}`} /><span>{item.label}</span></button>)}

        </nav>

        <div className="sidebar-card"><div className="sidebar-card-icon"><i className="bi bi-stars" /></div><h4>Smart Task Manager</h4><p>Search, filter and manage all your tasks from one place.</p></div>

        <div className="sidebar-bottom">

          <button className="nav-item" type="button" onClick={() => navigate("/settings")}><i className="bi bi-gear-fill" /><span>Settings</span></button>

          <button className="nav-item logout-item" type="button" onClick={() => { logout(); navigate("/login", { replace: true }); }}><i className="bi bi-box-arrow-right" /><span>Logout</span></button>

        </div>

      </aside>

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div className="dashboard-header-left"><button className="menu-toggle" onClick={() => setSidebarOpen(true)} type="button" aria-label="Open sidebar"><i className="bi bi-list" /></button><div><p className="dashboard-label">Task Management</p><h1>My Tasks</h1></div></div>

          <div className="dashboard-header-actions"><div className="profile-chip"><div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div><div className="profile-text"><strong>{user?.name || "User"}</strong><span>{user?.email || ""}</span></div><i className="bi bi-chevron-down" /></div></div>

        </header>

        <section className="dashboard-content">

          <motion.div className="tasks-page-hero" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>

            <div><span><i className="bi bi-check2-square" /> Task Manager</span><h2>Stay focused on<br />what matters.</h2><p>Keep track of your active tasks. View finished work in Previous Completed.</p></div>

            <div className="tasks-page-count"><i className="bi bi-list-check" /><div><strong>{stats.total}</strong><span>Total Tasks</span></div></div>

          </motion.div>

          <div className="tw-task-controls">

            <div className="tw-task-stats">

              <button type="button" className="tw-history-trigger" onClick={() => setHistoryOpen(true)}><i className="bi bi-clock-history" /> <strong>{stats.completed}</strong> Previous Completed</button><span><strong>{stats.pending}</strong> Pending</span><span><strong>{stats.rescheduled}</strong> Rescheduled</span>

            </div>

            <button className="tw-task-add" type="button" onClick={openCreate}><i className="bi bi-plus-lg" /> Add New Task</button>

          </div>

          <div className="task-filter-bar">

            <div className="task-search"><i className="bi bi-search" /><input type="search" placeholder="Search tasks..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>

            <select aria-label="Filter status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="pending">Pending Tasks</option><option value="completed">Completed Tasks</option></select>

            <select aria-label="Filter priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>

            <select aria-label="Sort tasks" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="date">Due Date</option><option value="priority">Priority</option><option value="title">Title A-Z</option></select>

            <button className="tw-task-refresh" type="button" onClick={() => { setError(""); fetchTasks(); }} title="Refresh tasks"><i className="bi bi-arrow-clockwise" /></button>

          </div>

          {success && <div className="tw-task-notice success" role="status">{success}</div>}

          {error && !modalOpen && <div className="tw-task-notice error" role="alert">{error}</div>}

          <div className="all-tasks-panel">

            {loading ? <div className="task-loading"><div className="spinner-border" /><span>Loading tasks...</span></div> : filteredTasks.length === 0 ? <div className="empty-tasks"><div className="empty-task-icon"><i className="bi bi-search" /></div><h4>No tasks found</h4><p>{tasks.length ? "No tasks match your filters. Check Previous Completed for finished work." : "Create your first task to get started."}</p><button className="tw-task-add" type="button" onClick={openCreate}>Create Task</button></div> :

              <div className="all-task-list">{filteredTasks.map((task, index) => {

                const id = taskId(task);

                const completed = isCompleted(task);

                return <motion.div className={`all-task-card ${completed ? "completed" : ""}`} key={id ?? index} initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}>

                  <div className="all-task-status"><button type="button" className={`task-checkbox ${completed ? "checked" : ""}`} disabled={completed || busyId === id || id == null} onClick={() => completeTask(id)} aria-label={completed ? "Completed" : "Complete task"}><i className="bi bi-check-lg" /></button></div>

                  <div className="all-task-content"><div className="all-task-title"><h3>{task.title}</h3>{task.carriedForward && <span className="carried-badge"><i className="bi bi-arrow-repeat" /> Carried</span>}</div>{task.description && <p>{task.description}</p>}<div className="all-task-meta"><span><i className="bi bi-calendar3" /> {formatDate(task.date)}</span><span><i className="bi bi-clock-fill" /> {formatTime(task.time)}</span><span className={`priority-chip ${String(task.priority || "medium").toLowerCase()}`}>{task.priority || "medium"}</span>{Number(task.missedCount || 0) > 0 && <span className="missed-count"><i className="bi bi-exclamation-circle-fill" /> Missed {task.missedCount}</span>}</div></div>

                  <div className="all-task-actions"><button type="button" title="Edit task" disabled={busyId === id || id == null} onClick={() => openEdit(task)}><i className="bi bi-pencil-square" /></button><button type="button" title="Delete task" disabled={busyId === id || id == null} onClick={() => deleteTask(task)}><i className="bi bi-trash3" /></button></div>

                </motion.div>;

              })}</div>}

          </div>

        </section>

      </main>
        {historyOpen && <div className="tw-task-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}>
          <div className="tw-task-modal tw-history-modal" role="dialog" aria-modal="true" aria-labelledby="tw-history-title">
            <div className="tw-task-modal-head"><div><small>TASK HISTORY</small><h2 id="tw-history-title">Previous Completed</h2><p className="tw-history-subtitle">Your finished tasks are saved here.</p></div><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close completed history"><i className="bi bi-x-lg" /></button></div>
            <div className="tw-history-list">
              {completedHistory.length === 0 ? <div className="tw-history-empty"><i className="bi bi-check2-circle" /><h3>No completed tasks yet</h3><p>Tasks you finish will appear here.</p></div> : completedHistory.map((task, index) => <div className="tw-history-item" key={taskId(task) ?? index}><div className="tw-history-check"><i className="bi bi-check-lg" /></div><div className="tw-history-details"><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}<span><i className="bi bi-calendar3" /> {formatDate(task.date)} &nbsp; <i className="bi bi-clock" /> {formatTime(task.time)}</span></div></div>)}
            </div>
            <div className="tw-history-footer"><span>{completedHistory.length} completed task{completedHistory.length === 1 ? "" : "s"}</span><button type="button" className="tw-task-add" onClick={() => setHistoryOpen(false)}>Done</button></div>
          </div>
        </div>}


      {modalOpen && <div className="tw-task-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>

        <div className="tw-task-modal" role="dialog" aria-modal="true" aria-labelledby="tw-modal-title">

          <div className="tw-task-modal-head"><div><small>TASKWAKE AI</small><h2 id="tw-modal-title">{editingId == null ? "Add New Task" : "Edit Task"}</h2></div><button type="button" onClick={() => setModalOpen(false)} disabled={saving} aria-label="Close"><i className="bi bi-x-lg" /></button></div>

          <form onSubmit={saveTask}>

            <label>Task Title *<input name="title" value={form.title} onChange={changeForm} required maxLength={150} placeholder="What do you need to do?" /></label>

            <label>Description<textarea name="description" value={form.description} onChange={changeForm} rows={3} placeholder="Add more details..." /></label>

            <div className="tw-task-modal-grid"><label>Due Date *<input type="date" name="date" value={form.date} onChange={changeForm} required /></label><label>Reminder Time *<input type="time" name="time" value={form.time} onChange={changeForm} required /></label></div>

            <label>Priority<select name="priority" value={form.priority} onChange={changeForm}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>

            {error && <div className="tw-task-notice error" role="alert">{error}</div>}

            <div className="tw-task-modal-buttons"><button type="button" className="tw-task-cancel" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="tw-task-add" disabled={saving}>{saving ? "Saving..." : editingId == null ? "Create Task" : "Save Changes"}</button></div>

          </form>

        </div>

</div>}

    </div>

  );

}
