const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { sendWelcomeEmail } = require('../utils/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
};

// @desc    Register a new owner and tenant
// @route   POST /api/auth/register
// @access  Public
const registerOwner = async (req, res) => {
    const { name, email, password, shopName } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        name,
        email,
        password,
        role: 'owner',
    });

    if (user) {
        const tenant = await Tenant.create({
            name: shopName,
            businessType: req.body.businessType || 'General',
            trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            owner: user._id,
        });

        user.tenantId = tenant._id;
        await user.save();

        // Send welcome email (asynchronous, don't block response)
        sendWelcomeEmail(user).catch(err => console.error('Failed to send welcome email:', err));

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('tenantId');

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId ? user.tenantId._id : null,
            tenant: user.tenantId ? {
                subscriptionStatus: user.tenantId.subscriptionStatus,
                subscriptionExpiresAt: user.tenantId.subscriptionExpiresAt
            } : null,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

module.exports = { registerOwner, loginUser };
