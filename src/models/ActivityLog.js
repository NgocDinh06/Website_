const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true},
    action: { type: String, required: true},
    role: { type: String},
    createAt: { type: Date, default: Date.now}
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
