const CreditNote = require('../models/CreditNote');

// @desc    Get all credits
// @route   GET /api/credits
// @access  Private
const getCredits = async (req, res) => {
    try {
        const credits = await CreditNote.find({ tenantId: req.user.tenantId })
            .populate('addedBy', 'name')
            .populate('closedBy', 'name')
            .sort({ createdAt: -1 });
        res.json(credits);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching credits' });
    }
};

// @desc    Add a new credit record
// @route   POST /api/credits
// @access  Private
const addCredit = async (req, res) => {
    try {
        const { customerName, phone, totalAmount } = req.body;

        if (!customerName || !totalAmount) {
            return res.status(400).json({ message: 'Customer name and amount are required' });
        }

        const credit = await CreditNote.create({
            tenantId: req.user.tenantId,
            customerName,
            phone,
            totalAmount: Number(totalAmount),
            remainingAmount: Number(totalAmount),
            addedBy: req.user._id,
            status: 'open'
        });
        res.status(201).json(credit);
    } catch (error) {
        res.status(500).json({ message: 'Error adding credit record' });
    }
};

// @desc    Record a payment against a credit
// @route   PATCH /api/credits/:id/payment
// @access  Private
const addPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid payment amount is required' });
        }

        const credit = await CreditNote.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

        if (!credit) {
            return res.status(404).json({ message: 'Credit record not found' });
        }

        if (credit.status === 'closed') {
            return res.status(400).json({ message: 'This credit account is already closed' });
        }

        const paymentAmount = Number(amount);
        credit.remainingAmount -= paymentAmount;

        credit.payments.push({
            amount: paymentAmount,
            recordedBy: req.user._id,
            date: new Date()
        });

        if (credit.remainingAmount <= 0) {
            credit.remainingAmount = 0;
            credit.status = 'closed';
            credit.closedBy = req.user._id;
        }

        await credit.save();
        res.json(credit);
    } catch (error) {
        res.status(500).json({ message: 'Error recording payment' });
    }
};

module.exports = { getCredits, addCredit, addPayment };
