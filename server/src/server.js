require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');
const { startTripCleanupJob } = require('./services/tripCleanupService');

// Connect to Database
connectDB();

// Create HTTP Server
const server = http.createServer(app);

// Integrate Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from Vite client
    methods: ['GET', 'POST']
  }
});

// Initialize Socket listeners
initSocket(io);

// Start trip cleanup background job
startTripCleanupJob();

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
