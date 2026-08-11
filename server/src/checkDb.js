require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Stop = require('./models/Stop');
const Trip = require('./models/Trip');

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-bus-tracking');
    console.log('Connected to DB');

    const usersCount = await User.countDocuments();
    const busesCount = await Bus.countDocuments();
    const routesCount = await Route.countDocuments();
    const stopsCount = await Stop.countDocuments();
    const tripsCount = await Trip.countDocuments();

    console.log(`Users: ${usersCount}`);
    console.log(`Buses: ${busesCount}`);
    console.log(`Routes: ${routesCount}`);
    console.log(`Stops: ${stopsCount}`);
    console.log(`Trips: ${tripsCount}`);

    if (usersCount > 0) {
      console.log('\n--- Sample Users ---');
      const users = await User.find().limit(5);
      users.forEach(u => console.log(`- ${u.name} (${u.role}) - ${u.email}`));
    }

    if (busesCount > 0) {
      console.log('\n--- Sample Buses ---');
      const buses = await Bus.find().populate('assignedDriver assignedRoute');
      buses.forEach(b => console.log(`- Bus ${b.busCode} (${b.plateNumber}): Driver=${b.assignedDriver?.name || 'None'}, Route=${b.assignedRoute?.name || 'None'}`));
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
};

check();
