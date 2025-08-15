const express = require('express');
const router = express. Router();
const Command = require('../models/Command');
const LightStatus = require('../models/LightStatus');

// ESP32 GET lenh polling
router.get('/:deviceId/next-command', async (req, res) =>{
    const { deviceId } = req.params;
    try {
        const cmd = await Command.findOneAndUpdate(
            { deviceId, status: 'pending' },
            { $set: { status: 'sent', updateAt: new Date() } },
            { sort: { createdAt: 1}, new: true }
        );
        if (!cmd) return res.json({ ok: true, command: null });
        res.json ({ ok: true, command: cmd });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});


// esp32 bao cao trang thai sau khi thuc hien
router.post('/:deviceId/report', async (req, res) => {
    const { deviceId } = req.params;
    const { relay, rssi, commandId, status } = req.body; // relay: true/ false
    try {
        await LightStatus.findOneAndUpdate(
            { deviceId },
            { $set: { relay, lastUpdated: new Date() }, $inc: {} },
            { upsert: true }
        );
        // neu co commandId, danh dau done
        if (commandId) {
            await Command.findOneAndUpdate(
            { _id: commandId },
            { status: status === 'ok' ? 'done' : 'failed', updatedAt: new Date() }
            );
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});

module.exports = router;
