// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const ActivityLog = require("../models/ActivityLog");

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

let refreshTokens = [];

// Đăng ký
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hash, role });
    await user.save();
    res.json({ message: 'Đăng ký thành công' });
  } catch (err) {
    res.status(400).json({ message: 'Đăng ký thất bại', error: err.message });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

  // ghi log
  await ActivityLog.create({
    userId: user._id,
    username: user.username,
    action: "Đăng nhập",
    role: user.role,
    ip: req.ip
  });

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  refreshTokens.push(refreshToken);

  // Trả về token để frontend lưu
  res.json({ accessToken, refreshToken });
});

// Refresh token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ message: "Refresh token không hợp lệ" });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: "Refresh token hết hạn" });

    const accessToken = jwt.sign(
      { userId: payload.userId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  });
});

// Lấy thông tin user
router.get('/me', authenticate, (req, res) => {
  res.json({ userId: req.user.userId, role: req.user.role, username: req.user.username });
});

module.exports = router;
