const { readData } = require("../utils/db");

const {
  analyzeTasks,
} = require("../services/smartEngine");

const getSmartInsight = (req, res) => {
  try {
    const allTasks = readData("tasks.json");

    const userTasks = allTasks.filter(
      (task) => task.userId === req.user.id
    );

    const insight =
      analyzeTasks(userTasks);

    return res.status(200).json({
      success: true,
      insight,
    });
  } catch (error) {
    console.error(
      "Smart Insight Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate productivity insight",
    });
  }
};

module.exports = {
  getSmartInsight,
};