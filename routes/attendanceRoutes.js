const express = require('express');
const { checkIn, checkOut, getAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/subscription');
const router = express.Router();

router.post('/check-in', protect, checkSubscription, checkIn);
router.post('/check-out', protect, checkSubscription, checkOut);
router.get('/', protect, checkSubscription, getAttendance);

module.exports = router;
