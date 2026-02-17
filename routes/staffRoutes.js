const express = require('express');
const { getStaff, addStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/subscription');
const router = express.Router();

router.route('/')
    .get(protect, authorize('owner'), checkSubscription, getStaff)
    .post(protect, authorize('owner'), checkSubscription, addStaff);

router.route('/:id')
    .put(protect, authorize('owner'), checkSubscription, updateStaff)
    .delete(protect, authorize('owner'), checkSubscription, deleteStaff);

module.exports = router;
