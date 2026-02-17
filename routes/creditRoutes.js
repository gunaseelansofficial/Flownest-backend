const express = require('express');
const { getCredits, addCredit, addPayment } = require('../controllers/creditController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.route('/')
    .get(protect, getCredits)
    .post(protect, addCredit);

router.route('/:id/payment')
    .patch(protect, addPayment);

module.exports = router;
