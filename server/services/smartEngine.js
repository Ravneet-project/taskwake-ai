const analyzeTasks = (tasks = []) => {
  const pendingTasks = tasks.filter(
    (task) => task.status !== "completed"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  );

  const carriedTasks = pendingTasks.filter(
    (task) => task.carriedForward
  );

  const highPriorityTasks = pendingTasks.filter(
    (task) => task.priority === "high"
  );

  const repeatedlyMissedTasks = pendingTasks.filter(
    (task) => (task.missedCount || 0) >= 2
  );

  const completionRate =
    tasks.length > 0
      ? Math.round(
          (completedTasks.length / tasks.length) * 100
        )
      : 100;

  let message = "";
  let type = "success";
  let icon = "bi-stars";
  let action = "Keep going";
  let score = completionRate;

  /*
  |--------------------------------------------------------------------------
  | REPEATEDLY MISSED TASKS
  |--------------------------------------------------------------------------
  */

  if (repeatedlyMissedTasks.length > 0) {
    const task = repeatedlyMissedTasks[0];

    message =
      `"${task.title}" has been missed ${task.missedCount} times. ` +
      `Try moving it to an earlier time or breaking it into smaller steps.`;

    type = "danger";

    icon = "bi-exclamation-triangle-fill";

    action = "Reschedule important work";

    score = Math.max(20, completionRate - 20);
  }

  /*
  |--------------------------------------------------------------------------
  | TOO MANY CARRIED TASKS
  |--------------------------------------------------------------------------
  */

  else if (carriedTasks.length >= 3) {
    message =
      `You currently have ${carriedTasks.length} carried-forward tasks. ` +
      `Focus on clearing older tasks before adding new work.`;

    type = "warning";

    icon = "bi-arrow-repeat";

    action = "Clear backlog";

    score = Math.max(30, completionRate - 15);
  }

  /*
  |--------------------------------------------------------------------------
  | HIGH PRIORITY TASKS
  |--------------------------------------------------------------------------
  */

  else if (highPriorityTasks.length > 0) {
    const task = highPriorityTasks[0];

    message =
      `"${task.title}" is currently your highest-priority task. ` +
      `Consider completing it before lower-priority work.`;

    type = "info";

    icon = "bi-lightning-charge-fill";

    action = "Focus on high priority";
  }

  /*
  |--------------------------------------------------------------------------
  | LOW COMPLETION
  |--------------------------------------------------------------------------
  */

  else if (
    tasks.length >= 3 &&
    completionRate < 50
  ) {
    message =
      `Your current completion rate is ${completionRate}%. ` +
      `Try planning fewer tasks and completing the most important ones first.`;

    type = "warning";

    icon = "bi-graph-down-arrow";

    action = "Simplify your schedule";
  }

  /*
  |--------------------------------------------------------------------------
  | GREAT PERFORMANCE
  |--------------------------------------------------------------------------
  */

  else if (
    tasks.length > 0 &&
    completionRate >= 75
  ) {
    message =
      `Great work! You have completed ${completionRate}% of your tasks. ` +
      `Your workload looks well managed.`;

    type = "success";

    icon = "bi-trophy-fill";

    action = "Maintain momentum";
  }

  /*
  |--------------------------------------------------------------------------
  | NO TASKS
  |--------------------------------------------------------------------------
  */

  else if (tasks.length === 0) {
    message =
      "Your schedule is empty. Add a task and TaskWake will start analyzing your productivity.";

    type = "info";

    icon = "bi-lightbulb-fill";

    action = "Create your first task";

    score = 100;
  }

  /*
  |--------------------------------------------------------------------------
  | DEFAULT
  |--------------------------------------------------------------------------
  */

  else {
    message =
      "Your workload looks balanced. Complete today's tasks before they get carried forward.";

    type = "success";

    icon = "bi-stars";

    action = "Stay focused";
  }

  return {
    message,
    type,
    icon,
    action,

    score,

    stats: {
      total: tasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
      carried: carriedTasks.length,
      highPriority: highPriorityTasks.length,
      completionRate,
    },
  };
};

module.exports = {
  analyzeTasks,
};