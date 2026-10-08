import {

  useEffect,

  useMemo,

  useState,

} from "react";



import {

  motion,

} from "framer-motion";



import {

  useLocation,

  useNavigate,

} from "react-router-dom";



import { useAuth } from "../context/AuthContext";



import api from "../services/api";



import {

  requestNotificationPermission,

} from "../services/reminderService";
import "./sidebar.css";


const Reminders = () => {

  const navigate = useNavigate();

  const location = useLocation();



  const { user, logout } = useAuth();



  const [sidebarOpen, setSidebarOpen] =

    useState(false);



  const [tasks, setTasks] =

    useState([]);



  const [loading, setLoading] =

    useState(true);



  const [now, setNow] =

    useState(new Date());



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

  | NAVIGATION

  |--------------------------------------------------------------------------

  */



  const navItems = [

    {

      label: "Dashboard",

      path: "/dashboard",

      icon: "bi-grid-fill",

    },

    {

      label: "My Tasks",

      path: "/tasks",

      icon: "bi-check2-square",

    },

    {

      label: "Reminders",

      path: "/reminders",

      icon: "bi-alarm-fill",

    },

    {

      label: "Rescheduled",

      path: "/rescheduled",

      icon: "bi-arrow-repeat",

    },

    {

      label: "Insights",

      path: "/insights",

      icon: "bi-graph-up-arrow",

    },

  ];



  /*

  |--------------------------------------------------------------------------

  | FETCH TASKS

  |--------------------------------------------------------------------------

  */



  const fetchTasks = async () => {

    try {

      setLoading(true);



      const { data } =

        await api.get("/tasks");



      setTasks(

        Array.isArray(data) ? data : Array.isArray(data?.tasks) ? data.tasks : []

      );

    } catch (error) {

      console.error(

        "Fetch reminders error:",

        error

      );

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchTasks();

  }, []);



  /*

  |--------------------------------------------------------------------------

  | CURRENT TIME TICK

  |--------------------------------------------------------------------------

  */



  useEffect(() => {

    const interval =

      setInterval(() => {

        setNow(new Date());

      }, 1000);



    return () => {

      clearInterval(interval);

    };

  }, []);



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

  | COMPLETE TASK

  |--------------------------------------------------------------------------

  */



  const completeTask =

    async (taskId) => {

      try {

        await api.patch(

          `/tasks/${taskId}/complete`

        );



        await fetchTasks();

      } catch (error) {

        console.error(

          "Complete reminder error:",

          error

        );

      }

    };



  /*

  |--------------------------------------------------------------------------

  | DELETE TASK

  |--------------------------------------------------------------------------

  */



  const deleteTask =

    async (taskId) => {

      const confirmed =

        window.confirm(

          "Delete this reminder?"

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

          "Delete reminder error:",

          error

        );

      }

    };



  /*

  |--------------------------------------------------------------------------

  | HELPERS

  |--------------------------------------------------------------------------

  */



  const getTaskDateTime = (task) => {
    const rawDate = task.date || task.dueDate || task.due_date || task.scheduledDate;
    const rawTime = task.time || task.dueTime || task.due_time || "23:59";
    if (!rawDate) return null;
    const datePart = String(rawDate).slice(0, 10);
    const value = new Date(`${datePart}T${String(rawTime).slice(0, 5)}`);
    return Number.isNaN(value.getTime()) ? null : value;
  };

  const isCarried = (task) =>
    task.carriedForward === true || task.carriedForward === 1 ||
    task.carriedForward === "true" || Number(task.missedCount || 0) > 0;

  const getLocalDateString = (

    date = new Date()

  ) => {

    const year =

      date.getFullYear();



    const month =

      String(

        date.getMonth() + 1

      ).padStart(2, "0");



    const day =

      String(

        date.getDate()

      ).padStart(2, "0");



    return `${year}-${month}-${day}`;

  };



  const todayString =

    getLocalDateString();



  const formatDate = (

    date

  ) => {

    return new Date(

      `${date}T00:00:00`

    ).toLocaleDateString(

      "en-US",

      {

        weekday: "short",

        day: "2-digit",

        month: "short",

      }

    );

  };



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



  /*

  |--------------------------------------------------------------------------

  | COUNTDOWN

  |--------------------------------------------------------------------------

  */



  const getCountdown = (

    task

  ) => {

    const taskTime =

      getTaskDateTime(task);



    if (!taskTime) return "Not scheduled";
    const diff =

      (taskTime?.getTime() ?? now.getTime()) -

      now.getTime();



    if (diff <= 0) {

      return "Due now";

    }



    const totalSeconds =

      Math.floor(

        diff / 1000

      );



    const days =

      Math.floor(

        totalSeconds /

          86400

      );



    const hours =

      Math.floor(

        (

          totalSeconds %

          86400

        ) / 3600

      );



    const minutes =

      Math.floor(

        (

          totalSeconds %

          3600

        ) / 60

      );



    const seconds =

      totalSeconds % 60;



    if (days > 0) {

      return `${days}d ${hours}h`;

    }



    if (hours > 0) {

      return `${hours}h ${minutes}m`;

    }



    return `${minutes}m ${seconds}s`;

  };



  /*

  |--------------------------------------------------------------------------

  | REMINDER STATUS

  |--------------------------------------------------------------------------

  */



  const getReminderState = (

    task

  ) => {

    const taskTime =

      getTaskDateTime(task);



    if (!taskTime) return "Not scheduled";
    const diff =

      (taskTime?.getTime() ?? now.getTime()) -

      now.getTime();



    if (diff < -60000) {

      return {

        label: "Overdue",

        className:

          "overdue",

        icon:

          "bi-exclamation-triangle-fill",

      };

    }



    if (

      diff <= 60000 &&

      diff >= -60000

    ) {

      return {

        label: "Due Now",

        className:

          "due-now",

        icon:

          "bi-bell-fill",

      };

    }



    return {

      label: "Upcoming",

      className:

        "upcoming",

      icon:

        "bi-clock-fill",

    };

  };



  /*

  |--------------------------------------------------------------------------

  | FILTER REMINDERS

  |--------------------------------------------------------------------------

  */



  const pendingTasks =

    useMemo(() => {

      return tasks

        .filter(

          (task) =>

            task.status !==

            "completed"

        )

        .sort(

          (a, b) =>

            (getTaskDateTime(a)?.getTime() ?? Infinity) -

            (getTaskDateTime(b)?.getTime() ?? Infinity)

        );

    }, [tasks]);



  // One task belongs to exactly one bucket. Overdue carried tasks are visible.
  const todayReminders = pendingTasks.filter((task) => {
    const date = getTaskDateTime(task);
    return date && getLocalDateString(date) === todayString;
  });
  const futureReminders = pendingTasks.filter((task) => {
    const date = getTaskDateTime(task);
    return date && getLocalDateString(date) > todayString;
  });
  const overdueReminders = pendingTasks.filter((task) => {
    const date = getTaskDateTime(task);
    return date && getLocalDateString(date) < todayString;
  });
  const unscheduledCarried = pendingTasks.filter((task) =>
    isCarried(task) && !getTaskDateTime(task)
  );
  const overdueCount = pendingTasks.filter((task) => {
    const date = getTaskDateTime(task);
    return date && date < now;
  }).length;
  const nextReminder = pendingTasks.find((task) => {
    const date = getTaskDateTime(task);
    return date && date > now;
  }) || null;

  return (

    <div className="dashboard-shell">



      {/* MOBILE OVERLAY */}



      {sidebarOpen && (

        <div

          className="sidebar-overlay"

          onClick={() =>

            setSidebarOpen(false)

          }

        />

      )}



      {/* SIDEBAR */}



      <aside

        className={`dashboard-sidebar ${

          sidebarOpen

            ? "sidebar-open"

            : ""

        }`}

      >



        <div className="sidebar-top">



          <div className="dashboard-brand">



            <div className="dashboard-brand-icon">

              <i className="bi bi-bell-fill" />

            </div>



            <div>

              <strong>

                TaskWake

              </strong>



              <span>

                AI

              </span>

            </div>



          </div>



          <button

            className="sidebar-close"

            onClick={() =>

              setSidebarOpen(false)

            }

            type="button"

          >

            <i className="bi bi-x-lg" />

          </button>



        </div>



        <nav className="sidebar-nav">



          {navItems.map(

            (item) => (



              <button

                key={

                  item.path

                }

                type="button"

                className={`nav-item ${

                  location.pathname ===

                  item.path

                    ? "active"

                    : ""

                }`}

                onClick={() => {

                  navigate(

                    item.path

                  );



                  setSidebarOpen(

                    false

                  );

                }}

              >



                <i

                  className={`bi ${item.icon}`}

                />



                <span>

                  {item.label}

                </span>



              </button>



            )

          )}



        </nav>



        <div className="sidebar-card">



          <div className="sidebar-card-icon">

            <i className="bi bi-alarm-fill" />

          </div>



          <h4>

            Smart Reminders

          </h4>



          <p>

            Keep track of due

            times and upcoming

            tasks from one place.

          </p>



        </div>



        <div className="sidebar-bottom">



          <button

            className="nav-item"

            type="button"

          >

            <i className="bi bi-gear-fill" />



            <span>

              Settings

            </span>

          </button>



          <button

            className="nav-item logout-item"

            onClick={logout}

            type="button"

          >

            <i className="bi bi-box-arrow-right" />



            <span>

              Logout

            </span>

          </button>



        </div>



      </aside>



      {/* MAIN */}



      <main className="dashboard-main">



        {/* HEADER */}



        <header className="dashboard-header">



          <div className="dashboard-header-left">



            <button

              className="menu-toggle"

              onClick={() =>

                setSidebarOpen(true)

              }

              type="button"

            >

              <i className="bi bi-list" />

            </button>



            <div>



              <p className="dashboard-label">

                Alarm Center

              </p>



              <h1>

                Reminders

              </h1>



            </div>



          </div>



          <div className="dashboard-header-actions">



            <button

              className={`header-icon-button notification-button ${

                notificationPermission ===

                "granted"

                  ? "notifications-enabled"

                  : ""

              }`}

              onClick={

                enableNotifications

              }

              type="button"

              title={

                notificationPermission ===

                "granted"

                  ? "Notifications enabled"

                  : "Enable notifications"

              }

            >

              <i

                className={`bi ${

                  notificationPermission ===

                  "granted"

                    ? "bi-bell-fill"

                    : "bi-bell"

                }`}

              />

            </button>



            <div className="profile-chip">



              <div className="profile-avatar">



                {user?.name

                  ?.charAt(0)

                  ?.toUpperCase() ||

                  "U"}



              </div>



              <div className="profile-text">



                <strong>

                  {user?.name ||

                    "User"}

                </strong>



                <span>

                  {user?.email ||

                    ""}

                </span>



              </div>



              <i className="bi bi-chevron-down" />



            </div>



          </div>



        </header>



        {/* CONTENT */}



        <section className="dashboard-content reminders-page">



          {/* REMINDER HERO */}



          <motion.section

            className="reminders-hero"

            initial={{

              opacity: 0,

              y: 16,

            }}

            animate={{

              opacity: 1,

              y: 0,

            }}

          >



            <div className="reminders-hero-copy">



              <span>

                <i className="bi bi-bell-fill" />



                Reminder Center

              </span>



              <h2>

                Never miss what

                matters.

              </h2>



              <p>

                Track upcoming tasks,

                live countdowns and

                overdue reminders in

                one place.

              </p>



              {notificationPermission !==

                "granted" &&

                notificationPermission !==

                  "unsupported" && (



                  <button

                    type="button"

                    onClick={

                      enableNotifications

                    }

                  >

                    <i className="bi bi-bell-fill" />



                    Enable Notifications

                  </button>



                )}



            </div>



            <div className="reminder-next-card">



              <div className="reminder-next-icon">

                <i className="bi bi-alarm-fill" />

              </div>



              <span>

                Next reminder

              </span>



              <strong>

                {nextReminder

                  ? formatTime(

                      nextReminder.time

                    )

                  : "--:--"}

              </strong>



              <small>

                {nextReminder

                  ? nextReminder.title

                  : "No upcoming reminder"}

              </small>



              {nextReminder && (

                <div className="reminder-countdown">

                  <i className="bi bi-hourglass-split" />



                  {getCountdown(

                    nextReminder

                  )}

                </div>

              )}



            </div>



          </motion.section>



          {/* STATS */}



          <section className="reminder-stats">



            <div className="reminder-stat-card">



              <i className="bi bi-calendar-day-fill" />



              <div>

                <strong>

                  {

                    todayReminders.length

                  }

                </strong>



                <span>

                  Today

                </span>

              </div>



            </div>



            <div className="reminder-stat-card">



              <i className="bi bi-calendar2-week-fill" />



              <div>

                <strong>

                  {

                    futureReminders.length

                  }

                </strong>



                <span>

                  Upcoming

                </span>

              </div>



            </div>



            <div className="reminder-stat-card warning">



              <i className="bi bi-exclamation-triangle-fill" />



              <div>

                <strong>

                  {overdueCount}

                </strong>



                <span>

                  Overdue

                </span>

              </div>



            </div>



            <div className="reminder-stat-card">



              <i className="bi bi-bell-fill" />



              <div>

                <strong>

                  {notificationPermission ===

                  "granted"

                    ? "ON"

                    : "OFF"}

                </strong>



                <span>

                  Notifications

                </span>

              </div>



            </div>



          </section>



            {/* OVERDUE / CARRIED FORWARD: previously hidden past-due tasks */}
            {(overdueReminders.length > 0 || unscheduledCarried.length > 0) && (
              <section className="reminders-section">
                <div className="reminders-section-heading">
                  <div><span>Needs attention</span><h3>Overdue & Carried Forward</h3></div>
                  <span className="reminder-section-count">{overdueReminders.length + unscheduledCarried.length}</span>
                </div>
                <div className="reminder-list">
                  {[...overdueReminders, ...unscheduledCarried].map((task) => (
                    <motion.article className="reminder-card" key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="reminder-time-box overdue">
                        <i className="bi bi-exclamation-triangle-fill" />
                        <strong>{task.time ? formatTime(task.time) : "Pending"}</strong>
                      </div>
                      <div className="reminder-card-content">
                        <div className="reminder-title-row">
                          <h4>{task.title}</h4>
                          <span className="reminder-status overdue">{getTaskDateTime(task) ? "Overdue" : "Needs scheduling"}</span>
                        </div>
                        {task.description && <p>{task.description}</p>}
                        <div className="reminder-meta">
                          {getTaskDateTime(task) && <span><i className="bi bi-calendar3" /> {formatDate(getLocalDateString(getTaskDateTime(task)))}</span>}
                          <span className={`priority-chip ${task.priority || "medium"}`}>{task.priority || "medium"}</span>
                          {isCarried(task) && <span className="carried-badge"><i className="bi bi-arrow-repeat" /> Carried Forward</span>}
                        </div>
                      </div>
                      <div className="reminder-actions">
                        <button type="button" className="reminder-complete" title="Mark complete" onClick={() => completeTask(task.id)}><i className="bi bi-check-lg" /></button>
                        <button type="button" className="reminder-delete" title="Delete" onClick={() => deleteTask(task.id)}><i className="bi bi-trash3" /></button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>
            )}

          {/* TODAY */}



          <section className="reminders-section">



            <div className="reminders-section-heading">



              <div>



                <span>

                  Today

                </span>



                <h3>

                  Today's Reminders

                </h3>



              </div>



              <span className="reminder-section-count">

                {

                  todayReminders.length

                }

              </span>



            </div>



            {loading ? (



              <div className="task-loading">



                <div className="spinner-border" />



                <span>

                  Loading reminders...

                </span>



              </div>



            ) : todayReminders.length ===

              0 ? (



              <div className="reminder-empty">



                <div>

                  <i className="bi bi-calendar2-check" />

                </div>



                <h4>

                  No reminders today

                </h4>



                <p>

                  You're clear for

                  today.

                </p>



              </div>



            ) : (



              <div className="reminder-list">



                {todayReminders.map(

                  (

                    task,

                    index

                  ) => {

                    const status =

                      getReminderState(

                        task

                      );



                    return (



                      <motion.article

                        className="reminder-card"

                        key={

                          task.id

                        }

                        initial={{

                          opacity: 0,

                          x: -20,

                        }}

                        animate={{

                          opacity: 1,

                          x: 0,

                        }}

                        transition={{

                          delay:

                            index *

                            0.05,

                        }}

                      >



                        <div className={`reminder-time-box ${status.className}`}>



                          <i

                            className={`bi ${status.icon}`}

                          />



                          <strong>

                            {formatTime(

                              task.time

                            )}

                          </strong>



                        </div>



                        <div className="reminder-card-content">



                          <div className="reminder-title-row">



                            <h4>

                              {

                                task.title

                              }

                            </h4>



                            <span

                              className={`reminder-status ${status.className}`}

                            >

                              {

                                status.label

                              }

                            </span>



                          </div>



                          {task.description && (



                            <p>

                              {

                                task.description

                              }

                            </p>



                          )}



                          <div className="reminder-meta">



                            <span>

                              <i className="bi bi-hourglass-split" />



                              {getCountdown(

                                task

                              )}

                            </span>



                            <span

                              className={`priority-chip ${

                                task.priority ||

                                "medium"

                              }`}

                            >

                              {task.priority ||

                                "medium"}

                            </span>



                            {task.carriedForward && (



                              <span className="carried-badge">



                                <i className="bi bi-arrow-repeat" />



                                Carried



                              </span>



                            )}



                          </div>



                        </div>



                        <div className="reminder-actions">



                          <button

                            type="button"

                            className="reminder-complete"

                            title="Mark complete"

                            onClick={() =>

                              completeTask(

                                task.id

                              )

                            }

                          >

                            <i className="bi bi-check-lg" />

                          </button>



                          <button

                            type="button"

                            className="reminder-delete"

                            title="Delete"

                            onClick={() =>

                              deleteTask(

                                task.id

                              )

                            }

                          >

                            <i className="bi bi-trash3" />

                          </button>



                        </div>



                      </motion.article>



                    );

                  }

                )}



              </div>



            )}



          </section>



          {/* UPCOMING */}



          <section className="reminders-section">



            <div className="reminders-section-heading">



              <div>



                <span>

                  Later

                </span>



                <h3>

                  Upcoming Reminders

                </h3>



              </div>



              <span className="reminder-section-count">

                {

                  futureReminders.length

                }

              </span>



            </div>



            {futureReminders.length ===

            0 ? (



              <div className="reminder-empty small">



                <div>

                  <i className="bi bi-calendar3" />

                </div>



                <h4>

                  Nothing scheduled

                </h4>



                <p>

                  Future reminders

                  will appear here.

                </p>



              </div>



            ) : (



              <div className="reminder-list">



                {futureReminders.map(

                  (

                    task,

                    index

                  ) => (



                    <motion.article

                      className="reminder-card"

                      key={

                        task.id

                      }

                      initial={{

                        opacity: 0,

                        x: 20,

                      }}

                      animate={{

                        opacity: 1,

                        x: 0,

                      }}

                      transition={{

                        delay:

                          index *

                          0.05,

                      }}

                    >



                      <div className="reminder-date-box">



                        <strong>

                          {new Date(

                            `${task.date}T00:00:00`

                          ).getDate()}

                        </strong>



                        <span>

                          {new Date(

                            `${task.date}T00:00:00`

                          ).toLocaleDateString(

                            "en-US",

                            {

                              month:

                                "short",

                            }

                          )}

                        </span>



                      </div>



                      <div className="reminder-card-content">



                        <div className="reminder-title-row">



                          <h4>

                            {

                              task.title

                            }

                          </h4>



                          <span className="reminder-status upcoming">

                            Upcoming

                          </span>



                        </div>



                        <p className="reminder-date-text">



                          <i className="bi bi-calendar3" />



                          {formatDate(

                            task.date

                          )}



                          <i className="bi bi-clock-fill" />



                          {formatTime(

                            task.time

                          )}



                        </p>



                        <div className="reminder-meta">



                          <span>

                            <i className="bi bi-hourglass-split" />



                            {getCountdown(

                              task

                            )}

                          </span>



                          <span

                            className={`priority-chip ${

                              task.priority ||

                              "medium"

                            }`}

                          >

                            {task.priority ||

                              "medium"}

                          </span>
                          {isCarried(task) && <span className="carried-badge"><i className="bi bi-arrow-repeat" /> Carried Forward</span>}



                        </div>



                      </div>



                      <div className="reminder-actions">



                        <button

                          type="button"

                          className="reminder-complete"

                          onClick={() =>

                            completeTask(

                              task.id

                            )

                          }

                          title="Mark complete"

                        >

                          <i className="bi bi-check-lg" />

                        </button>



                        <button

                          type="button"

                          className="reminder-delete"

                          onClick={() =>

                            deleteTask(

                              task.id

                            )

                          }

                          title="Delete"

                        >

                          <i className="bi bi-trash3" />

                        </button>



                      </div>



                    </motion.article>



                  )

                )}



              </div>



            )}



          </section>



        </section>



      </main>



    </div>

  );

};



export default Reminders;
