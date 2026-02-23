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

// Force Expire Subscription (Body based ID for robustness)
router.post('/expire-manual', protect, authorize('superadmin'), async (req, res) => {
    const { tenantId } = req.body;
    console.log(`[Admin] Manual Expiry request for: ${tenantId}`);
    try {
        const tenant = await Tenant.findById(tenantId);
        if (tenant) {
            tenant.subscriptionStatus = 'expired';
            tenant.subscriptionExpiresAt = new Date();
            await tenant.save();
            console.log(`[Admin] Successfully expired: ${tenant.name}`);
            res.json({ message: 'Subscription expired manually' });
        } else {
            res.status(404).json({ message: 'Tenant not found' });
        }
    } catch (error) {
        console.error('[Admin] Manual Expiry Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
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

// Permanently Delete Tenant and its Owner
router.delete('/tenants/:id', protect, authorize('superadmin'), async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        // Delete the owner first
        await User.deleteMany({ tenantId: tenant._id });

        // Delete the tenant
        await Tenant.findByIdAndDelete(req.params.id);

        res.json({ message: 'Tenant and associated data deleted permanently' });
    } catch (error) {
        res.status(500).json({ message: 'Deletion failed', error: error.message });
    }
});

// Terminate/Deactivate Tenant
router.patch('/tenants/:id/terminate', protect, authorize('superadmin'), async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);
    if (tenant) {
        tenant.subscriptionStatus = 'terminated';
        tenant.subscriptionExpiresAt = new Date();
        await tenant.save();
        res.json({ message: 'Tenant deactivated' });
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

// Get aggregated sales for all owners (Super Admin only)
router.get('/owner-sales', protect, authorize('superadmin'), async (req, res) => {
    try {
        const Invoice = require('../models/Invoice');

        const salesData = await Tenant.aggregate([
            {
                $lookup: {
                    from: 'invoices',
                    localField: '_id',
                    foreignField: 'tenantId',
                    as: 'invoices'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'ownerDetails'
                }
            },
            {
                $unwind: {
                    path: '$ownerDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    name: 1,
                    businessType: 1,
                    subscriptionStatus: 1,
                    owner: {
                        name: '$ownerDetails.name',
                        email: '$ownerDetails.email'
                    },
                    totalSales: { $sum: '$invoices.totalAmount' },
                    orderCount: { $size: '$invoices' },
                    recentInvoices: { $slice: ['$invoices', -10] } // Last 10 invoices for detail view
                }
            }
        ]);

        res.json(salesData);
    } catch (error) {
        console.error('[Admin] Owner Sales Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
