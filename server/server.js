const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

/* EXISTING ROUTES */
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const smartRoutes = require("./routes/smartRoutes");
const mailRoutes = require("./routes/mailRoutes");

/* STEP 17 ROUTES + EXISTING AUTH */
const authMiddleware = require("./middleware/authMiddleware");
const notificationRoutes = require("./routes/notificationRoutes");
const { readData } = require("./utils/db");
const { startScheduler } = require("./services/reminderEngine");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ success: true, message: "TaskWake AI API is running", database: "Local JSON Database", reminderEngine: "Step 17 scheduler configured" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/smart", smartRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes());

app.use((req, res) => res.status(404).json({ success: false, message: "API route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Local JSON database ready");
  // Only ONE scheduler: replaces the old reminderScheduler start call.
  // Task/user files are the same JSON stores used by your existing scheduler.
  startScheduler({
    listTasks: async () => readData("tasks.json"),
    findUser: async (id) => (readData("users.json") || []).find((u) => String(u.id ?? u._id) === String(id)),
  });
  console.log("TaskWake Step 17 reminder scheduler started");
});
