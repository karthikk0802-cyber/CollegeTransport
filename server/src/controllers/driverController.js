const Bus = require('../models/Bus');
const Trip = require('../models/Trip');

// @desc    Get driver's assigned bus info
// @route   GET /api/driver/assigned-bus
// @access  Private (Driver only)
exports.getAssignedBus = async (req, res) => {
  try {
    const bus = await Bus.findOne({ assignedDriver: req.user._id })
      .populate({
        path: 'assignedRoute',
        populate: { path: 'stops.stop' }
      })
      .populate('currentTrip');

    if (!bus) {
      return res.status(404).json({ success: false, message: 'No bus assigned to you' });
    }

    res.status(200).json({ success: true, data: bus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get driver's active trip
// @route   GET /api/driver/active-trip
// @access  Private (Driver only)
exports.getActiveTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ driver: req.user._id, status: 'ACTIVE' })
      .populate('bus');

    if (!trip) {
      return res.status(200).json({ success: true, data: null, message: 'No active trip' });
    }

    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start trip for assigned bus
// @route   POST /api/driver/start-trip
// @access  Private (Driver only)
exports.startTrip = async (req, res) => {
  try {
    // Check if driver is assigned to a bus
    const bus = await Bus.findOne({ assignedDriver: req.user._id });
    if (!bus) {
      return res.status(400).json({ success: false, message: 'Cannot start trip: No bus assigned to you' });
    }

    // Check if there is already an active trip for this bus or driver
    const existingTrip = await Trip.findOne({
      $or: [
        { bus: bus._id, status: 'ACTIVE' },
        { driver: req.user._id, status: 'ACTIVE' }
      ]
    });

    if (existingTrip) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start trip: You or the bus already has an active trip.',
        data: existingTrip
      });
    }

    // Create a new trip
    const trip = await Trip.create({
      bus: bus._id,
      driver: req.user._id,
      status: 'ACTIVE',
      startTime: new Date()
    });

    // Update bus state
    bus.status = 'LIVE';
    bus.currentTrip = trip._id;
    await bus.save();

    // Broadcast update via socket if global.io exists
    if (global.io) {
      global.io.to(`bus:${bus._id}`).emit('bus:locationChanged', {
        busId: bus._id,
        tripId: trip._id,
        status: 'LIVE',
        timestamp: new Date(),
        message: 'Trip started'
      });
      global.io.to('admins').emit('trip:started', {
        tripId: trip._id,
        busId: bus._id,
        busCode: bus.busCode,
        driverName: req.user.name,
      });
    }

    res.status(201).json({ success: true, message: 'Trip started successfully', data: trip });
  } catch (error) {
    console.error('StartTrip error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    End active trip
// @route   POST /api/driver/end-trip
// @access  Private (Driver only)
exports.endTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ driver: req.user._id, status: 'ACTIVE' });
    if (!trip) {
      return res.status(400).json({ success: false, message: 'No active trip to end' });
    }

    trip.status = 'COMPLETED';
    trip.endTime = new Date();
    await trip.save();

    // Reset bus status
    const bus = await Bus.findById(trip.bus);
    if (bus) {
      bus.status = 'NOT_STARTED';
      bus.currentTrip = null;
      await bus.save();
    }

    // Broadcast update via socket if global.io exists
    if (global.io) {
      global.io.to(`bus:${trip.bus}`).emit('bus:locationChanged', {
        busId: trip.bus,
        tripId: trip._id,
        status: 'OFFLINE',
        timestamp: new Date(),
        message: 'Trip ended'
      });
      global.io.to('admins').emit('trip:ended', {
        tripId: trip._id,
        busId: trip.bus,
      });
    }

    res.status(200).json({ success: true, message: 'Trip ended successfully', data: trip });
  } catch (error) {
    console.error('EndTrip error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
