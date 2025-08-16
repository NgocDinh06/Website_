// src/routes/status.js
const express = require('express');
const router = express.Router();
const LightStatus = require('../models/LightStatus');
const Command = require('../models/Command');
const ActivityLog = require('../models/ActivityLog');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/status  -> lấy trạng thái thiết bị
router.get('/', authenticate, async (req, res) => {
  const deviceId = req.query.deviceId;
  try {
    const filter = deviceId ? { deviceId } : {};
    const statuses = await LightStatus.find(filter).sort({ deviceId: 1 });
    return res.json({ ok: true, data: statuses });
  } catch (err) {
    console.error('[GET /api/status] error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
});

// POST /api/status -> gửi lệnh bật/tắt/độ sáng
router.post('/', authenticate, async (req, res) => {
  const { deviceId, action, status } = req.body;
  try {
    const desired = action === 'ON' || status === true; // BRIGHTNESS sẽ xử lý ở ESP32 nếu bạn muốn
    const st = await LightStatus.findOneAndUpdate(
      { deviceId },
      { $set: { desired, lastUpdated: new Date() } },
      { upsert: true, new: true }
    );

    // Tạo command cho queue (ESP32 poll)
    const cmd = await Command.create({
      deviceId,
      command: action || (desired ? 'ON' : 'OFF'),
      createdBy: req.user?.userId,
      status: 'pending' // sửa đúng chính tả
    });

    // Ghi log
    await ActivityLog.create({
      userId: req.user.userId,
      username: req.user.username || req.user.userId,
      action: `Gửi lệnh ${action || (desired ? 'ON' : 'OFF')}`,
      role: req.user.role,
      ip: req.ip,
      meta: { deviceId, commandId: cmd._id.toString() }
    });

    // realtime cho client (nếu dùng websocket)
    if (req.io) req.io.emit('lightDesiredChanged', { deviceId, desired });

    return res.json({ ok: true, status: st });
  } catch (err) {
    console.error('[POST /api/status] error:', err);
    return res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
});

module.exports = router;
