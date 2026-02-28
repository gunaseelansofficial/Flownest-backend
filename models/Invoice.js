const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    customerName: { type: String, required: true },
    phone: { type: String },
    services: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        name: { type: String },
        price: { type: Number },
        originalPrice: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 }
    }],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card'], default: 'Cash' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
