const Device = require("../models/Device");
const Counter = require("../models/Counter");
const DeviceLog = require("../models/DeviceLog");
// Tạo thiết bị mới
exports.createDevice = async (req, res) => {
  try {
    // Lấy counter hiện tại
    let counter = await Counter.findOneAndUpdate(
      { name: "deviceId" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    const newDevice = new Device({
      deviceId: counter.value,
      name: req.body.name
    });

    await newDevice.save();
    res.status(201).json(newDevice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // kiểm tra tồn tại
    const device = await Device.findOne({ deviceId: Number(deviceId) });
    if (!device) return res.status(404).json({ message: "Device not found" });

    // ghi log
    const log = new DeviceLog({ deviceId: device.deviceId, action: "delete" });
    await log.save();

    res.json({ message: "Delete action logged successfully", log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};