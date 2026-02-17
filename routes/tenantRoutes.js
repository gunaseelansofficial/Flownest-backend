const express = require('express');
const { getTenantDetails, updateTenant, submitProof } = require('../controllers/tenantController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.route('/me')
    .get(protect, getTenantDetails)
    .put(protect, authorize('owner'), updateTenant);

router.post('/proof', protect, authorize('owner'), submitProof);

module.exports = router;
