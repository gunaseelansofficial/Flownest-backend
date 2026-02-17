const express = require('express');
const { createInvoice, getInvoices, getDashboardStats } = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/subscription');
const router = express.Router();

router.route('/')
    .post(protect, checkSubscription, createInvoice)
    .get(protect, checkSubscription, getInvoices);

router.get('/stats', protect, getDashboardStats);

module.exports = router;
