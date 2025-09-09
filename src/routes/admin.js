const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

router.post("/create-user", authenticate, authorize(["admin"]), async (req, res) => {
  const { firstName, lastName, email, contact, address1, username, password, role } = req.body;

  if (!firstName || !lastName || !email || !contact || !address1 || !username || !password || !role) {
    return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }, { contact }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(409).json({ message: "Tên tài khoản đã tồn tại" });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ message: "Email đã tồn tại" });
      }
      if (existingUser.contact === contact) {
        return res.status(409).json({ message: "Số điện thoại đã tồn tại" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      contact,
      address1,
      username,
      password: hashedPassword,
      role,
    });

    await newUser.save();
    res.status(201).json({ message: "Tạo tài khoản thành công", user: { username, role } });
  } catch (err) {
    console.error("[POST /admin/create-user] error:", err.message);
    res.status(500).json({ message: "Lỗi server khi tạo tài khoản" });
  }
});

router.get("/users", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Ẩn password
    res.json(users);
  } catch (err) {
    console.error("[GET /admin/users] error:", err.message);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách người dùng" });
  }
});

module.exports = router;