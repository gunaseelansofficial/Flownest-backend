const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    customerName: { type: String, required: true },
    phone: { type: String },
    totalAmount: { type: Number, required: true },
    remainingAmount: { type: Number, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payments: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', creditNoteSchema);
