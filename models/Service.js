const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    originalPrice: { type: Number, default: 0 },
    sellPrice: { type: Number, required: true },
    duration: { type: Number }, // in minutes
    category: { type: String, default: 'General' },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
