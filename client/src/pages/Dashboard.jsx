import {

  useEffect,

  useMemo,

  useState,

} from "react";



import {

  motion,

  AnimatePresence,

} from "framer-motion";



import {

  useNavigate,

} from "react-router-dom";



import { useAuth } from "../context/AuthContext";

import api from "../services/api";



import {

  requestNotificationPermission,

  shouldNotifyTask,

  showTaskNotification,

} from "../services/reminderService";



import InstallPWA from "../components/InstallPWA";
import "./DashboardEdu.css";
import "./Sidebar.css";



const Dashboard = () => {

  const { user, logout } = useAuth();



  /*

  |--------------------------------------------------------------------------

  | ROUTER

  |--------------------------------------------------------------------------

  */



  const navigate = useNavigate();



  /*

  |--------------------------------------------------------------------------

  | STATES

  |--------------------------------------------------------------------------

  */



  const [sidebarOpen, setSidebarOpen] =

    useState(false);



  const [tasks, setTasks] =

    useState([]);



  const [loadingTasks, setLoadingTasks] =

    useState(true);



  const [taskModalOpen, setTaskModalOpen] =

    useState(false);



  const [savingTask, setSavingTask] =

    useState(false);



  const [taskError, setTaskError] =

    useState("");



  /*

  |--------------------------------------------------------------------------

  | SMART PRODUCTIVITY INSIGHT

  |--------------------------------------------------------------------------

  */



  const [smartInsight, setSmartInsight] =

    useState(null);



  /*

  |--------------------------------------------------------------------------

  | NOTIFICATION PERMISSION

  |--------------------------------------------------------------------------

  */



  const [

    notificationPermission,

    setNotificationPermission,

  ] = useState(() => {

    if (

      typeof window !== "undefined" &&

      "Notification" in window

    ) {

      return Notification.permission;

    }



    return "unsupported";

  });



  /*

  |--------------------------------------------------------------------------

  | TASK FORM

  |--------------------------------------------------------------------------

  */



  const [form, setForm] = useState({

    title: "",

    description: "",

    date: "",

    time: "",

    priority: "medium",

  });



  /*

  |--------------------------------------------------------------------------

  | SIDEBAR NAVIGATION

  |--------------------------------------------------------------------------

  */



  const goTo = (path) => {

    navigate(path);



    setSidebarOpen(false);

  };



  /*

  |--------------------------------------------------------------------------

  | LOCAL DATE HELPER

  |--------------------------------------------------------------------------

  */



  const getLocalDateString = (

    date = new Date()

  ) => {

    const year = date.getFullYear();



    const month = String(

      date.getMonth() + 1

    ).padStart(2, "0");



    const day = String(

      date.getDate()

    ).padStart(2, "0");



    return `${year}-${month}-${day}`;

  };



  /*

  |--------------------------------------------------------------------------

  | FETCH TASKS

  |--------------------------------------------------------------------------

  */



  const fetchTasks = async () => {

    try {

      setLoadingTasks(true);



      const { data } =

        await api.get("/tasks");



      setTasks(

        data.tasks || []

      );

    } catch (error) {

      console.error(

        "Fetch Tasks Error:",

        error

      );

    } finally {

      setLoadingTasks(false);

    }

  };



  /*

  |--------------------------------------------------------------------------

  | FETCH SMART INSIGHT

  |--------------------------------------------------------------------------

  */



  const fetchSmartInsight = async () => {

    try {

      const { data } =

        await api.get(

          "/smart/insight"

        );



      setSmartInsight(

        data.insight || null

      );

    } catch (error) {

      console.error(

        "Smart Insight Error:",

        error

      );



      setSmartInsight(null);

    }

  };



  /*

  |--------------------------------------------------------------------------

  | AUTO RESCHEDULE

  |--------------------------------------------------------------------------

  */



  const runAutoReschedule = async () => {

    try {

      await api.post(

        "/tasks/auto-reschedule"

      );



      await fetchTasks();

    } catch (error) {

      console.error(

        "Auto Reschedule Error:",

        error

      );

    }

  };



  /*

  |--------------------------------------------------------------------------

  | INITIAL DASHBOARD LOAD

  |--------------------------------------------------------------------------

  */



  useEffect(() => {

    const loadDashboard =

      async () => {

        await runAutoReschedule();

      };



    loadDashboard();

  }, []);



  /*

  |--------------------------------------------------------------------------

  | REFRESH SMART INSIGHT WHEN TASK DATA CHANGES

  |--------------------------------------------------------------------------

  */



  useEffect(() => {

    if (!loadingTasks) {

      fetchSmartInsight();

    }

  }, [

    tasks,

    loadingTasks,

  ]);



  /*

  |--------------------------------------------------------------------------

  | ENABLE NOTIFICATIONS

  |--------------------------------------------------------------------------

  */



  const enableNotifications =

    async () => {

      try {

        const result =

          await requestNotificationPermission();



        setNotificationPermission(

          result.permission ||

            "unsupported"

        );

      } catch (error) {

        console.error(

          "Notification permission error:",

          error

        );

      }

    };



  /*

  |--------------------------------------------------------------------------

  | TASK ALARM / REMINDER WATCHER

  |--------------------------------------------------------------------------

  */



  useEffect(() => {

    if (!tasks.length) {

      return;

    }



    const checkReminders = () => {

      tasks.forEach(

        (task) => {

          if (

            shouldNotifyTask(task)

          ) {

            showTaskNotification(

              task

            );

          }

        }

      );

    };



    checkReminders();



    const interval =

      setInterval(

        checkReminders,

        10000

      );



    return () => {

      clearInterval(

        interval

      );

    };

  }, [tasks]);



  /*

  |--------------------------------------------------------------------------

  | FORM CHANGE

  |--------------------------------------------------------------------------

  */



  const handleChange = (e) => {

    setForm({

      ...form,



      [e.target.name]:

        e.target.value,

    });

  };



  /*

  |--------------------------------------------------------------------------

  | OPEN ADD TASK MODAL

  |--------------------------------------------------------------------------

  */



  const openAddTaskModal = () => {

    const formattedDate =

      getLocalDateString();



    setForm({

      title: "",

      description: "",

      date: formattedDate,

      time: "",

      priority: "medium",

    });



    setTaskError("");



    setTaskModalOpen(true);

  };



  /*

  |--------------------------------------------------------------------------

  | CLOSE ADD TASK MODAL

  |--------------------------------------------------------------------------

  */



  const closeTaskModal = () => {

    if (savingTask) {

      return;

    }



    setTaskModalOpen(false);



    setTaskError("");

  };



  /*

  |--------------------------------------------------------------------------

  | CREATE TASK

  |--------------------------------------------------------------------------

  */



  const handleAddTask = async (

    e

  ) => {

    e.preventDefault();



    setTaskError("");



    if (

      !form.title ||

      !form.date ||

      !form.time

    ) {

      setTaskError(

        "Please enter task title, date and time."

      );



      return;

    }



    try {

      setSavingTask(true);



      await api.post(

        "/tasks",

        form

      );



      setTaskModalOpen(

        false

      );



      setForm({

        title: "",

        description: "",

        date: "",

        time: "",

        priority: "medium",

      });



      await fetchTasks();

    } catch (error) {

      setTaskError(

        error.response?.data

          ?.message ||

          "Unable to create task."

      );

    } finally {

      setSavingTask(false);

    }

  };



  /*

  |--------------------------------------------------------------------------

  | COMPLETE TASK

  |--------------------------------------------------------------------------

  */



  const handleCompleteTask =

    async (taskId) => {

      try {

        await api.patch(

          `/tasks/${taskId}/complete`

        );



        await fetchTasks();

      } catch (error) {

        console.error(

          "Complete Task Error:",

          error

        );

      }

    };



  /*

  |--------------------------------------------------------------------------

  | DELETE TASK

  |--------------------------------------------------------------------------

  */



  const handleDeleteTask =

    async (taskId) => {

      const confirmed =

        window.confirm(

          "Are you sure you want to delete this task?"

        );



      if (!confirmed) {

        return;

      }



      try {

        await api.delete(

          `/tasks/${taskId}`

        );



        await fetchTasks();

      } catch (error) {

        console.error(

          "Delete Task Error:",

          error

        );

      }

    };



  /*

  |--------------------------------------------------------------------------

  | TASK FILTERS

  |--------------------------------------------------------------------------

  */



  const todayString =

    getLocalDateString();



  const todayTasks =

    useMemo(() => {

      return tasks.filter(

        (task) =>

          task.date ===

            todayString &&

          task.status !==

            "completed"

      );

    }, [

      tasks,

      todayString,

    ]);



  const completedTasks =

    useMemo(() => {

      return tasks.filter(

        (task) =>

          task.status ===

          "completed"

      );

    }, [tasks]);



  const carriedTasks =

    useMemo(() => {

      return tasks.filter(

        (task) =>

          task.carriedForward ===

            true &&

          task.status !==

            "completed"

      );

    }, [tasks]);



  const upcomingTasks =

    useMemo(() => {

      return tasks

        .filter(

          (task) =>

            task.date >

              todayString &&

            task.status !==

              "completed"

        )

        .slice(

          0,

          5

        );

    }, [

      tasks,

      todayString,

    ]);



  /*

  |--------------------------------------------------------------------------

  | NEXT TASK

  |--------------------------------------------------------------------------

  */



  const nextTask =

    useMemo(() => {

      const pendingTasks =

        tasks

          .filter(

            (task) =>

              task.status !==

              "completed"

          )

          .sort(

            (a, b) => {

              const first =

                new Date(

                  `${a.date}T${a.time}`

                );



              const second =

                new Date(

                  `${b.date}T${b.time}`

                );



              return (

                first -

                second

              );

            }

          );



      return (

        pendingTasks[0] ||

        null

      );

    }, [tasks]);



  /*

  |--------------------------------------------------------------------------

  | FOCUS SCORE

  |--------------------------------------------------------------------------

  */



  const focusScore =

    useMemo(() => {

      if (

        tasks.length === 0

      ) {

        return 100;

      }



      return Math.round(

        (

          completedTasks.length /

          tasks.length

        ) * 100

      );

    }, [

      tasks,

      completedTasks,

    ]);



  /*

  |--------------------------------------------------------------------------

  | DASHBOARD STATS

  |--------------------------------------------------------------------------

  */



  const stats = [

    {

      title:

        "Today's Tasks",



      value:

        todayTasks.length,



      icon:

        "bi-calendar-check-fill",



      helper:

        todayTasks.length === 1

          ? "1 task for today"

          : `${todayTasks.length} tasks for today`,

    },



    {

      title:

        "Completed",



      value:

        completedTasks.length,



      icon:

        "bi-check-circle-fill",



      helper:

        "Tasks completed",

    },



    {

      title:

        "Carried Forward",



      value:

        carriedTasks.length,



      icon:

        "bi-arrow-repeat",



      helper:

        "Missed tasks moved forward",

    },



    {

      title:

        "Focus Score",



      value:

        `${focusScore}%`,



      icon:

        "bi-lightning-charge-fill",



      helper:

        "Based on completion",

    },

  ];



  /*

  |--------------------------------------------------------------------------

  | DATE FORMAT

  |--------------------------------------------------------------------------

  */



  const formatDate = (

    date

  ) => {

    return new Date(

      `${date}T00:00:00`

    ).toLocaleDateString(

      "en-US",

      {

        month: "short",

        day: "2-digit",

      }

    );

  };



  /*

  |--------------------------------------------------------------------------

  | TIME FORMAT

  |--------------------------------------------------------------------------

  */



  const formatTime = (

    time

  ) => {

    if (!time) {

      return "";

    }



    const [

      hours,

      minutes,

    ] = time.split(":");



    const date =

      new Date();



    date.setHours(

      Number(hours),

      Number(minutes)

    );



    return date.toLocaleTimeString(

      "en-US",

      {

        hour: "2-digit",

        minute: "2-digit",

      }

    );

  };




  const displayTasks = [...tasks].filter(t => t.status !== "completed").sort((a,b) => String(a.date + "T" + a.time).localeCompare(String(b.date + "T" + b.time)));
  const monthTitle = new Date().toLocaleDateString("en-US", {month:"long",year:"numeric"});
  const calendarDays = useMemo(() => {
    const now = new Date(); const first = new Date(now.getFullYear(),now.getMonth(),1).getDay();
    const total = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    return [...Array(first).fill(null),...Array.from({length:total},(_,i)=>i+1)];
  }, []);
  const taskDates = new Set(displayTasks.map(t=>t.date));
  const activity = Array.from({length:7},(_,i)=> {
    const day = new Date();day.setDate(day.getDate()-(6-i));
    const date=getLocalDateString(day);
    return {label:day.toLocaleDateString("en-US",{weekday:"short"}),count:tasks.filter(t=>t.date===date).length,done:tasks.filter(t=>t.date===date&&t.status==="completed").length};
  });
  const maxActivity=Math.max(1,...activity.map(d=>d.count));
  return (
    <div className="dashboard-shell edu-dashboard">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top"><div className="dashboard-brand"><div className="dashboard-brand-icon"><i className="bi bi-bell-fill" /></div><div><strong>TaskWake</strong><span> AI</span></div></div><button type="button" className="sidebar-close" onClick={()=>setSidebarOpen(false)} aria-label="Close menu"><i className="bi bi-x-lg" /></button></div>
        <nav className="sidebar-nav">
          {[{label:"Dashboard",icon:"bi-grid-1x2-fill",path:"/dashboard"},{label:"My Tasks",icon:"bi-check2-square",path:"/tasks"},{label:"Reminders",icon:"bi-bell",path:"/reminders"},{label:"Rescheduled",icon:"bi-arrow-repeat",path:"/rescheduled"},{label:"Insights",icon:"bi-bar-chart-line",path:"/insights"}].map(item=><button key={item.path} type="button" className={`nav-item ${item.path==="/dashboard"?"active":""}`} onClick={()=>goTo(item.path)}><i className={`bi ${item.icon}`}/><span>{item.label}</span>{item.path==="/reminders"&&displayTasks.length>0&&<small className="edu-nav-count">{displayTasks.length}</small>}</button>)}
        </nav>
        <div className="edu-sidebar-promo"><div className="edu-promo-stars"><i className="bi bi-stars"/></div><strong>Make every day count.</strong><p>Stay focused. Keep your tasks moving forward.</p><button type="button" onClick={openAddTaskModal}>+ New task <i className="bi bi-arrow-up-right"/></button></div>
        <div className="sidebar-bottom"><button className="nav-item" type="button" onClick={()=>goTo("/settings")}><i className="bi bi-gear"/><span>Settings</span></button><button className="nav-item logout-item" type="button" onClick={logout}><i className="bi bi-box-arrow-right"/><span>Logout</span></button></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header edu-topbar"><div className="dashboard-header-left"><button className="menu-toggle" type="button" onClick={()=>setSidebarOpen(true)}><i className="bi bi-list"/></button><div><p className="dashboard-label">YOUR PRODUCTIVITY SPACE</p><div className="dashboard-greeting"><h1>Welcome back, {user?.name?.split(" ")[0]||"there"} <span>👋</span></h1></div></div></div><div className="dashboard-header-actions"><InstallPWA/><button type="button" className="header-icon-button" title="View tasks" onClick={()=>goTo("/tasks")}><i className="bi bi-search"/></button><button type="button" className="header-icon-button notification-button" title="Reminders" onClick={()=>goTo("/reminders")}><i className="bi bi-bell"/></button><div className="profile-chip"><div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase()||"U"}</div><div className="profile-text"><strong>{user?.name||"User"}</strong><span>{user?.email||""}</span></div><i className="bi bi-chevron-down"/></div></div></header>
        <section className="dashboard-content edu-content">
          {notificationPermission!=="granted"&&notificationPermission!=="unsupported"&&<div className="edu-permission"><i className="bi bi-bell"/><span>Get notified when your tasks are due.</span><button type="button" onClick={enableNotifications}>Enable reminders</button></div>}
          <div className="edu-intro"><div><span className="edu-eyebrow">OVERVIEW</span><h2>Your workspace, at a glance.</h2><p>Plan smarter, stay on schedule and celebrate your progress.</p></div><button type="button" className="edu-add-main" onClick={openAddTaskModal}><i className="bi bi-plus-lg"/> Add New Task</button></div>
          <div className="edu-main-grid">
            <div className="edu-left-column">
              <section className="edu-section"><div className="edu-section-heading"><div><h3>Productivity overview</h3><p>Everything that matters today</p></div><button type="button" onClick={()=>goTo("/tasks")}>View all <i className="bi bi-arrow-up-right"/></button></div><div className="edu-stat-grid">{stats.map((s,i)=><button key={s.title} type="button" className={`edu-stat-card edu-stat-${i}`} onClick={()=>goTo(i===2?"/rescheduled":i===3?"/insights":"/tasks")}><span className="edu-stat-icon"><i className={`bi ${s.icon}`}/></span><strong>{s.value}</strong><span className="edu-stat-name">{s.title}</span><small>{s.helper}</small></button>)}</div></section>
              <div className="edu-middle-grid">
                <section className="edu-panel edu-activity"><div className="edu-section-heading"><div><h3>Weekly Activity</h3><p>Your tasks over the last 7 days</p></div><span className="edu-soft-pill"><i className="bi bi-graph-up"/> This week</span></div><div className="edu-chart"><div className="edu-chart-lines"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div><div className="edu-bars">{activity.map((d,i)=><div className="edu-bar-col" key={i}><div className="edu-bar-track" title={`${d.count} tasks, ${d.done} completed`}><div className="edu-bar" style={{height:`${Math.max(d.count?10:3,d.count/maxActivity*100)}%`}}/></div><span>{d.label}</span></div>)}</div></div><div className="edu-chart-footer"><span><i className="bi bi-circle-fill"/> Tasks scheduled</span><strong>{completedTasks.length} completed overall</strong></div></section>
                <section className="edu-panel edu-schedule"><div className="edu-section-heading"><div><h3>Daily Schedule</h3><p>What needs your attention</p></div><button type="button" onClick={()=>goTo("/tasks")}><i className="bi bi-arrow-right"/></button></div><div className="edu-schedule-list">{displayTasks.length===0?<div className="edu-empty"><i className="bi bi-check-circle"/><strong>All caught up!</strong><p>Nothing pending right now.</p></div>:displayTasks.slice(0,4).map((task,i)=><div className="edu-schedule-item" key={task.id}><span className={`edu-schedule-icon edu-tone-${i%4}`}><i className={`bi ${task.carriedForward?"bi-arrow-repeat":"bi-check2-square"}`}/></span><div><strong>{task.title}</strong><small>{formatDate(task.date)} · {formatTime(task.time)}</small></div><button type="button" title="Mark complete" onClick={()=>handleCompleteTask(task.id)}><i className="bi bi-check-lg"/></button></div>)}</div></section>
              </div>
              <section className="edu-panel edu-tasks"><div className="edu-section-heading"><div><h3>Tasks you're working on</h3><p>Keep the momentum going</p></div><button type="button" onClick={()=>goTo("/tasks")}>All tasks <i className="bi bi-arrow-right"/></button></div>{loadingTasks?<div className="edu-empty">Loading your tasks...</div>:displayTasks.length===0?<div className="edu-empty"><i className="bi bi-stars"/><strong>You're all clear!</strong><p>Add a task to get started.</p><button type="button" onClick={openAddTaskModal}>Create task</button></div>:displayTasks.slice(0,4).map(task=><div className="edu-task-row" key={task.id}><span className="edu-task-icon"><i className="bi bi-list-check"/></span><div><strong>{task.title}</strong><small>{formatDate(task.date)} · {formatTime(task.time)} {task.carriedForward?"· Carried forward":""}</small></div><span className={`edu-priority edu-priority-${task.priority||"medium"}`}>{task.priority||"medium"}</span><button type="button" title="Complete task" onClick={()=>handleCompleteTask(task.id)}><i className="bi bi-check-lg"/></button><button type="button" title="Delete task" onClick={()=>handleDeleteTask(task.id)}><i className="bi bi-trash3"/></button></div>)}<button className="edu-inline-add" type="button" onClick={openAddTaskModal}><i className="bi bi-plus-circle"/> Add another task</button></section>
            </div>
            <aside className="edu-right-column">
              <section className="edu-premium"><div><span className="edu-premium-tag"><i className="bi bi-stars"/> TASKWAKE AI</span><h3>Small steps.<br/>Big progress.</h3><p>Keep moving forward, one task at a time.</p><button type="button" onClick={()=>goTo("/insights")}>Explore Insights <i className="bi bi-arrow-right"/></button></div><div className="edu-premium-graphic"><i className="bi bi-lightning-charge-fill"/></div></section>
              <section className="edu-panel edu-calendar"><div className="edu-section-heading"><div><h3>{monthTitle}</h3><p>Task calendar</p></div><button type="button" onClick={()=>goTo("/reminders")} title="View reminders"><i className="bi bi-calendar3"/></button></div><div className="edu-calendar-grid">{["S","M","T","W","T","F","S"].map((d,i)=><span key={`h${i}`} className="edu-weekday">{d}</span>)}{calendarDays.map((day,i)=><span key={i} className={`edu-calendar-day ${day===new Date().getDate()?"today":""} ${day&&taskDates.has(`${todayString.slice(0,7)}-${String(day).padStart(2,"0")}`)?"has-task":""}`}>{day||""}</span>)}</div><div className="edu-calendar-note"><i className="bi bi-circle-fill"/> Dots indicate scheduled tasks</div></section>
              <section className="edu-panel edu-upcoming"><div className="edu-section-heading"><div><h3>Upcoming tasks</h3><p>Don't miss what's next</p></div><button type="button" onClick={()=>goTo("/reminders")}><i className="bi bi-plus-lg"/></button></div>{displayTasks.length===0?<div className="edu-empty"><i className="bi bi-calendar-check"/><p>No upcoming tasks</p></div>:displayTasks.slice(0,4).map((t,i)=><div className="edu-upcoming-item" key={t.id}><span className={`edu-upcoming-dot edu-tone-${i%4}`}><i className="bi bi-bell"/></span><div><strong>{t.title}</strong><small>{formatDate(t.date)} · {formatTime(t.time)}</small></div><span className="edu-upcoming-status">{t.carriedForward?"Carried":"Pending"}</span></div>)}</section>
              <section className="edu-insight"><i className="bi bi-stars"/><div><strong>Smart Productivity Insight</strong><p>{smartInsight?.message||"Your AI insights will appear here as you plan your tasks."}</p></div></section>
            </aside>
          </div>
        </section>
        <button className="mobile-add-button" type="button" onClick={openAddTaskModal}><i className="bi bi-plus-lg"/></button>
      </main>
      <AnimatePresence>
{taskModalOpen && (



          <motion.div

            className="task-modal-overlay"

            initial={{

              opacity: 0,

            }}

            animate={{

              opacity: 1,

            }}

            exit={{

              opacity: 0,

            }}

            onMouseDown={

              closeTaskModal

            }

          >



            <motion.div

              className="task-modal"

              initial={{

                opacity: 0,

                scale: 0.94,

                y: 25,

              }}

              animate={{

                opacity: 1,

                scale: 1,

                y: 0,

              }}

              exit={{

                opacity: 0,

                scale: 0.96,

                y: 20,

              }}

              transition={{

                duration: 0.22,

              }}

              onMouseDown={(e) =>

                e.stopPropagation()

              }

            >



              {/* MODAL HEADER */}



              <div className="task-modal-header">



                <div>



                  <span>

                    New task

                  </span>



                  <h3>

                    Plan something important

                  </h3>



                </div>



                <button

                  onClick={

                    closeTaskModal

                  }

                  type="button"

                >

                  <i className="bi bi-x-lg" />

                </button>



              </div>



              {/* ERROR */}



              {taskError && (



                <div className="task-modal-error">



                  <i className="bi bi-exclamation-circle-fill" />



                  {taskError}



                </div>



              )}



              {/* FORM */}



              <form

                onSubmit={

                  handleAddTask

                }

              >



                {/* TITLE */}



                <div className="modal-field">



                  <label>

                    Task title

                  </label>



                  <div className="modal-input-wrap">



                    <i className="bi bi-check2-square" />



                    <input

                      type="text"

                      name="title"

                      placeholder="e.g. Finish hackathon presentation"

                      value={

                        form.title

                      }

                      onChange={

                        handleChange

                      }

                      required

                    />



                  </div>



                </div>



                {/* DESCRIPTION */}



                <div className="modal-field">



                  <label>

                    Description

                  </label>



                  <div className="modal-textarea-wrap">



                    <i className="bi bi-card-text" />



                    <textarea

                      name="description"

                      placeholder="Add some details..."

                      rows="4"

                      value={

                        form.description

                      }

                      onChange={

                        handleChange

                      }

                    />



                  </div>



                </div>



                {/* DATE / TIME */}



                <div className="modal-two-column">



                  <div className="modal-field">



                    <label>

                      Date

                    </label>



                    <div className="modal-input-wrap">



                      <i className="bi bi-calendar3" />



                      <input

                        type="date"

                        name="date"

                        value={

                          form.date

                        }

                        onChange={

                          handleChange

                        }

                        required

                      />



                    </div>



                  </div>



                  <div className="modal-field">



                    <label>

                      Time

                    </label>



                    <div className="modal-input-wrap">



                      <i className="bi bi-clock-fill" />



                      <input

                        type="time"

                        name="time"

                        value={

                          form.time

                        }

                        onChange={

                          handleChange

                        }

                        required

                      />



                    </div>



                  </div>



                </div>



                {/* PRIORITY */}



                <div className="modal-field">



                  <label>

                    Priority

                  </label>



                  <div className="priority-options">



                    {/* LOW */}



                    <label

                      className={`priority-option low ${

                        form.priority ===

                        "low"

                          ? "selected"

                          : ""

                      }`}

                    >



                      <input

                        type="radio"

                        name="priority"

                        value="low"

                        checked={

                          form.priority ===

                          "low"

                        }

                        onChange={

                          handleChange

                        }

                      />



                      <i className="bi bi-arrow-down-circle-fill" />



                      Low



                    </label>



                    {/* MEDIUM */}



                    <label

                      className={`priority-option medium ${

                        form.priority ===

                        "medium"

                          ? "selected"

                          : ""

                      }`}

                    >



                      <input

                        type="radio"

                        name="priority"

                        value="medium"

                        checked={

                          form.priority ===

                          "medium"

                        }

                        onChange={

                          handleChange

                        }

                      />



                      <i className="bi bi-dash-circle-fill" />



                      Medium



                    </label>



                    {/* HIGH */}



                    <label

                      className={`priority-option high ${

                        form.priority ===

                        "high"

                          ? "selected"

                          : ""

                      }`}

                    >



                      <input

                        type="radio"

                        name="priority"

                        value="high"

                        checked={

                          form.priority ===

                          "high"

                        }

                        onChange={

                          handleChange

                        }

                      />



                      <i className="bi bi-arrow-up-circle-fill" />



                      High



                    </label>



                  </div>



                </div>



                {/* AUTO RESCHEDULE INFO */}



                <div className="task-modal-note">



                  <i className="bi bi-arrow-repeat" />



                  <div>



                    <strong>

                      Auto carry-forward

                    </strong>



                    <span>

                      If this task is missed,

                      TaskWake will move it to

                      the next day automatically.

                    </span>



                  </div>



                </div>



                {/* ACTION BUTTONS */}



                <div className="task-modal-actions">



                  <button

                    type="button"

                    className="modal-cancel-button"

                    onClick={

                      closeTaskModal

                    }

                  >

                    Cancel

                  </button>



                  <button

                    type="submit"

                    className="modal-save-button"

                    disabled={

                      savingTask

                    }

                  >



                    {savingTask ? (

                      <>



                        <i className="bi bi-arrow-repeat modal-spin" />



                        Saving...



                      </>

                    ) : (

                      <>



                        <i className="bi bi-plus-lg" />



                        Create Task



                      </>

                    )}



                  </button>



                </div>



              </form>



            </motion.div>



          </motion.div>



        )}



      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
