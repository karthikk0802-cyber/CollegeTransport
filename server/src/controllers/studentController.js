const Bus = require('../models/Bus');
const Location = require('../models/Location');

// @desc    Get student's assigned bus tracking details
// @route   GET /api/student/bus
// @access  Private (Student only)
exports.getAssignedBus = async (req, res) => {
  try {
    if (!req.user.assignedBus) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No bus assigned. Please select a bus from search.'
      });
    }

    const bus = await Bus.findById(req.user.assignedBus)
      .populate('assignedDriver', 'name phone')
      .populate({
        path: 'assignedRoute',
        populate: { path: 'stops.stop' }
      })
      .populate('currentTrip');

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Assigned bus details not found' });
    }

    // Get last location if trip is active
    let lastLocation = null;
    if (bus.currentTrip) {
      lastLocation = await Location.findOne({ trip: bus.currentTrip })
        .sort({ timestamp: -1 });
    }

    res.status(200).json({
      success: true,
      data: {
        bus,
        lastLocation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search / list all buses
// @route   GET /api/student/buses/search
// @access  Private (Student/Admin)
exports.searchBuses = async (req, res) => {
  try {
    const { query } = req.query;
    
    let filter = {};
    if (query) {
      filter = {
        $or: [
          { busCode: { $regex: query, $options: 'i' } },
          { plateNumber: { $regex: query, $options: 'i' } }
        ]
      };
    }

    const buses = await Bus.find(filter)
      .populate('assignedDriver', 'name phone')
      .populate({
        path: 'assignedRoute',
        populate: { path: 'stops.stop' }
      })
      .populate('currentTrip');

    res.status(200).json({ success: true, data: buses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tracking info for any specific bus
// @route   GET /api/student/buses/:id
// @access  Private
exports.getBusTracking = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('assignedDriver', 'name phone')
      .populate({
        path: 'assignedRoute',
        populate: { path: 'stops.stop' }
      })
      .populate('currentTrip');

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    let lastLocation = null;
    if (bus.currentTrip) {
      lastLocation = await Location.findOne({ trip: bus.currentTrip })
        .sort({ timestamp: -1 });
    }

    res.status(200).json({
      success: true,
      data: {
        bus,
        lastLocation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
