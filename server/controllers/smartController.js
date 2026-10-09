
const Task = require("../models/Task");

const { analyzeTasks } = require("../services/smartEngine");

/*
|--------------------------------------------------------------------------
| GET SMART PRODUCTIVITY INSIGHT
|--------------------------------------------------------------------------
*/

const getSmartInsight = async (req, res) => {
  try {
    const userId = String(req.user.id);

    // Fetch only logged-in user's tasks from MongoDB
    const userTasks = await Task.find({
      userId: userId,
    }).lean();

    // Analyze tasks using existing smart engine
    const insight = analyzeTasks(userTasks);

    return res.status(200).json({
      success: true,
      insight,
    });
  } catch (error) {
    console.error("Smart Insight Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate productivity insight",
    });
  }
};

module.exports = {
  getSmartInsight,
};
