const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    logo: { type: String },
    businessType: { type: String },
    subscriptionStatus: { type: String, default: 'trial' },
    trialExpiresAt: { type: Date },
    subscriptionExpiresAt: { type: Date },
    paymentProof: { type: String },
    paymentApproved: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
