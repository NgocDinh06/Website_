// ghi lai hanh dong cua thiet bi

const mongoose = require("mongoose");

const deviceLogSchema = new mongoose.Schema({
  deviceId: { type: Number, required: true },
  action: { type: String, enum: ["delete", "create", "update", "toggle"], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("DeviceLog", deviceLogSchema);