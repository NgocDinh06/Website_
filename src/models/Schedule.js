const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  startTime: { type: String, required: true },   // "HH:mm"
  endTime: { type: String, required: true },     // "HH:mm"
  action: { type: String, enum: ['on', 'off'], required: true },
  daysOfWeek: [{ type: Number }],                // 0 = CN, ..., 6 = T7
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('schedule', scheduleSchema);
