const Tenant = require('../models/Tenant');

// @desc    Get tenant details
// @route   GET /api/tenants/me
// @access  Private
const getTenantDetails = async (req, res) => {
    const tenant = await Tenant.findById(req.user.tenantId).populate('owner', 'name email');
    if (tenant) {
        res.json(tenant);
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
};

const User = require('../models/User');

const updateTenant = async (req, res) => {
    // Self-healing: if tenantId is missing, try to find it
    if (!req.user.tenantId) {
        const tenant = await Tenant.findOne({ owner: req.user._id });
        if (tenant) {
            req.user.tenantId = tenant._id;
            // Update user record asynchronously
            await User.findByIdAndUpdate(req.user._id, { tenantId: tenant._id });
        } else {
            return res.status(404).json({ message: 'Tenant not found for this user' });
        }
    }

    const tenant = await Tenant.findById(req.user.tenantId);

    if (tenant) {
        tenant.name = req.body.name === "" ? tenant.name : (req.body.name || tenant.name);
        tenant.address = req.body.address === "" ? tenant.address : (req.body.address || tenant.address);
        tenant.phone = req.body.phone === "" ? tenant.phone : (req.body.phone || tenant.phone);
        tenant.businessType = req.body.businessType === "" ? tenant.businessType : (req.body.businessType || tenant.businessType);
        tenant.logo = req.body.logo || tenant.logo;

        if (req.body.ownerName || req.body.ownerEmail) {
            const owner = await User.findById(tenant.owner);
            if (owner) {
                owner.name = req.body.ownerName || owner.name;
                owner.email = req.body.ownerEmail || owner.email;
                await owner.save();
            }
        }

        await tenant.save();

        // Re-fetch with population to ensure frontend gets full data
        const updatedTenant = await Tenant.findById(tenant._id).populate('owner', 'name email');
        res.json(updatedTenant);
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
};

const Notification = require('../models/Notification');

const submitProof = async (req, res) => {
    const tenant = await Tenant.findById(req.user.tenantId).populate('owner', 'name');
    if (tenant) {
        tenant.paymentProof = req.body.paymentProof;
        tenant.paymentReferenceNumber = req.body.referenceNumber;
        tenant.paymentApproved = false;
        await tenant.save();

        // Notify Super Admins
        try {
            const superAdmins = await User.find({ role: 'superadmin' });
            for (const admin of superAdmins) {
                await Notification.create({
                    recipient: admin._id,
                    title: 'New Payment Proof Submitted',
                    message: `Shop "${tenant.name}" (Owner: ${tenant.owner.name}) has submitted a payment proof for verification. Ref: ${req.body.referenceNumber}`,
                    type: 'info'
                });
            }
        } catch (notifErr) {
            console.error('Failed to notify superadmins:', notifErr);
        }

        res.json({ message: 'Proof submitted successfully' });
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
};

module.exports = { getTenantDetails, updateTenant, submitProof };
