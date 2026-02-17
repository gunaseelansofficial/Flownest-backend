const Expense = require('../models/Expense');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ tenantId: req.user.tenantId })
            .populate('addedBy', 'name')
            .sort({ createdAt: -1 });
        res.json(expenses);
    } catch (error) {
        console.error('Get Expenses Error:', error);
        res.status(500).json({ message: 'Error fetching expenses' });
    }
};

// @desc    Add expense
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res) => {
    try {
        const { amount, title, reason, category, date } = req.body;

        if (!amount || (!title && !reason)) {
            return res.status(400).json({ message: 'Amount and Title are required' });
        }

        // Auto-approve if owner or superadmin, otherwise pending
        const status = (req.user.role === 'owner' || req.user.role === 'superadmin') ? 'approved' : 'pending';

        const expense = await Expense.create({
            tenantId: req.user.tenantId,
            addedBy: req.user._id,
            amount: Number(amount),
            title: title || reason,
            category: category || 'General',
            status,
            date: date || new Date(),
        });
        res.status(201).json(expense);
    } catch (error) {
        console.error('Add Expense Error:', error);
        res.status(500).json({ message: error.message || 'Error adding expense' });
    }
};

// @desc    Update expense status (Approve/Reject)
// @route   PATCH /api/expenses/:id/status
// @access  Private/Owner
const updateExpenseStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const expense = await Expense.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

        if (expense) {
            expense.status = status;
            await expense.save();
            res.json(expense);
        } else {
            res.status(404).json({ message: 'Expense not found' });
        }
    } catch (error) {
        console.error('Update Expense Status Error:', error);
        res.status(500).json({ message: 'Error updating expense status' });
    }
};

module.exports = { getExpenses, addExpense, updateExpenseStatus };
