// routes/device.js
const express = require("express");
const router = express.Router();
const Command = require("../models/Command");
const LightStatus = require("../models/LightStatus");
const LightDevice = require("../models/LightDevice");
const { authenticate } = require("../middleware/auth");

/* ============================
   API cho ESP32
============================ */

// ESP32 poll lệnh kế tiếp
router.get("/:deviceId/next-command", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const cmd = await Command.findOneAndUpdate(
      { deviceId, status: "pending" },
      { $set: { status: "sent", updatedAt: new Date() } },
      { sort: { createdAt: 1 }, new: true }
    );
    if (!cmd) return res.json({ ok: true, command: null });
    return res.json({ ok: true, command: cmd });
  } catch (err) {
    console.error("[GET /devices/:deviceId/next-command] error:", err);
    return res.status(500).json({ ok: false });
  }
});

// ESP32 báo cáo thực thi lệnh
router.post("/:deviceId/report", async (req, res) => {
  const { deviceId } = req.params;
  const { relay, rssi, commandId, status } = req.body;
  try {
    await LightStatus.findOneAndUpdate(
      { deviceId },
      { $set: { relay, rssi, lastUpdated: new Date() } },
      { upsert: true, new: true }
    );

    if (commandId) {
      await Command.findOneAndUpdate(
        { _id: commandId },
        { $set: { status: status === "ok" ? "done" : "failed", updatedAt: new Date() } }
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[POST /devices/:deviceId/report] error:", err);
    return res.status(500).json({ ok: false });
  }
});

/* ============================
   API cho User (CRUD + Control)
============================ */

// Lấy danh sách đèn kèm trạng thái
router.get("/", authenticate, async (req, res) => {
  try {
    const devices = await LightDevice.find({ user: req.user.userId, isDeleted: { $ne: true } });

    const statusList = await LightStatus.find({
      deviceId: { $in: devices.map((d) => d._id.toString()) },
    });

    const devicesWithStatus = devices.map((d) => {
      const st = statusList.find((s) => s.deviceId === d._id.toString());
      return {
        ...d.toObject(),
        relay: st?.relay || false,
        desired: st?.desired || false,
        lastUpdated: st?.lastUpdated || null,
      };
    });

    res.json({ ok: true, devices: devicesWithStatus });
  } catch (err) {
    console.error("[GET /devices] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Thêm đèn
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, location } = req.body;

    const newDevice = await LightDevice.create({
      name,
      location,
      user: req.user.userId,
      isDeleted: false,
    });

    await LightStatus.create({
      deviceId: newDevice._id.toString(),
      relay: false,
      desired: false,
    });

    res.json({ ok: true, device: newDevice });
  } catch (err) {
    console.error("[POST /devices] error:", err);
    res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
});

// Sửa thông tin đèn
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { name, location } = req.body;
    const updated = await LightDevice.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId, isDeleted: { $ne: true } },
      { $set: { name, location } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, device: updated });
  } catch (err) {
    console.error("[PUT /devices/:id] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Xoá đèn (chỉ đánh dấu)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const deleted = await LightDevice.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });

    res.json({ ok: true, message: "Marked as deleted", device: deleted });
  } catch (err) {
    console.error("[DELETE /devices/:id] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Bật/Tắt
router.post("/:id/toggle", authenticate, async (req, res) => {
  try {
    const { action } = req.body;
    const device = await LightDevice.findOne({ _id: req.params.id, user: req.user.userId, isDeleted: { $ne: true } });
    if (!device) return res.status(404).json({ ok: false, message: "Not found" });

    const cmd = await Command.create({
      deviceId: device._id.toString(),
      command: action,
      params: {},
      createdBy: req.user.userId,
      status: "pending",
    });

    await LightStatus.findOneAndUpdate(
      { deviceId: device._id.toString() },
      { $set: { desired: action === "ON", lastUpdated: new Date() } },
      { upsert: true }
    );

    if (req.io) req.io.emit("lightDesiredChanged", { deviceId: device._id.toString(), desired: action === "ON" });

    res.json({ ok: true, command: cmd });
  } catch (err) {
    console.error("[POST /devices/:id/toggle] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Độ sáng
router.post("/:id/brightness", authenticate, async (req, res) => {
  try {
    const { value } = req.body;
    const device = await LightDevice.findOne({ _id: req.params.id, user: req.user.userId, isDeleted: { $ne: true } });
    if (!device) return res.status(404).json({ ok: false, message: "Not found" });

    const cmd = await Command.create({
      deviceId: device._id.toString(),
      command: "BRIGHTNESS",
      params: { value },
      createdBy: req.user.userId,
      status: "pending",
    });

    if (req.io) req.io.emit("lightBrightnessDesired", { deviceId: device._id.toString(), value });

    res.json({ ok: true, command: cmd });
  } catch (err) {
    console.error("[POST /devices/:id/brightness] error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

module.exports = router;
