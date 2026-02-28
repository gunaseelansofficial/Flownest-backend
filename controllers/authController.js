const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { sendWelcomeEmail } = require('../utils/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    const isProduction = process.env.NODE_ENV === 'production';

    const cookieOptions = {
        expires: new Date(
            Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: isProduction, // Must be true for SameSite: None
        sameSite: isProduction ? 'None' : 'Lax', // 'None' required for cross-origin credentials
        path: '/'
    };

    // If you have a specific domain for production, uncomment and set it
    // if (isProduction) cookieOptions.domain = '.flownest.in';

    res.status(statusCode)
        .cookie('token', token, cookieOptions)
        .json({
            success: true,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId?._id || user.tenantId,
            tenant: user.tenantId ? {
                subscriptionStatus: user.tenantId.subscriptionStatus,
                subscriptionExpiresAt: user.tenantId.subscriptionExpiresAt
            } : null
        });
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

        sendTokenResponse(user, 201, res);
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
        sendTokenResponse(user, 200, res);
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

module.exports = { registerOwner, loginUser, logoutUser };
