const Bus = require('../models/Bus');
const User = require('../models/User');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const Trip = require('../models/Trip');

// ==========================================
// BUS CRUD & ASSIGNMENTS
// ==========================================

exports.createBus = async (req, res) => {
  try {
    const { busCode, plateNumber, assignedDriver, assignedRoute } = req.body;
    const bus = await Bus.create({ busCode, plateNumber, assignedDriver, assignedRoute });
    
    // If driver is assigned to this bus, update the driver's profile
    if (assignedDriver) {
      await User.findByIdAndUpdate(assignedDriver, { assignedBus: bus._id });
    }

    res.status(201).json({ success: true, data: bus });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getBuses = async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('assignedDriver', 'name email phone')
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

exports.getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('assignedDriver', 'name email phone')
      .populate({
        path: 'assignedRoute',
        populate: { path: 'stops.stop' }
      })
      .populate('currentTrip');
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
    res.status(200).json({ success: true, data: bus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBus = async (req, res) => {
  try {
    const { busCode, plateNumber, assignedDriver, assignedRoute } = req.body;
    const busId = req.params.id;

    const oldBus = await Bus.findById(busId);
    if (!oldBus) return res.status(404).json({ success: false, message: 'Bus not found' });

    // Update old driver if driver changed
    if (oldBus.assignedDriver && oldBus.assignedDriver.toString() !== assignedDriver) {
      await User.findByIdAndUpdate(oldBus.assignedDriver, { assignedBus: null });
    }

    const bus = await Bus.findByIdAndUpdate(
      busId,
      { busCode, plateNumber, assignedDriver: assignedDriver || null, assignedRoute: assignedRoute || null },
      { new: true, runValidators: true }
    );

    // Update new driver
    if (assignedDriver) {
      await User.findByIdAndUpdate(assignedDriver, { assignedBus: bus._id });
    }

    res.status(200).json({ success: true, data: bus });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

    // Unassign driver
    if (bus.assignedDriver) {
      await User.findByIdAndUpdate(bus.assignedDriver, { assignedBus: null });
    }

    // Unassign students
    await User.updateMany({ assignedBus: bus._id }, { assignedBus: null });

    await bus.deleteOne();
    res.status(200).json({ success: true, message: 'Bus deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// DRIVER CRUD & ASSIGNMENTS
// ==========================================

exports.getDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).populate('assignedBus', 'busCode plateNumber');
    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDriver = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const driver = await User.create({ name, email, password, role: 'driver', phone });
    res.status(201).json({ success: true, data: driver });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const driver = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone },
      { new: true, runValidators: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // Unassign driver from Bus if assigned
    await Bus.updateMany({ assignedDriver: driver._id }, { assignedDriver: null });

    await driver.deleteOne();
    res.status(200).json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// STUDENT CRUD & ASSIGNMENTS
// ==========================================

exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).populate('assignedBus', 'busCode plateNumber');
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, email, password, rollNumber, phone, assignedBus } = req.body;
    const student = await User.create({
      name,
      email,
      password,
      role: 'student',
      rollNumber,
      phone,
      assignedBus: assignedBus || null
    });
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, email, rollNumber, phone, assignedBus } = req.body;
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, rollNumber, phone, assignedBus: assignedBus || null },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    await student.deleteOne();
    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ROUTE CRUD
// ==========================================

exports.createRoute = async (req, res) => {
  try {
    const { name, description, stops } = req.body;
    const route = await Route.create({ name, description, stops });
    res.status(201).json({ success: true, data: route });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.find().populate('stops.stop');
    res.status(200).json({ success: true, data: routes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).populate('stops.stop');
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.status(200).json({ success: true, data: route });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const { name, description, stops } = req.body;
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { name, description, stops },
      { new: true, runValidators: true }
    );
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.status(200).json({ success: true, data: route });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

    // Unassign route from buses
    await Bus.updateMany({ assignedRoute: route._id }, { assignedRoute: null });

    await route.deleteOne();
    res.status(200).json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// STOP CRUD
// ==========================================

exports.createStop = async (req, res) => {
  try {
    const { name, latitude, longitude } = req.body;
    const stop = await Stop.create({ name, latitude, longitude });
    res.status(201).json({ success: true, data: stop });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getStops = async (req, res) => {
  try {
    const stops = await Stop.find();
    res.status(200).json({ success: true, data: stops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStop = async (req, res) => {
  try {
    const { name, latitude, longitude } = req.body;
    const stop = await Stop.findByIdAndUpdate(
      req.params.id,
      { name, latitude, longitude },
      { new: true, runValidators: true }
    );
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });
    res.status(200).json({ success: true, data: stop });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteStop = async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id);
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });

    // Remove stop from routes containing it
    await Route.updateMany(
      {},
      { $pull: { stops: { stop: stop._id } } }
    );

    await stop.deleteOne();
    res.status(200).json({ success: true, message: 'Stop deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ACTIVE TRIPS & TRIP HISTORY
// ==========================================

exports.getActiveTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'ACTIVE' })
      .populate({
        path: 'bus',
        populate: {
          path: 'assignedRoute',
          populate: { path: 'stops.stop' }
        }
      })
      .populate('driver', 'name phone');
    res.status(200).json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTripHistory = async (req, res) => {
  try {
    const trips = await Trip.find({ status: { $ne: 'ACTIVE' } })
      .populate('bus', 'busCode plateNumber')
      .populate('driver', 'name phone')
      .sort({ startTime: -1 })
      .limit(100);
    res.status(200).json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.forceStopTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    trip.status = 'FORCE_STOPPED';
    trip.endTime = new Date();
    await trip.save();

    // Reset the bus status
    await Bus.findByIdAndUpdate(trip.bus, {
      status: 'NOT_STARTED',
      currentTrip: null
    });

    // Notify client room if socket logic is bound, we'll do this in app/socket flow
    if (global.io) {
      global.io.to(`bus:${trip.bus}`).emit('bus:locationChanged', {
        busId: trip.bus,
        tripId: trip._id,
        status: 'OFFLINE',
        timestamp: new Date(),
      });
      global.io.to('admins').emit('trip:forceStopped', {
        tripId: trip._id,
        busId: trip.bus,
      });
    }

    res.status(200).json({ success: true, message: 'Trip force-stopped successfully', data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
