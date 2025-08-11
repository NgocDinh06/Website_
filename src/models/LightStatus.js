const mongoose = require('mongoose');

const lightStatusSchema = new mongoose.Schema({
  isOn: { type: Boolean, required: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('iot_system', lightStatusSchema, 'relay_data');
