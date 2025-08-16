const mongoose = require('mongoose');

const lightDeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String },
  loraNodeId: { type: String, required: true }, 
  status: { type: String, enum: ["ON", "OFF"], default: "OFF" },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('iot_system', lightStatusSchema, 'relay_data');
