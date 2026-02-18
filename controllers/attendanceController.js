const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Check-in
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res) => {
    const { staffId } = req.body;
    const targetUserId = (req.user.role === 'owner' && staffId) ? staffId : req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
        staffId: targetUserId,
        checkIn: { $gte: today }
    });

    if (existingAttendance) {
        return res.status(400).json({ message: 'Already checked in today' });
    }

    // Get staff member to find their daySalary
    const staffMember = await User.findById(targetUserId);
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found' });

    const attendance = await Attendance.create({
        staffId: targetUserId,
        tenantId: req.user.tenantId,
        checkIn: new Date(),
        salaryEarned: staffMember.daySalary || 0
    });

    res.status(201).json(attendance);
};

// @desc    Check-out
// @route   POST /api/attendance/check-out
// @access  Private
const checkOut = async (req, res) => {
    const { staffId } = req.body;
    const targetUserId = (req.user.role === 'owner' && staffId) ? staffId : req.user._id;

    const attendance = await Attendance.findOne({
        staffId: targetUserId,
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
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);

    const query = { tenantId: req.user.tenantId };
    if (req.user.role === 'staff') {
        query.staffId = req.user._id;
    }

    // Find all attendance for the given day
    const logs = await Attendance.find({
        ...query,
        checkIn: { $gte: date }
    }).populate('staffId', 'name shift daySalary').sort({ createdAt: -1 });

    const formattedLogs = logs.map(log => ({
        ...log._doc,
        staffName: log.staffId?.name,
        shift: log.staffId?.shift,
        daySalary: log.staffId?.daySalary,
        date: log.checkIn
    }));
    res.json(formattedLogs);
};

module.exports = { checkIn, checkOut, getAttendance };
