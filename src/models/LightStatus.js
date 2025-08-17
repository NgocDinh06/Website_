const mongoose = require('mongoose');

const lightStatusSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  relay: { type: Boolean, default: false },   // trạng thái thực tế của relay
  desired: { type: Boolean, default: false }, // trạng thái mong muốn (ON/OFF)
  rssi: { type: Number },                     // tín hiệu WiFi từ ESP32
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// collection = relay_data
module.exports = mongoose.model('LightStatus', lightStatusSchema, 'relay_data');
