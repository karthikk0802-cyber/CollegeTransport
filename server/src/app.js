const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Enable CORS
app.use(cors({
  origin: '*', // For development, allow all origins. Can restrict in production.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser, reading data from body into req.body
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/student', studentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'College Bus Tracking API is running smoothly',
    timestamp: new Date()
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
