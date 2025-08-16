// doi lenh cho cac thiet bi
const mongoose = require('mongoose');

const CommandSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, index: true },
    command: { type: String, required: true },
    params: { type: Object, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { 
        type: String, 
        enum: ['pending', 'sent', 'done', 'failed'], 
        default: 'pending' 
    }
}, {
    timestamps: true // Tự sinh createdAt, updatedAt
});

// // Nếu cần tối ưu query
// CommandSchema.index({ deviceId: 1, status: 1 });

module.exports = mongoose.model('Command', CommandSchema);
