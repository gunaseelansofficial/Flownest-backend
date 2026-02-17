const Attendance = require('../models/Attendance');

// @desc    Check-in
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
        staffId: req.user._id,
        checkIn: { $gte: today }
    });

    if (existingAttendance) {
        return res.status(400).json({ message: 'Already checked in today' });
    }

    const attendance = await Attendance.create({
        staffId: req.user._id,
        tenantId: req.user.tenantId,
        checkIn: new Date(),
    });

    res.status(201).json(attendance);
};

// @desc    Check-out
// @route   POST /api/attendance/check-out
// @access  Private
const checkOut = async (req, res) => {
    const attendance = await Attendance.findOne({
        staffId: req.user._id,
        checkOut: { $exists: false }
    });

    if (!attendance) {
        return res.status(400).json({ message: 'Not checked in' });
    }

    attendance.checkOut = new Date();
    const diff = attendance.checkOut - attendance.checkIn;
    attendance.totalHours = diff / (1000 * 60 * 60); // Convert ms to hours

    await attendance.save();
    res.json(attendance);
};

// @desc    Get attendance logs
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
    const query = { tenantId: req.user.tenantId };
    if (req.user.role === 'staff') {
        query.staffId = req.user._id;
    }

    const logs = await Attendance.find(query).populate('staffId', 'name').sort({ createdAt: -1 });
    const formattedLogs = logs.map(log => ({
        ...log._doc,
        staffName: log.staffId?.name,
        date: log.checkIn
    }));
    res.json(formattedLogs);
};

module.exports = { checkIn, checkOut, getAttendance };
