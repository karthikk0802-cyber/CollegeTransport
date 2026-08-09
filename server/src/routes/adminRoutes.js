const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  createBus, getBuses, getBusById, updateBus, deleteBus,
  getDrivers, createDriver, updateDriver, deleteDriver,
  getStudents, createStudent, updateStudent, deleteStudent,
  createRoute, getRoutes, getRouteById, updateRoute, deleteRoute,
  createStop, getStops, updateStop, deleteStop,
  getActiveTrips, getTripHistory, forceStopTrip
} = require('../controllers/adminController');

// All routes under adminRoutes require admin role
router.use(protect);
router.use(requireRole('admin'));

// Buses CRUD
router.route('/buses')
  .post(createBus)
  .get(getBuses);
router.route('/buses/:id')
  .get(getBusById)
  .put(updateBus)
  .delete(deleteBus);

// Drivers CRUD
router.route('/drivers')
  .post(createDriver)
  .get(getDrivers);
router.route('/drivers/:id')
  .put(updateDriver)
  .delete(deleteDriver);

// Students CRUD
router.route('/students')
  .post(createStudent)
  .get(getStudents);
router.route('/students/:id')
  .put(updateStudent)
  .delete(deleteStudent);

// Routes CRUD
router.route('/routes')
  .post(createRoute)
  .get(getRoutes);
router.route('/routes/:id')
  .get(getRouteById)
  .put(updateRoute)
  .delete(deleteRoute);

// Stops CRUD
router.route('/stops')
  .post(createStop)
  .get(getStops);
router.route('/stops/:id')
  .put(updateStop)
  .delete(deleteStop);

// Trips tracking
router.get('/trips/active', getActiveTrips);
router.get('/trips/history', getTripHistory);
router.post('/trips/:tripId/force-stop', forceStopTrip);

module.exports = router;
