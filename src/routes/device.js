// src/routes/device.js
const express = require("express");
const router = express.Router();
const Command = require("../models/Command");
const LightStatus = require("../models/LightStatus");
const LightDevice = require("../models/LightDevice");
const { authenticate } = require("../middleware/auth");

// =====================
// API cho ESP32
// =====================

// ESP32 lấy lệnh kế tiếp
router.get("/:deviceId/next-command", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const cmd = await Command.findOneAndUpdate(
      { deviceId, status: "pending" }, // status chuẩn là "pending"
      { $set: { status: "sent", updatedAt: new Date() } },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!cmd) return res.json({ ok: true, command: null });
    return res.json({ ok: true, command: cmd });
  } catch (err) {
    console.error("[GET /device/:id/next-command] error:", err);
    return res.status(500).json({ ok: false });
  }
});

// ESP32 báo cáo thực thi
router.post("/:deviceId/report", async (req, res) => {
  const { deviceId } = req.params;
  const { relay, rssi, commandId, status } = req.body; // status: 'ok' | 'error'
  try {
    await LightStatus.findOneAndUpdate(
      { deviceId },
      { $set: { relay, rssi, lastUpdated: new Date() } },
      { upsert: true, new: true }
    );

    if (commandId) {
      await Command.findOneAndUpdate(
        { _id: commandId },
        {
          $set: {
            status: status === "ok" ? "done" : "failed",
            updatedAt: new Date(),
          },
        }
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[POST /device/:id/report] error:", err);
    return res.status(500).json({ ok: false });
  }
});

// =====================
// API cho User (CRUD Device)
// =====================

// Lấy danh sách đèn của user
router.get("/", authenticate, async (req, res) => {
  try {
    const devices = await LightDevice.find({ user: req.user.userId });
    res.json({ ok: true, devices });
  } catch (err) {
    console.error("[GET /devices] error:", err);
    res.status(500).json({ ok: false });
  }
});

// Thêm đèn mới
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, location } = req.body;
    const newDevice = new LightDevice({
      name,
      location,
      user: req.user.userId,
    });
    await newDevice.save();
    res.json({ ok: true, device: newDevice });
  } catch (err) {
    console.error("[POST /devices] error:", err);
    res.status(500).json({ ok: false });
  }
});

// Cập nhật thông tin đèn
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { name, location } = req.body;
    const updated = await LightDevice.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { $set: { name, location } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, device: updated });
  } catch (err) {
    console.error("[PUT /devices/:id] error:", err);
    res.status(500).json({ ok: false });
  }
});

// Xoá đèn
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const deleted = await LightDevice.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, message: "Deleted" });
  } catch (err) {
    console.error("[DELETE /devices/:id] error:", err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
