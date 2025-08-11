const express = require('express');
const router = express.Router();
const LightStatus = require('../models/LightStatus');
const { authenticate, authorize } = require('../middleware/auth');

// Lấy trạng thái đèn hiện tại
router.get('/', async (req, res) => {
  try {
    let status = await LightStatus.findOne().sort({ updatedAt: -1 });
    if (!status) {
      status = new LightStatus({ isOn: false });
      await status.save();
    }
    res.json({ isOn: status.isOn });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lấy lịch sử trạng thái (dùng cho biểu đồ)
router.get('/history', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const history = await LightStatus.find().sort({ updatedAt: -1 }).limit(limit);
    res.json(history.reverse()); // đảo ngược để biểu đồ hiển thị từ cũ -> mới
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cập nhật trạng thái đèn (bật/tắt)

router.post('/', authenticate, authorize(['controller', 'admin']), async (req, res) => {
  try {
    const { isOn } = req.body;

    if (typeof isOn !== 'boolean') {
      return res.status(400).json({ message: 'Giá trị isOn không hợp lệ' });
    }

    const newStatus = new LightStatus({ isOn });
    await newStatus.save();

    console.log(`[Manual Toggle] Đèn ${isOn ? 'BẬT' : 'TẮT'} bởi ${req.user.role}`);

    // phát socket event cho client
    if (req.io) {
      req.io.emit('lightStatusUpdated', isOn);
    }

    res.json({ message: 'Cập nhật trạng thái thành công', isOn });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
