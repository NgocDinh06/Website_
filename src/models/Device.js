const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  deviceId: { type: Number, unique: true }, // id tự tăng
  name: { type: String, required: true },
  status: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Device", deviceSchema);