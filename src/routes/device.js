// const express = require("express");
// const router = express.Router();
// const Command = require("../models/Command");
// const LightStatus = require("../models/LightStatus");
// const LightDevice = require("../models/LightDevice");
// const { authenticate } = require("../middleware/auth");

// /* ============================
//    API cho ESP32 (Gateway/Node)
// ============================ */

// // ESP32 đăng ký thiết bị mới (theo MAC)
// router.post("/register", async (req, res) => {
//     try {
//         const { mac, seq } = req.body;
//         if (!mac || !/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(mac)) {
//             return res.status(400).json({ ok: false, message: "Invalid MAC address" });
//         }
//         const normalizedMac = mac.toUpperCase();

//         let device = await LightDevice.findOne({ deviceId: normalizedMac });
//         let isAssigned = false;
//         if (!device) {
//             device = await LightDevice.create({
//                 deviceId: normalizedMac,
//                 name: `Device-${normalizedMac}`,
//                 location: "",
//                 user: null,
//                 isDeleted: false,
//                 isAssigned: false // Sửa từ isAssignedf
//             });
//             await LightStatus.create({
//                 deviceId: device.deviceId,
//                 relay: false,
//                 desired: false,
//                 brightness: 50,
//             });
//             console.log(`[REGISTER] New device created: ${normalizedMac}`);
//         } else {
//             isAssigned = device.user !== null;
//             console.log(`[REGISTER] Device already exists: ${normalizedMac}, isAssigned: ${isAssigned}`);
//         }

//         const response = { ok: true, deviceId: normalizedMac, isAssigned };
//         console.log(`[REGISTER] Sending: ${JSON.stringify(response)}`);
//         return res.status(200).json(response);
//     } catch (err) {
//         console.error("[POST /devices/register] error:", err.message);
//         return res.status(500).json({ ok: false, message: "Server error" });
//     }
// });

// // ESP32 poll lệnh kế tiếp
// router.get("/:deviceId/next-command", async (req, res) => {
//   try {
//     const { deviceId } = req.params;
//     const cmd = await Command.findOneAndUpdate(
//       { deviceId, status: "pending" },
//       { $set: { status: "sent", updatedAt: new Date() } },
//       { sort: { createdAt: 1 }, new: true }
//     );

//     return res.json({ ok: true, command: cmd || null });
//   } catch (err) {
//     console.error("[GET /devices/:deviceId/next-command] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// // ESP32 báo cáo thực thi lệnh
// router.post("/report", async (req, res) => {
//   try {
//     const { mac, cmd, brightness, commandId } = req.body;
//     const device = await LightDevice.findOne({ deviceId: mac });

//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Device not found" });
//     }

//     await LightStatus.findOneAndUpdate(
//       { deviceId: mac },
//       { $set: { relay: cmd !== 0, brightness, lastUpdated: new Date() } },
//       { upsert: true, new: true }
//     );

//     if (commandId) {
//       await Command.findByIdAndUpdate(commandId, {
//         $set: { status: "done", updatedAt: new Date() }
//       });
//     }

//     return res.json({ ok: true });
//   } catch (err) {
//     console.error("[POST /devices/report] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// /* ============================
//    API cho User (CRUD + Control)
// ============================ */

// // Lấy danh sách thiết bị chưa gán
// router.get("/pending", authenticate, async (req, res) => {
//   try {
//     const devices = await LightDevice.find({ user: null, isDeleted: { $ne: true } });
//     return res.json({ ok: true, devices });
//   } catch (err) {
//     console.error("[GET /devices/pending] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// // Lấy danh sách đèn kèm trạng thái
// router.get("/", authenticate, async (req, res) => {
//   try {
//     const devices = await LightDevice.find({ user: req.user.userId, isDeleted: { $ne: true } });
//     const statusList = await LightStatus.find({
//       deviceId: { $in: devices.map((d) => d.deviceId) },
//     });

//     const devicesWithStatus = devices.map((d) => {
//       const st = statusList.find((s) => s.deviceId === d.deviceId);
//       return {
//         ...d.toObject(),
//         relay: st?.relay || false,
//         desired: st?.desired || false,
//         brightness: st?.brightness || 50,
//         lastUpdated: st?.lastUpdated || null,
//       };
//     });

//     return res.json({ ok: true, devices: devicesWithStatus });
//   } catch (err) {
//     console.error("[GET /devices] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// // Thêm đèn (gán thiết bị cho user)
// router.post("/", authenticate, async (req, res) => {
//   try {
//     const { name, location, mac } = req.body;
//     if (!name || !mac) {
//       return res.status(400).json({ ok: false, message: "Name and MAC required" });
//     }

//     const normalizedMac = mac.toUpperCase();
//     if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(normalizedMac)) {
//       return res.status(400).json({ ok: false, message: "Invalid MAC format" });
//     }

//     let device = await LightDevice.findOne({ deviceId: normalizedMac, isDeleted: { $ne: true } });
//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Device not found" });
//     }
//     if (device.user) {
//       return res.status(400).json({ ok: false, message: "Device already assigned" });
//     }

