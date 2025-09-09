const mongoose = require("mongoose");

const LightDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  gps: {
    lat: { type: Number, default: null },
    lon: { type: Number, default: null }
  }, // MAC address chính là deviceId
  name: { type: String, required: true },
  location: { type: String, default: "" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  isDeleted: { type: Boolean, default: false },
  isAssigned: { type: Boolean, default: true }
}, { timestamps: true });

// Index đảm bảo tên không trùng trong 1 user (nếu cần)
LightDeviceSchema.index(
  { name: 1, user: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

module.exports = mongoose.model("LightDevice", LightDeviceSchema);
