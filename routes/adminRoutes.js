const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { protect, authorize } = require('../middleware/auth');

const Notification = require('../models/Notification');
const User = require('../models/User');

// Get all tenants (Super Admin only)
router.get('/tenants', protect, authorize('superadmin'), async (req, res) => {
    const tenants = await Tenant.find({}).populate('owner', 'name email');
    res.json(tenants);
});

// Approve/Reject payment proof
router.post('/tenants/:id/approve', protect, authorize('superadmin'), async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);
    if (tenant) {
        tenant.paymentApproved = req.body.approve;
        if (req.body.approve) {
            tenant.subscriptionStatus = 'active';
            tenant.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
        await tenant.save();
        res.json({ message: 'Status updated' });
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
});

// Terminate Tenant
router.patch('/tenants/:id/terminate', protect, authorize('superadmin'), async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);
    if (tenant) {
        tenant.subscriptionStatus = 'terminated';
        // Optionally expire immediately
        tenant.subscriptionExpiresAt = new Date();
        await tenant.save();
        res.json({ message: 'Tenant terminated' });
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
});

// Extend Subscription
router.patch('/tenants/:id/subscription', protect, authorize('superadmin'), async (req, res) => {
    const { days, months } = req.body;
    const tenant = await Tenant.findById(req.params.id);

    if (tenant) {
        let currentExpiry = new Date(tenant.subscriptionExpiresAt);
        // If expired or invalid, start from now
        if (isNaN(currentExpiry.getTime()) || currentExpiry < new Date()) {
            currentExpiry = new Date();
        }

        if (days) currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
        if (months) currentExpiry.setMonth(currentExpiry.getMonth() + parseInt(months));

        tenant.subscriptionExpiresAt = currentExpiry;
        tenant.subscriptionStatus = 'active'; // Reactivate if was expired
        await tenant.save();

        res.json({
            message: 'Subscription extended',
            newExpiry: tenant.subscriptionExpiresAt
        });
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
});

// Send Message (Notification)
router.post('/message', protect, authorize('superadmin'), async (req, res) => {
    const { recipientId, title, message, type } = req.body;

    try {
        const notification = await Notification.create({
            recipient: recipientId,
            sender: req.user._id,
            title,
            message,
            type: type || 'info'
        });
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Failed to send message' });
    }
});

module.exports = router;
