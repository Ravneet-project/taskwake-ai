const { randomUUID } = require("crypto");

const createTask = ({
  userId,
  title,
  description,
  date,
  time,
  priority = "medium",
}) => {
  return {
    id: randomUUID(),
    userId,
    title,
    description: description || "",
    date,
    time,
    priority,
    status: "pending",

    missedCount: 0,
    carriedForward: false,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

module.exports = {
  createTask,
};