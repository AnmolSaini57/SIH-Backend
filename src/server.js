import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

import { createServer } from 'http';
import app from "./app.js";
import { initializeSocketIO } from './config/socket.js';
import { initializeSocketHandlers } from './sockets/messaging.socket.js';
import { initializeCommunitySocket } from './sockets/community.socket.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocketIO(httpServer);
initializeSocketHandlers(io); // Initialize messaging sockets
initializeCommunitySocket(io); // Initialize community sockets

// Make io accessible to routes via app
app.set('io', io);

// Start the server
httpServer.listen(PORT, () => {
  console.log(`SIH Backend running on port ${PORT}`);
  console.log(`Socket.io server ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});