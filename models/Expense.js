const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'General' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
