// models/LightDevice.js
const mongoose = require("mongoose");

const LightDeviceSchema = new mongoose.Schema({
  name: { type: String, required: true }, // bỏ unique ở đây để tránh xung đột index
  location: { type: String, default: "" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Index đảm bảo tên là duy nhất với các device chưa bị xóa
LightDeviceSchema.index(
  { name: 1, user: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

module.exports = mongoose.model("LightDevice", LightDeviceSchema);