//     device = await LightDevice.findOneAndUpdate(
//       { deviceId: normalizedMac },
//       { $set: { name, location, user: req.user.userId } },
//       { new: true }
//     );

//     if (req.io) {
//       req.io.emit("device_assigned", { mac: normalizedMac });
//     }

//     return res.json({ ok: true, device });
//   } catch (err) {
//     console.error("[POST /devices] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// // Sửa thông tin đèn
// router.put("/:id", authenticate, async (req, res) => {
//   try {
//     const { name, location } = req.body;
//     const updated = await LightDevice.findOneAndUpdate(
//       { _id: req.params.id, user: req.user.userId, isDeleted: { $ne: true } },
//       { $set: { name, location } },
//       { new: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ ok: false, message: "Not found" });
//     }

//     return res.json({ ok: true, device: updated });
//   } catch (err) {
//     console.error("[PUT /devices/:id] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// // Xoá đèn (soft delete)
// router.delete("/:id", authenticate, async (req, res) => {
//   try {
//     const deleted = await LightDevice.findOneAndUpdate(
//       { _id: req.params.id, user: req.user.userId },
//       { $set: { isDeleted: true } },
//       { new: true }
//     );

//     if (!deleted) {
//       return res.status(404).json({ ok: false, message: "Not found" });
//     }

//     return res.json({ ok: true, message: "Marked as deleted", device: deleted });
//   } catch (err) {
//     console.error("[DELETE /devices/:id] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// // Bật/Tắt
// router.post("/:id/toggle", authenticate, async (req, res) => {
//   try {
//     const { action } = req.body;
//     const device = await LightDevice.findOne({
//       _id: req.params.id,
//       user: req.user.userId,
//       isDeleted: { $ne: true },
//     });

//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Not found" });
//     }

//     const cmd = await Command.create({
//       deviceId: device.deviceId,
//       command: action,
//       params: {},
//       createdBy: req.user.userId,
//       status: "pending",
//     });

//     await LightStatus.findOneAndUpdate(
//       { deviceId: device.deviceId },
//       { $set: { desired: action === "ON", lastUpdated: new Date() } },
//       { upsert: true }
//     );

//     if (req.io) {
//       req.io.emit("lightDesiredChanged", { deviceId: device.deviceId, desired: action === "ON" });
//     }

//     return res.json({ ok: true, command: cmd });
//   } catch (err) {
//     console.error("[POST /devices/:id/toggle] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// // Đặt độ sáng
// router.post("/:id/brightness", authenticate, async (req, res) => {
//   try {
//     const { value } = req.body;
//     if (typeof value !== "number" || value < 0 || value > 100) {
//       return res.status(400).json({ ok: false, message: "Invalid brightness" });
//     }

//     const device = await LightDevice.findOne({
//       _id: req.params.id,
//       user: req.user.userId,
//       isDeleted: { $ne: true },
//     });

//     if (!device) {
//       return res.status(404).json({ ok: false, message: "Not found" });
//     }

//     const cmd = await Command.create({
//       deviceId: device.deviceId,
//       command: "BRIGHTNESS",
//       params: { value },
//       createdBy: req.user.userId,
//       status: "pending",
//     });

//     await LightStatus.findOneAndUpdate(
//       { deviceId: device.deviceId },
//       { $set: { brightness: value, lastUpdated: new Date() } },
//       { upsert: true }
//     );

//     if (req.io) {
//       req.io.emit("lightBrightnessDesired", { deviceId: device.deviceId, value });
//     }

//     return res.json({ ok: true, command: cmd });
//   } catch (err) {
//     console.error("[POST /devices/:id/brightness] error:", err.message);
//     return res.status(500).json({ ok: false, message: "Server error" });
//   }
// });

// module.exports = router;



const express = require("express");
const router = express.Router();
const Command = require("../models/Command");
const LightStatus = require("../models/LightStatus");
const LightDevice = require("../models/LightDevice");
const { authenticate } = require("../middleware/auth");

router.post("/register", async (req, res) => {
  try {
    const { mac } = req.body;
    if (!mac || !/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(mac)) {
      return res.status(400).json({ ok: false, message: "Invalid MAC address" });
    }
    const normalizedMac = mac.toUpperCase();
    let device = await LightDevice.findOne({ deviceId: normalizedMac });
    if (!device) {
      device = await LightDevice.create({
        deviceId: normalizedMac,
        name: `Device-${normalizedMac}`,
        location: "",
        user: null,
        isDeleted: false,
      });
      await LightStatus.create({
        deviceId: device.deviceId,
        relay: false,
        desired: false,
        brightness: 50, // Thêm brightness
      });
    }
    const response = { ok: true, deviceId: device.deviceId, isAssigned: device.user !== null };
    res.status(200).json(response);
    res.end();
    console.log(`[POST /devices/register] Sent response: ${JSON.stringify(response)}`);
  } catch (err) {
    console.error("[POST /devices/register] error:", err.message);
    res.status(500).json({ ok: false, message: "Server error" });
    res.end();
  }
});

