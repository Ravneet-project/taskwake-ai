
const mongoose = require("mongoose");

const reminderStateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: "global",
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    deliveries: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    inbox: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model(
  "ReminderState",
  reminderStateSchema
);
