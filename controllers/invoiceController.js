const Invoice = require('../models/Invoice');

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
    try {
        const { customerName, phone, services, totalAmount, paymentMethod } = req.body;

        const formattedServices = services.map(s => ({
            serviceId: (s._id && s._id.length === 24 && !s._id.startsWith('custom-')) ? s._id : null,
            name: s.name,
            price: s.price,
            quantity: s.quantity || 1
        }));

        const invoice = await Invoice.create({
            tenantId: req.user.tenantId,
            customerName,
            phone,
            services: formattedServices,
            totalAmount,
            paymentMethod: paymentMethod || 'Cash',
            createdBy: req.user._id,
        });

        res.status(201).json(invoice);
    } catch (error) {
        console.error('Create Invoice Error:', error);
        res.status(400).json({ message: error.message || 'Error creating invoice' });
    }
};

// @desc    Get all invoices for a tenant
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
    const invoices = await Invoice.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
    res.json(invoices);
};

// @desc    Get dashboard stats
// @route   GET /api/invoices/stats
// @access  Private
const getDashboardStats = async (req, res) => {
    const tenantId = req.user.tenantId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayInvoices = await Invoice.find({
        tenantId,
        createdAt: { $gte: today }
    });

    const todayRevenue = todayInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

    const totalInvoices = await Invoice.find({ tenantId });
    const totalRevenue = totalInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

    // Additional stats can be added here
    res.json({
        todayRevenue,
        totalRevenue,
        totalTransactions: totalInvoices.length,
        todayTransactions: todayInvoices.length,
    });
};

module.exports = { createInvoice, getInvoices, getDashboardStats };
