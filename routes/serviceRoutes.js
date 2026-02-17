const express = require('express');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.route('/')
    .get(protect, getServices)
    .post(protect, authorize('owner'), createService);

router.route('/:id')
    .put(protect, authorize('owner'), updateService)
    .delete(protect, authorize('owner'), deleteService);

module.exports = router;
