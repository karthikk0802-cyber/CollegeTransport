const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { getAssignedBus, getActiveTrip, startTrip, endTrip } = require('../controllers/driverController');

router.use(protect);
router.use(requireRole('driver'));

router.get('/assigned-bus', getAssignedBus);
router.get('/active-trip', getActiveTrip);
router.post('/start-trip', startTrip);
router.post('/end-trip', endTrip);

module.exports = router;
