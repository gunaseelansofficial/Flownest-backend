const Service = require('../models/Service');

const Tenant = require('../models/Tenant');
const User = require('../models/User');

// @desc    Get all services for a tenant
// @route   GET /api/services
// @access  Private
const getServices = async (req, res) => {
    // Self-healing: If tenantId is missing on user object (from token/auth)
    if (!req.user.tenantId) {
        const tenant = await Tenant.findOne({ owner: req.user._id });
        if (tenant) {
            req.user.tenantId = tenant._id;
            // Optionally update user to persist this
            await User.findByIdAndUpdate(req.user._id, { tenantId: tenant._id });
        }
    }

    // If still no tenantId, return empty list or error (empty list safest for now)
    if (!req.user.tenantId) return res.json([]);

    const services = await Service.find({ tenantId: req.user.tenantId });
    res.json(services);
};

// @desc    Create a new service
// @route   POST /api/services
// @access  Private/Owner
const createService = async (req, res) => {
    try {
        const { name, price, sellPrice, originalPrice, duration, category } = req.body;

        // For backward compatibility or if sellPrice isn't explicitly provided, use price
        const finalSellPrice = sellPrice || price;

        // Self-healing: Check if tenantId is missing
        if (!req.user || !req.user.tenantId) {
            console.log('Attempting to find tenant for user:', req.user?._id);
            const tenant = await Tenant.findOne({ owner: req.user._id });

            if (tenant) {
                console.log('Found tenant, linking to user:', tenant._id);
                req.user.tenantId = tenant._id;
                // Persist the fix
                await User.findByIdAndUpdate(req.user._id, { tenantId: tenant._id });
            } else {
                console.error('Create Service Error: Missing Tenant ID for user:', req.user?._id);
                return res.status(400).json({ message: 'User setup incomplete: No linked Tenant found. Please contact support.' });
            }
        }

        const service = await Service.create({
            name,
            originalPrice: originalPrice || 0,
            sellPrice: finalSellPrice,
            duration,
            category,
            tenantId: req.user.tenantId,
        });
        res.status(201).json(service);
    } catch (error) {
        console.error('Create Service Error:', error);
        res.status(400).json({ message: error.message || 'Error creating service' });
    }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Owner
const updateService = async (req, res) => {
    const service = await Service.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

    if (service) {
        service.name = req.body.name || service.name;
        service.sellPrice = req.body.sellPrice || req.body.price || service.sellPrice;
        service.originalPrice = req.body.originalPrice !== undefined ? req.body.originalPrice : service.originalPrice;
        service.duration = req.body.duration || service.duration;
        service.category = req.body.category || service.category;

        const updatedService = await service.save();
        res.json(updatedService);
    } else {
        res.status(404).json({ message: 'Service not found' });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private/Owner
const deleteService = async (req, res) => {
    const service = await Service.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

    if (service) {
        await service.deleteOne();
        res.json({ message: 'Service removed' });
    } else {
        res.status(404).json({ message: 'Service not found' });
    }
};

module.exports = { getServices, createService, updateService, deleteService };
