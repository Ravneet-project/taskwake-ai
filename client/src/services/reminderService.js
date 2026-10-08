const notifiedTasks = new Set();

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return {
      success: false,
      message: "Notifications are not supported in this browser.",
    };
  }

  if (Notification.permission === "granted") {
    return {
      success: true,
      permission: "granted",
    };
  }

  const permission = await Notification.requestPermission();

  return {
    success: permission === "granted",
    permission,
  };
};

export const playReminderSound = () => {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    const audioContext = new AudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
      880,
      audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(
      0.18,
      audioContext.currentTime
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + 0.45
    );
  } catch (error) {
    console.error("Reminder sound error:", error);
  }
};

export const showTaskNotification = (task) => {
  if (!task?.id) {
    return;
  }

  if (notifiedTasks.has(task.id)) {
    return;
  }

  notifiedTasks.add(task.id);

  playReminderSound();

  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification("TaskWake Reminder 🔔", {
      body: task.title,
      icon: "/vite.svg",
      tag: task.id,
      requireInteraction: true,
    });
  }
};

export const shouldNotifyTask = (task) => {
  if (!task) {
    return false;
  }

  if (task.status === "completed") {
    return false;
  }

  const taskDateTime = new Date(
    `${task.date}T${task.time}`
  );

  const now = new Date();

  const difference =
    now.getTime() - taskDateTime.getTime();

  /*
   * Notify within a 60-second window
   */
  return difference >= 0 && difference <= 60000;
};

export const resetTaskNotification = (taskId) => {
  notifiedTasks.delete(taskId);
};