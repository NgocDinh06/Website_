const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// Tạo tài khoản mới (chỉ admin)
router.post('/create-user', authenticate, authorize(['admin']), async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Thiếu thông tin username, password hoặc role' });
    }

    try {
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(409).json({ message: 'Username đã tồn tại' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword,
            role
        });

        await newUser.save();
        res.status(201).json({ message: 'Tạo tài khoản thành công', user: { username, role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server khi tạo tài khoản' });
    }
});
router.get('/users',authenticate, authorize(['admin']), async (req, res)=>{
    try {
        const users = await User.find().select('-password'); // Ẩn password
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng'});
    }
});
module.exports = router;
