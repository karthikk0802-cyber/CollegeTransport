require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const Stop = require('./models/Stop');
const Trip = require('./models/Trip');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-bus-tracking');
    console.log('Connected to database for seeding...');

    // Clear existing data (except the student user)
    await Bus.deleteMany({});
    await Route.deleteMany({});
    await Stop.deleteMany({});
    await Trip.deleteMany({});
    await User.deleteMany({ email: { $ne: 'karthikk0802@gmail.com' } });

    console.log('Cleared old seed data.');

    // 1. Create Admin User
    const admin = await User.create({
      name: 'Transport Administrator',
      email: 'admin@college.edu',
      password: 'admin123', // Will be hashed by pre-save middleware
      role: 'admin',
      phone: '+91 99999 88888'
    });
    console.log('Created Admin: admin@college.edu / admin123');

    // 2. Create Driver User
    const driver = await User.create({
      name: 'Ramesh Kumar',
      email: 'driver@college.edu',
      password: 'driver123', // Will be hashed by pre-save middleware
      role: 'driver',
      phone: '+91 98765 43210'
    });
    console.log('Created Driver: driver@college.edu / driver123');

    // 3. Create Stops
    const stop1 = await Stop.create({ name: 'Main Campus Gate', latitude: 12.9716, longitude: 77.5946 });
    const stop2 = await Stop.create({ name: 'Library Circle', latitude: 12.9740, longitude: 77.5970 });
    const stop3 = await Stop.create({ name: 'Hostel Block B', latitude: 12.9770, longitude: 77.6010 });
    const stop4 = await Stop.create({ name: 'City Mall Junction', latitude: 12.9820, longitude: 77.6080 });
    console.log('Created 4 stops waypoints.');

    // 4. Create Route
    const route = await Route.create({
      name: 'Campus Route 10',
      description: 'Main campus shuttle path connecting hostels and city mall link',
      stops: [
        { stop: stop1._id, sequence: 1 },
        { stop: stop2._id, sequence: 2 },
        { stop: stop3._id, sequence: 3 },
        { stop: stop4._id, sequence: 4 }
      ]
    });
    console.log('Created Campus Route 10.');

    // 5. Create Bus
    const bus = await Bus.create({
      busCode: 'C10',
      plateNumber: 'KA-01-MC-9876',
      assignedDriver: driver._id,
      assignedRoute: route._id
    });
    console.log('Created Bus C10.');

    // Update driver assignedBus reference
    driver.assignedBus = bus._id;
    await driver.save();

    // 6. Assign bus to existing student (Karthik)
    const student = await User.findOne({ email: 'karthikk0802@gmail.com' });
    if (student) {
      student.assignedBus = bus._id;
      await student.save();
      console.log(`Assigned Bus C10 to student user: ${student.email}`);
    } else {
      // Fallback: Create student if not found
      await User.create({
        name: 'Karthik',
        email: 'karthikk0802@gmail.com',
        password: 'student123',
        role: 'student',
        assignedBus: bus._id,
        rollNumber: '20BCE0001'
      });
      console.log('Created default student karthikk0802@gmail.com / student123');
    }

    console.log('Database seeding successfully completed.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
};

seed();
