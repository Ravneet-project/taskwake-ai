const express = require("express");

const {
  addTask,
  getTasks,
  completeTask,
  deleteTask,
  autoRescheduleTasks,
} = require("../controllers/taskController");

const authMiddleware =
  require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| TASK ROUTES
|--------------------------------------------------------------------------
*/

router.post("/", addTask);

router.get("/", getTasks);

router.patch("/:id/complete", completeTask);

router.delete("/:id", deleteTask);

router.post(
  "/auto-reschedule",
  autoRescheduleTasks
);

module.exports = router;