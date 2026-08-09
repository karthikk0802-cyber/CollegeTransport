const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Location = require('../models/Location');

// Map to track active driver socket connections
const activeDrivers = new Map(); // driverId -> socketId

const initSocket = (io) => {
  global.io = io;

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_secret_key_1234567890_college_bus');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket Connected: User ${socket.user.name} (${socket.user.role}) connected on socket ${socket.id}`);

    // If user is a driver, save their socket mapping
    if (socket.user.role === 'driver') {
      activeDrivers.set(socket.user._id.toString(), socket.id);
    }

    // Join admin room if admin
    if (socket.user.role === 'admin') {
      socket.join('admins');
      console.log(`Admin ${socket.user.name} joined 'admins' room`);
    }

    // Student/Admin joins a specific bus tracking room
    socket.on('student:joinBus', ({ busId }) => {
      if (busId) {
        socket.join(`bus:${busId}`);
        console.log(`User ${socket.user.name} joined room 'bus:${busId}'`);
      }
    });

    // Student/Admin leaves a bus tracking room
    socket.on('student:leaveBus', ({ busId }) => {
      if (busId) {
        socket.leave(`bus:${busId}`);
        console.log(`User ${socket.user.name} left room 'bus:${busId}'`);
      }
    });

    // Driver location update
    socket.on('driver:locationUpdate', async (payload) => {
      try {
        const { latitude, longitude, speed } = payload;
        const driverId = socket.user._id;

        // Find active trip for the driver
        const trip = await Trip.findOne({ driver: driverId, status: 'ACTIVE' });
        if (!trip) {
          console.warn(`Driver ${socket.user.name} attempted location update but has no active trip.`);
          socket.emit('driver:error', { message: 'No active trip found. Please start a trip first.' });
          return;
        }

        // Save location update to Database
        const locationUpdate = await Location.create({
          trip: trip._id,
          latitude,
          longitude,
          speed: speed || 0,
          timestamp: new Date()
        });

        // Update the bus status to LIVE and update last ping
        await Bus.findByIdAndUpdate(trip.bus, {
          status: 'LIVE'
        });

        // Broadcast location updates to anyone listening to this bus
        io.to(`bus:${trip.bus}`).emit('bus:locationChanged', {
          busId: trip.bus,
          tripId: trip._id,
          latitude,
          longitude,
          status: 'LIVE',
          timestamp: locationUpdate.timestamp,
          speed: speed || 0,
        });

        // Broadcast to admins
        io.to('admins').emit('admin:busLocationChanged', {
          busId: trip.bus,
          tripId: trip._id,
          latitude,
          longitude,
          status: 'LIVE',
          timestamp: locationUpdate.timestamp,
          speed: speed || 0,
          driverName: socket.user.name
        });

      } catch (err) {
        console.error('Error handling location update:', err.message);
      }
    });

    // Driver disconnects or manually ends trip
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: User ${socket.user.name} (${socket.user.role}) disconnected`);
      
      if (socket.user.role === 'driver') {
        const driverIdStr = socket.user._id.toString();
        activeDrivers.delete(driverIdStr);

        // We check if the driver had an active trip
        const trip = await Trip.findOne({ driver: socket.user._id, status: 'ACTIVE' });
        if (trip) {
          // Instead of immediately ending the trip, we mark the bus status as STALE
          // because a driver might temporarily lose network connection or refresh the page.
          // In the frontend/background we give the driver a chance to reconnect.
          await Bus.findByIdAndUpdate(trip.bus, {
            status: 'STALE'
          });

          // Broadcast state change to students
          io.to(`bus:${trip.bus}`).emit('bus:locationChanged', {
            busId: trip.bus,
            tripId: trip._id,
            status: 'STALE',
            timestamp: new Date(),
            message: 'Driver disconnected. Connection weak/reconnecting.'
          });

          // Broadcast state change to admins
          io.to('admins').emit('admin:busLocationChanged', {
            busId: trip.bus,
            tripId: trip._id,
            status: 'STALE',
            timestamp: new Date(),
            driverName: socket.user.name,
            message: 'Driver disconnected'
          });
        }
      }
    });
  });
};

module.exports = { initSocket };
