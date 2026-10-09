
const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID,
      unique: true,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      default: "medium",
    },
    status: {
      type: String,
      default: "pending",
    },
    missedCount: {
      type: Number,
      default: 0,
    },
    carriedForward: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

taskSchema.index({ userId: 1, date: 1, time: 1 });

module.exports = mongoose.model("Task", taskSchema);
