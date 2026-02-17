const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // null for system messages
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error', 'system'],
        default: 'info'
    },
    read: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
