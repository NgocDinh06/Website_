const mongoose = require('mongoose');

const lightStatusSchema = new mongoose.Schema({
  deviceId: {type: String, required: true, index: true },
  relay: { type: Boolean, default: false },
  desired: { type: Boolean, default: false },// trang thai mong muon
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('iot_system', lightStatusSchema, 'relay_data');
