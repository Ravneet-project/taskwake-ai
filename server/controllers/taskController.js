const { readData, writeData } = require("../utils/db");
const { createTask } = require("../models/Task");

/*
|--------------------------------------------------------------------------
| CREATE TASK
|--------------------------------------------------------------------------
*/

const addTask = (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      priority,
    } = req.body;

    if (!title || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Title, date and time are required",
      });
    }

    const tasks = readData("tasks.json");

    const newTask = createTask({
      userId: req.user.id,
      title,
      description,
      date,
      time,
      priority,
    });

    tasks.push(newTask);

    writeData("tasks.json", tasks);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: newTask,
    });

  } catch (error) {
    console.error("Add Task Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create task",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET USER TASKS
|--------------------------------------------------------------------------
*/

const getTasks = (req, res) => {
  try {
    let tasks = readData("tasks.json");

    tasks = tasks.filter(
      task => task.userId === req.user.id
    );

    tasks.sort((a, b) => {
      const first = new Date(`${a.date}T${a.time}`);
      const second = new Date(`${b.date}T${b.time}`);

      return first - second;
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch tasks",
    });
  }
};


/*
|--------------------------------------------------------------------------
| COMPLETE TASK
|--------------------------------------------------------------------------
*/

const completeTask = (req, res) => {
  try {
    const tasks = readData("tasks.json");

    const taskIndex = tasks.findIndex(
      task =>
        task.id === req.params.id &&
        task.userId === req.user.id
    );

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    tasks[taskIndex].status = "completed";
    tasks[taskIndex].completedAt =
      new Date().toISOString();

    tasks[taskIndex].updatedAt =
      new Date().toISOString();

    writeData("tasks.json", tasks);

    return res.status(200).json({
      success: true,
      message: "Task completed 🎉",
      task: tasks[taskIndex],
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to complete task",
    });
  }
};


/*
|--------------------------------------------------------------------------
| DELETE TASK
|--------------------------------------------------------------------------
*/

const deleteTask = (req, res) => {
  try {
    const tasks = readData("tasks.json");

    const task = tasks.find(
      item =>
        item.id === req.params.id &&
        item.userId === req.user.id
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const updatedTasks = tasks.filter(
      item => item.id !== req.params.id
    );

    writeData("tasks.json", updatedTasks);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to delete task",
    });
  }
};


/*
|--------------------------------------------------------------------------
| AUTO RESCHEDULE MISSED TASKS
|--------------------------------------------------------------------------
*/

const autoRescheduleTasks = (req, res) => {
  try {

    const tasks = readData("tasks.json");

    const now = new Date();

    let rescheduledCount = 0;

    tasks.forEach(task => {

      if (
        task.userId !== req.user.id ||
        task.status === "completed"
      ) {
        return;
      }

      const taskDateTime = new Date(
        `${task.date}T${task.time}`
      );

      if (taskDateTime < now) {

        const nextDate = new Date(taskDateTime);

        nextDate.setDate(
          nextDate.getDate() + 1
        );

        task.date = nextDate
          .toISOString()
          .split("T")[0];

        task.missedCount =
          (task.missedCount || 0) + 1;

        task.carriedForward = true;

        /*
        |--------------------------------------------------------------------------
        | SMART PRIORITY
        |--------------------------------------------------------------------------
        */

        if (task.missedCount >= 2) {
          task.priority = "high";
        }

        task.updatedAt =
          new Date().toISOString();

        rescheduledCount++;
      }
    });

    writeData("tasks.json", tasks);

    return res.status(200).json({
      success: true,
      message: `${rescheduledCount} task(s) automatically rescheduled`,
      rescheduledCount,
    });

  } catch (error) {

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