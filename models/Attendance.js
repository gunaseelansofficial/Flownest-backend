const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkIn: { type: Date, default: Date.now },
    checkOut: { type: Date },
    totalHours: { type: Number, default: 0 },
    salaryEarned: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
