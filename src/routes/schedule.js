const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// Thêm lịch
router.post('/', async (req, res) => {
  try {
    const { startTime, endTime, action, daysOfWeek } = req.body;
    if (!startTime || !endTime || !action || !Array.isArray(daysOfWeek)) {
      return res.status(400).json({ message: 'Thiếu thông tin' });
    }

    const newSchedule = new Schedule({ startTime, endTime, action, daysOfWeek });
    await newSchedule.save();
    res.status(201).json({ message: 'Lịch đã lưu', schedule: newSchedule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xem tất cả lịch
router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ createdAt: -1 });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xóa lịch
router.delete('/:id', async (req, res) => {
  try {
    const result = await Schedule.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Không tìm thấy lịch để xóa' });
    }
    res.json({ message: 'Đã xóa lịch thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
