// const express = require('express');
// const router = express.Router();
// const LightStatus = require('../models/LightStatus');
// const Command = require('../models/Command');
// const  ActivityLog = require('../models/ActivityLog');
// const { authenticate, authorize } = require('../middleware/auth');

// // Lấy trạng thái đèn hiện tại
// router.get('/', async (req, res) => {
//   try {
//     let status = await LightStatus.findOne().sort({ updatedAt: -1 });
//     if (!status) {
//       status = new LightStatus({ isOn: false });
//       await status.save();
//     }
//     res.json({ isOn: status.isOn });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Lấy lịch sử trạng thái (dùng cho biểu đồ)
// router.get('/history', async (req, res) => {
//   const limit = parseInt(req.query.limit) || 20;
//   try {
//     const history = await LightStatus.find().sort({ updatedAt: -1 }).limit(limit);
//     res.json(history.reverse()); // đảo ngược để biểu đồ hiển thị từ cũ -> mới
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Cập nhật trạng thái đèn (bật/tắt)

// router.post('/', authenticate, authorize(['controller', 'admin']), async (req, res) => {
//   try {
//     const { isOn } = req.body;

//     if (typeof isOn !== 'boolean') {
//       return res.status(400).json({ message: 'Giá trị isOn không hợp lệ' });
//     }

//     const newStatus = new LightStatus({ isOn });
//     await newStatus.save();

//     console.log(`[Manual Toggle] Đèn ${isOn ? 'BẬT' : 'TẮT'} bởi ${req.user.role}`);

//     // phát socket event cho client
//     if (req.io) {
//       req.io.emit('lightStatusUpdated', isOn);
//     }

//     res.json({ message: 'Cập nhật trạng thái thành công', isOn });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;



const express = require('express');
const router = express.Router();
const LightStatus = require('../models/LightStatus');
const Command = require('../models/Command');
const ActivityLog = require('../models/ActivityLog');
const { authenticate, authorize } = require('../middleware/auth');


// lay trang thai thiet bi
router.get('/status', authenticate, async (req,res) =>{
  const deviceId = req.query.deviceId;
  try {
    const filter = deviceId ? { deviceId } : {};
    const statuses = await LightStatus.find(filter).sort({ deviceId: 1 });
    res.json({ ok: true, data: statuses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Lỗi server'});

  }
});


// gui lenh bat/ tat 


router.post('/status', authenticate, async (req, res) => {
  const { deviceId, action, status } = req.body;
  try {
    const desired = (action ==='ON') || (status === true);
    const st  = await LightStatus.findOneAndUpdate(
      {deviceId },
      { $set: { desired, lastUpdated: new Date() } },
      { upsert: true, new: true }
    );

    // tao command de esp32 poll
    await Command.create({
      deviceId,
      command: action || (desired ? 'ON' : 'OFF'),
      createBy: req.user && req.user.userId
    });

    // ghi log hanh dong
    await ActivityLog.create({
      userId: req.user.userId,
      username: req.user.username || req.user.userId,
      action : `Gửi lệnh ${action || (desired ? 'ON' : 'OFF')}`,
      role: req.user.role,
      ip: req.ip,
      meta: { deviceId}
    });
    res.json({ ok:true, status: st });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Lỗi server'});
  }
});

module.exports = router;
