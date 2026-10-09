
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const smartRoutes = require("./routes/smartRoutes");
const mailRoutes = require("./routes/mailRoutes");

const authMiddleware = require("./middleware/authMiddleware");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

const allowedOrigins = [
  "https://ravneet-project.github.io",
  "https://taskwake-ai.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const healthCheck = (req, res) => {
  res.json({
    success: true,
    message: "TaskWake AI API is running",
  });
};

app.get("/", healthCheck);
app.get("/api", healthCheck);
app.get("/api/health", healthCheck);

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
    message: "API route not found",
    path: req.path,
  });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  const startServer = async () => {
    try {
      await connectDB();

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log("TaskWake AI backend started");
      });

      // Reminder scheduler will be enabled after
      // migrating its JSON storage to MongoDB.

    } catch (error) {
      console.error("Server startup failed:", error.message);
      process.exit(1);
    }
  };

  startServer();
}
