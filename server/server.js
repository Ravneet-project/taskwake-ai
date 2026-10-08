
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const smartRoutes = require("./routes/smartRoutes");
const mailRoutes = require("./routes/mailRoutes");

const authMiddleware = require("./middleware/authMiddleware");
const notificationRoutes = require("./routes/notificationRoutes");
const { readData } = require("./utils/db");
const { startScheduler } = require("./services/reminderEngine");

const app = express();

app.use(cors({
  origin: [
    "https://ravneet-project.github.io",
    "https://taskwake-ai.netlify.app",
    "http://localhost:5173"
  ]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TaskWake AI API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/smart", smartRoutes);
app.use("/api/mail", mailRoutes);
app.use(
  "/api/notifications",
  authMiddleware,
  notificationRoutes()
);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

module.exports = app;

// Only start a persistent server locally.
// Netlify Functions must not start app.listen().
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    startScheduler({
      listTasks: async () => readData("tasks.json"),
      findUser: async (id) =>
        (readData("users.json") || []).find(
          (u) => String(u.id ?? u._id) === String(id)
        ),
    });
  });
}
