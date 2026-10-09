
const Task = require("../models/Task");

const addTask = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      priority,
    } = req.body || {};

    if (!title || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Title, date and time are required",
      });
    }

    const task = await Task.create({
      userId: String(req.user.id),
      title,
      description: description || "",
      date,
      time,
      priority: priority || "medium",
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Add Task Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create task",
    });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: String(req.user.id),
    })
      .sort({ date: 1, time: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Get Tasks Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch tasks",
    });
  }
};

const completeTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      {
        id: req.params.id,
        userId: String(req.user.id),
      },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task completed 🎉",
      task,
    });
  } catch (error) {
    console.error("Complete Task Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to complete task",
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      id: req.params.id,
      userId: String(req.user.id),
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete Task Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete task",
    });
  }
};

const autoRescheduleTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: String(req.user.id),
      status: { $ne: "completed" },
    });

    const now = new Date();
    let rescheduledCount = 0;

    for (const task of tasks) {
      const taskDateTime = new Date(
        `${task.date}T${task.time}`
      );

      if (
        Number.isNaN(taskDateTime.getTime()) ||
        taskDateTime >= now
      ) {
        continue;
      }

      const nextDate = new Date(
        `${task.date}T12:00:00Z`
      );

      if (Number.isNaN(nextDate.getTime())) {
        continue;
      }

      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      task.date = nextDate.toISOString().split("T")[0];
      task.missedCount = (task.missedCount || 0) + 1;
      task.carriedForward = true;

      if (task.missedCount >= 2) {
        task.priority = "high";
      }

      await task.save();
      rescheduledCount++;
    }

    return res.status(200).json({
      success: true,
      message: `${rescheduledCount} task(s) automatically rescheduled`,
      rescheduledCount,
    });
  } catch (error) {
    console.error("Reschedule Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reschedule tasks",
    });
  }
};

module.exports = {
  addTask,
  getTasks,
  completeTask,
  deleteTask,
  autoRescheduleTasks,
};