router.get("/pending", authenticate, async (req, res) => {
  try {
    const devices = await LightDevice.find({ user: null, isDeleted: { $ne: true } });
    res.json({ ok: true, devices });
    res.end();
    console.log(`[GET /devices/pending] Sent response: ${JSON.stringify({ ok: true, devices })}`);
  } catch (err) {
    console.error("[GET /devices/pending] error:", err.message);
    res.status(500).json({ ok: false, message: "Lỗi khi lấy danh sách thiết bị chờ" });
    res.end();
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { name, location, mac } = req.body;
    if (!name || !mac) {
      return res.status(400).json({ ok: false, message: "Name and MAC required" });
    }
    const normalizedMac = mac.toUpperCase();
    if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(normalizedMac)) {
      return res.status(400).json({ ok: false, message: "Invalid MAC format" });
    }
    let device = await LightDevice.findOne({ deviceId: normalizedMac, isDeleted: { $ne: true } });
    if (!device) {
      return res.status(404).json({ ok: false, message: "Device not found" });
    }
    if (device.user) {
      return res.status(400).json({ ok: false, message: "Device already assigned" });
    }
    device = await LightDevice.findOneAndUpdate(
      { deviceId: normalizedMac },
      { $set: { name, location, user: req.user.userId } },
      { new: true }
    );
    res.json({ ok: true, device });
    res.end();
    console.log(`[POST /devices] Added device: ${JSON.stringify(device)}`);
  } catch (err) {
    console.error("[POST /devices] error:", err.message);
    res.status(500).json({ ok: false, message: "Lỗi khi thêm thiết bị" });
    res.end();
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const devices = await LightDevice.find({ user: req.user.userId, isDeleted: { $ne: true } });
    const lightStatuses = await LightStatus.find({
      deviceId: { $in: devices.map((d) => d.deviceId) },
    });
    const devicesWithStatus = devices.map((device) => {
      const status = lightStatuses.find((s) => s.deviceId === device.deviceId) || {
        relay: false,
        brightness: 50,
      };
      return {
        _id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        location: device.location || "",
        relay: status.relay,
        brightness: status.brightness || 50,
      };
    });
    const response = { ok: true, devices: devicesWithStatus };
    res.json(response);
    res.end();
    console.log(`[GET /devices] Sent response: ${JSON.stringify(response)}`);
  } catch (err) {
    console.error("[GET /devices] error:", err.message);
    res.status(500).json({ ok: false, message: "Lỗi khi lấy danh sách thiết bị" });
    res.end();
  }
});

router.post("/:id/toggle", authenticate, async (req, res) => {
  try {
    const { action } = req.body;
    const device = await LightDevice.findOne({
      _id: req.params.id,
      user: req.user.userId,
      isDeleted: { $ne: true },
    });
    if (!device) return res.status(404).json({ ok: false, message: "Not found" });
    const cmd = await Command.create({
      deviceId: device.deviceId,
      command: action,
      params: {},
      createdBy: req.user.userId,
      status: "pending",
    });
    await LightStatus.findOneAndUpdate(
      { deviceId: device.deviceId },
      { $set: { desired: action === "ON", lastUpdated: new Date() } },
      { upsert: true }
    );
    const response = { ok: true, command: cmd };
    res.json(response);
    res.end();
    console.log(`[POST /devices/:id/toggle] Created command: ${JSON.stringify(response)}`);
  } catch (err) {
    console.error("[POST /devices/:id/toggle] error:", err.message);
    res.status(500).json({ ok: false, message: "Lỗi khi tạo lệnh" });
    res.end();
  }
});

router.get("/:deviceId/next-command", async (req, res) => {
  try {
    const cmd = await Command.findOneAndUpdate(
      { deviceId: req.params.deviceId, status: "pending" },
      { $set: { status: "sent", updatedAt: new Date() } },
      { sort: { createdAt: 1 }, new: true }
    );
    const response = { ok: true, command: cmd || null };
    res.json(response);
    res.end();
    console.log(`[GET /devices/:deviceId/next-command] Sent response: ${JSON.stringify(response)}`);
  } catch (err) {
    console.error("[GET /devices/:deviceId/next-command] error:", err.message);
    res.status(500).json({ ok: false, message: "Lỗi khi lấy lệnh" });
    res.end();
  }
});

router.post("/report", async (req, res) => {
  try {
    const { mac, cmd, commandId } = req.body;
    const deviceId = mac.toUpperCase();
    await LightStatus.findOneAndUpdate(
      { deviceId },
      { $set: { relay: cmd === 1, lastUpdated: new Date() } },
      { upsert: true }
    );
    if (commandId) {
      await Command.findOneAndUpdate(
        { _id: commandId },
        { $set: { status: "done", updatedAt: new Date() } }
      );
    }
    res.json({ ok: true });
    res.end();
    console.log(`[POST /devices/report] Processed report for ${deviceId}`);
  } catch (err) {
    console.error("[POST /devices/report] error:", err.message);
    res.status(500).json({ ok: false, message: "Lỗi khi xử lý báo cáo" });
    res.end();
  }
});

module.exports = router;