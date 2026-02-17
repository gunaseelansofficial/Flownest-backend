const User = require('../models/User');
const Tenant = require('../models/Tenant');

// @desc    Get all staff for a tenant
// @route   GET /api/staff
// @access  Private/Owner
const getStaff = async (req, res) => {
    // Self-healing: If tenantId is missing
    if (!req.user.tenantId) {
        const tenant = await Tenant.findOne({ owner: req.user._id });
        if (tenant) {
            req.user.tenantId = tenant._id;
            await User.findByIdAndUpdate(req.user._id, { tenantId: tenant._id });
        }
    }

    if (!req.user.tenantId) return res.json([]);

    // Find users who have this tenantId AND differ from the current user (optional, to exclude owner from staff list if desired, but owner is usually not 'staff')
    // Typically staff have role='staff', but simple filtering by tenantId is good start
    const staff = await User.find({ tenantId: req.user.tenantId, role: 'staff' });
    res.json(staff);
};

// @desc    Add a new staff member
// @route   POST /api/staff
// @access  Private/Owner
const addStaff = async (req, res) => {
    const { name, email, password, phone, role } = req.body;

    // Self-healing
    if (!req.user.tenantId) {
        const tenant = await Tenant.findOne({ owner: req.user._id });
        if (tenant) {
            req.user.tenantId = tenant._id;
            await User.findByIdAndUpdate(req.user._id, { tenantId: tenant._id });
        } else {
            return res.status(400).json({ message: 'User setup incomplete: Missing Tenant ID' });
        }
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const staff = await User.create({
        name,
        email,
        password,
        role: role || 'staff',
        tenantId: req.user.tenantId,
        phone,
    });

    res.status(201).json(staff);
};

// @desc    Update staff
// @route   PUT /api/staff/:id
// @access  Private/Owner
const updateStaff = async (req, res) => {
    const staff = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

    if (staff) {
        staff.name = req.body.name || staff.name;
        staff.email = req.body.email || staff.email;
        staff.phone = req.body.phone || staff.phone;
        staff.role = req.body.role || staff.role;
        if (req.body.password) {
            staff.password = req.body.password;
        }

        const updatedStaff = await staff.save();
        res.json(updatedStaff);
    } else {
        res.status(404).json({ message: 'Staff member not found' });
    }
};

// @desc    Delete staff
// @route   DELETE /api/staff/:id
// @access  Private/Owner
const deleteStaff = async (req, res) => {
    const staff = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

    if (staff) {
        await staff.deleteOne();
        res.json({ message: 'Staff member removed' });
    } else {
        res.status(404).json({ message: 'Staff member not found' });
    }
};

module.exports = { getStaff, addStaff, updateStaff, deleteStaff };
