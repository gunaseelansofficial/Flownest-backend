const Tenant = require('../models/Tenant');

// @desc    Get tenant details
// @route   GET /api/tenants/me
// @access  Private
const getTenantDetails = async (req, res) => {
    const tenant = await Tenant.findById(req.user.tenantId).populate('owner', 'name');
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
        tenant.name = req.body.name || tenant.name;
        tenant.address = req.body.address || tenant.address;
        tenant.phone = req.body.phone || tenant.phone;
        tenant.businessType = req.body.businessType || tenant.businessType;

        if (req.body.ownerName || req.body.ownerEmail) {
            const owner = await User.findById(tenant.owner);
            if (owner) {
                owner.name = req.body.ownerName || owner.name;
                owner.email = req.body.ownerEmail || owner.email;
                await owner.save();
            }
        }

        const updatedTenant = await tenant.save();
        res.json(updatedTenant);
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
};

const submitProof = async (req, res) => {
    const tenant = await Tenant.findById(req.user.tenantId);
    if (tenant) {
        tenant.paymentProof = req.body.paymentProof;
        tenant.paymentApproved = false;
        await tenant.save();
        res.json({ message: 'Proof submitted successfully' });
    } else {
        res.status(404).json({ message: 'Tenant not found' });
    }
};

module.exports = { getTenantDetails, updateTenant, submitProof };
