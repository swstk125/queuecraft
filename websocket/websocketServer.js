/**
 * WebSocket Server for Real-Time Job Updates
 * Uses Socket.IO for WebSocket communication
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const jobStatusEmitter = require('./jobStatusEmitter');
const { subscribeToJobEvents } = require('./jobEventBridge');

/**
 * Initialize WebSocket server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
function initializeWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.get('websocket.cors.origin'),
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const secretKey = config.get('jwt.secret');
      const decoded = jwt.verify(token, secretKey);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Track connection count per user
  const userConnections = new Map();

  // Connection handler
  io.on('connection', (socket) => {
    const userKey = socket.userId;
    
    // Track connections per user
    const currentCount = userConnections.get(userKey) || 0;
    userConnections.set(userKey, currentCount + 1);
    
    console.log(`✅ User connected: ${socket.userEmail} (${socket.id}) [Total: ${currentCount + 1}]`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Listen to job status events and emit to relevant users
    const jobCreatedHandler = (data) => {
      if (data.userId === socket.userId) {
        socket.emit('job:created', data.job);
      }
    };

    const jobStatusUpdatedHandler = (data) => {
      if (data.job.ownerId === socket.userId) {
        socket.emit('job:status:updated', {
          jobId: data.job._id,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          job: data.job
        });
      }
    };

    const jobDLQHandler = (data) => {
      if (data.job.ownerId === socket.userId) {
        socket.emit('job:dlq', data.job);
      }
    };

    const jobCompletedHandler = (data) => {
      if (data.job.ownerId === socket.userId) {
        socket.emit('job:completed', data.job);
      }
    };

    // Register event handlers
    jobStatusEmitter.on('job:created', jobCreatedHandler);
    jobStatusEmitter.on('job:status:updated', jobStatusUpdatedHandler);
    jobStatusEmitter.on('job:dlq', jobDLQHandler);
    jobStatusEmitter.on('job:completed', jobCompletedHandler);

    // Handle client requests for current stats
    socket.on('request:stats', async () => {
      try {
        const JobService = require('../api/service/JobService');
        const stats = await JobService.getJobStats?.() || {};
        socket.emit('stats:update', stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      const userKey = socket.userId;
      const currentCount = userConnections.get(userKey) || 1;
      userConnections.set(userKey, currentCount - 1);
      
      if (currentCount - 1 <= 0) {
        userConnections.delete(userKey);
      }
      
      console.log(`❌ User disconnected: ${socket.userEmail} (${socket.id}) [Reason: ${reason}] [Remaining: ${currentCount - 1}]`);
      
      // Remove event listeners
      jobStatusEmitter.off('job:created', jobCreatedHandler);
      jobStatusEmitter.off('job:status:updated', jobStatusUpdatedHandler);
      jobStatusEmitter.off('job:dlq', jobDLQHandler);
      jobStatusEmitter.off('job:completed', jobCompletedHandler);
    });
  });

  // Log connection stats every 30 seconds
  setInterval(() => {
    if (userConnections.size > 0) {
      console.log(`📊 Active WebSocket connections: ${userConnections.size} users, ${io.engine.clientsCount} total sockets`);
    }
  }, 30000);

  // Subscribe to Redis events (for cross-process communication)
  subscribeToJobEvents((eventType, data) => {
    console.log(`🔄 Forwarding Redis event to WebSocket: ${eventType}`);
    
    switch(eventType) {
      case 'job:created':
        if (data.userId) {
          io.to(`user:${data.userId}`).emit('job:created', data.job);
        }
        break;
      
      case 'job:status:updated':
        if (data.job && data.job.ownerId) {
          io.to(`user:${data.job.ownerId}`).emit('job:status:updated', {
            jobId: data.job._id,
            oldStatus: data.oldStatus,
            newStatus: data.newStatus,
            job: data.job
          });
        }
        break;
      
      case 'job:completed':
        if (data.job && data.job.ownerId) {
          io.to(`user:${data.job.ownerId}`).emit('job:completed', data.job);
        }
        break;
      
      case 'job:dlq':
        if (data.job && data.job.ownerId) {
          io.to(`user:${data.job.ownerId}`).emit('job:dlq', data.job);
        }
        break;
    }
  });

  return io;
}

module.exports = { initializeWebSocket };

