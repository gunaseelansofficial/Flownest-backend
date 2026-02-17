const express = require('express');
const { getExpenses, addExpense, updateExpenseStatus } = require('../controllers/expenseController');
const { protect, ownerOnly } = require('../middleware/auth');
const router = express.Router();

router.route('/')
    .get(protect, getExpenses)
    .post(protect, addExpense);

router.route('/:id/status')
    .patch(protect, ownerOnly, updateExpenseStatus);

module.exports = router;
