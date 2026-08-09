const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const Location = require('../models/Location');

const startTripCleanupJob = () => {
  // Run cleanup check every 2 minutes
  const intervalMs = 2 * 60 * 1000;

  setInterval(async () => {
    try {
      console.log('Running automatic trip cleanup check...');

      const activeTrips = await Trip.find({ status: 'ACTIVE' });
      const now = new Date();

      for (const trip of activeTrips) {
        // Find last location ping timestamp
        const lastPing = await Location.findOne({ trip: trip._id })
          .sort({ timestamp: -1 });

        const tripStartTime = new Date(trip.startTime);
        const hoursSinceStart = (now - tripStartTime) / (1000 * 60 * 60);

        let shouldExpire = false;
        let reason = '';

        // 1. Exceeded Max Trip Duration (e.g. 4 hours)
        const maxDurationHours = trip.maxDurationHours || Number(process.env.MAX_TRIP_DURATION_HOURS) || 4;
        if (hoursSinceStart >= maxDurationHours) {
          shouldExpire = true;
          reason = `Exceeded maximum duration of ${maxDurationHours} hours`;
        }

        // 2. Inactive for too long (no location updates for 20 minutes)
        const inactiveMinutesThreshold = Number(process.env.AUTO_EXPIRE_INACTIVE_MINUTES) || 20;
        const compareTime = lastPing ? new Date(lastPing.timestamp) : tripStartTime;
        const minutesSinceLastUpdate = (now - compareTime) / (1000 * 60);

        if (minutesSinceLastUpdate >= inactiveMinutesThreshold) {
          shouldExpire = true;
          reason = `No GPS updates received for ${inactiveMinutesThreshold} minutes`;
        }

        if (shouldExpire) {
          console.log(`Auto-expiring trip ${trip._id} (Bus: ${trip.bus}). Reason: ${reason}`);

          // Close trip in DB
          trip.status = 'AUTO_EXPIRED';
          trip.endTime = now;
          await trip.save();

          // Reset bus status
          await Bus.findByIdAndUpdate(trip.bus, {
            status: 'NOT_STARTED',
            currentTrip: null
          });

          // Broadcast to client sockets
          if (global.io) {
            global.io.to(`bus:${trip.bus}`).emit('bus:locationChanged', {
              busId: trip.bus,
              tripId: trip._id,
              status: 'OFFLINE',
              timestamp: now,
              message: `Trip expired automatically: ${reason}`
            });

            global.io.to('admins').emit('trip:autoExpired', {
              tripId: trip._id,
              busId: trip.bus,
              reason
            });
          }
        } else {
          // If the trip is not expired but has had no update for 30s, we check if the status needs updating to STALE
          const compareTimeStale = lastPing ? new Date(lastPing.timestamp) : tripStartTime;
          const secondsSinceLastUpdate = (now - compareTimeStale) / 1000;

          if (secondsSinceLastUpdate >= 30) {
            const bus = await Bus.findById(trip.bus);
            if (bus && bus.status === 'LIVE') {
              bus.status = 'STALE';
              await bus.save();

              // Broadcast update
              if (global.io) {
                global.io.to(`bus:${trip.bus}`).emit('bus:locationChanged', {
                  busId: trip.bus,
                  tripId: trip._id,
                  status: 'STALE',
                  timestamp: now,
                  message: 'Connection lagging'
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in trip cleanup job:', error.message);
    }
  }, intervalMs);
};

module.exports = { startTripCleanupJob };
