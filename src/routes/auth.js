const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const ActivityLog = require("../models/ActivityLog");
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

const refreshTokens = [];

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  console.log('Nhận yêu cầu đăng ký:', { username, role });

  const hash = await bcrypt.hash(password, 10);

  try {
    const user = new User({ username, password: hash, role });
    const savedUser = await user.save();
    console.log(' Lưu user thành công:', savedUser);
    res.json({ message: 'Đăng ký thành công' });
  } catch (err) {
    console.error(' Lỗi khi lưu user:', err.message);
    res.status(400).json({ message: 'Đăng ký thất bại', error: err.message });
  }
});


router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
  }
  // kiem tra mat khau
  const isMath = await bcrypt.compare(password, user.password);
  if (!isMath) 
    return res.status(401).json({ message: "Sai username hoặc password" });
  // ghi log
  await ActivityLog.create({
    userId: user._id,
    username: user.username,
    action: "Đăng nhập",
    role: user.role,
    ip: req.ip
  });
    const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  refreshTokens.push(refreshToken);

  res.json({ accessToken, refreshToken });
});

router.post('/refresh', (req, res) => {
  const { token } = req.body;
  if (!token || !refreshTokens.includes(token)) return res.sendStatus(403);

  jwt.verify(token, REFRESH_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);

    const accessToken = jwt.sign(
      { userId: payload.userId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ accessToken });
  });
});
router.get('/me', authenticate, (req,res)=>{
  const { username, role } = req.user;
  res.json({ username, role });
});
module.exports = router;
