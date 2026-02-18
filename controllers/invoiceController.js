const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const Tenant = require('../models/Tenant');
const Expense = require('../models/Expense');


// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
    try {
        const { customerName, phone, services, totalAmount, paymentMethod } = req.body;

        const formattedServices = services.map(s => ({
            serviceId: (s._id && s._id.length === 24 && !s._id.startsWith('custom-')) ? s._id : null,
            name: s.name,
            price: s.sellPrice || s.price || 0,
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

        // Trigger Notification for Owner
        try {
            const tenant = await Tenant.findById(req.user.tenantId);
            if (tenant && tenant.owner) {
                await Notification.create({
                    recipient: tenant.owner,
                    sender: req.user._id,
                    title: 'New Sale Completed',
                    message: `A new sale of ₹${totalAmount} was made to ${customerName || 'Walk-in'}.`,
                    type: 'success'
                });
            }
        } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
        }

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
    const invoices = await Invoice.find({ tenantId: req.user.tenantId })
        .populate('services.serviceId')
        .sort({ createdAt: -1 });
    res.json(invoices);
};

// @desc    Get dashboard stats
// @route   GET /api/invoices/stats

// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        if (!req.user.tenantId) {
            return res.status(400).json({ message: 'Tenant ID is required' });
        }

        const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);

        // Basic Stats (Today vs Total)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const statsResult = await Invoice.aggregate([
            { $match: { tenantId } },
            {
                $facet: {
                    totalStats: [
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: "$totalAmount" },
                                totalCount: { $sum: 1 }
                            }
                        }
                    ],
                    todayStats: [
                        { $match: { createdAt: { $gte: today } } },
                        {
                            $group: {
                                _id: null,
                                todayRevenue: { $sum: "$totalAmount" },
                                todayCount: { $sum: 1 }
                            }
                        }
                    ],
                    serviceSplitting: [
                        { $unwind: "$services" },
                        {
                            $group: {
                                _id: "$services.name",
                                value: { $sum: "$services.quantity" }
                            }
                        },
                        { $sort: { value: -1 } },
                        { $limit: 10 }
                    ],
                    last7DaysRevenue: [
                        {
                            $match: {
                                createdAt: {
                                    $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                                }
                            }
                        },
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                                total: { $sum: "$totalAmount" }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ]
                }
            }
        ]);

        const data = statsResult[0];
        const totalStats = data.totalStats[0] || { totalRevenue: 0, totalCount: 0 };
        const todayStats = data.todayStats[0] || { todayRevenue: 0, todayCount: 0 };

        // Process Revenue Velocity for Chart
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const revenueData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = data.last7DaysRevenue.find(r => r._id === dateStr);
            revenueData.push({
                name: dayNames[d.getDay()],
                total: found ? found.total : 0,
                date: dateStr
            });
        }

        // Process Service Splitting for Chart
        const serviceData = data.serviceSplitting.map(s => ({
            name: s._id || 'Unknown',
            value: s.value
        }));

        // Calculate Daily Average & Repeat Rate (All-time context)
        const dailyAverage = totalStats.totalCount > 0 ? (totalStats.totalRevenue / (totalStats.totalCount || 1)).toFixed(0) : 0;

        // Accurate Repeat Rate Calculation
        const customerStats = await Invoice.aggregate([
            { $match: { tenantId, phone: { $ne: null, $ne: "" } } },
            { $group: { _id: "$phone", count: { $sum: 1 } } },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 },
                    repeatCustomers: { $sum: { $cond: [{ $gt: ["$count", 1] }, 1, 0] } }
                }
            }
        ]);

        const repeatRate = customerStats.length > 0
            ? ((customerStats[0].repeatCustomers / customerStats[0].totalCustomers) * 100).toFixed(0)
            : 0;

        // Fetch Total Expenses
        const totalExpensesResult = await Expense.aggregate([
            { $match: { tenantId, status: 'approved' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;
        const netProfit = totalStats.totalRevenue - totalExpenses;

        res.json({
            totalRevenue: totalStats.totalRevenue,
            totalInvoices: totalStats.totalCount,
            todayRevenue: todayStats.todayRevenue,
            todayInvoices: todayStats.todayCount,
            revenueData,
            serviceData,
            dailyAverage,
            repeatRate,
            totalExpenses,
            netProfit
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

module.exports = { createInvoice, getInvoices, getDashboardStats };
