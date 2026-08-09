const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { getAssignedBus, searchBuses, getBusTracking } = require('../controllers/studentController');

router.use(protect);

router.get('/bus', requireRole('student'), getAssignedBus);
router.get('/buses/search', requireRole(['student', 'admin']), searchBuses);
router.get('/buses/:id', requireRole(['student', 'admin']), getBusTracking);

module.exports = router;
