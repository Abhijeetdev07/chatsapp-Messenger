const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const registerConversationHandlers = require('./conversationSocketHandler');

let io;

// In-memory mapping to support multiple simultaneous connections (e.g. multi-tab)
// Structure: Map<UserId(string), Set<SocketId(string)>>
const userSocketMap = new Map(); 

/**
 * Retrieve all active socket IDs for a specific user.
 * @param {string} userId 
 * @returns {string[]} Array of connected Socket.IO IDs
 */
const getReceiverSocketIds = (userId) => {
  return Array.from(userSocketMap.get(userId.toString()) || []);
};

/**
 * Initialize Socket.IO server attached to Http server
 * @param {import('http').Server} server 
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'http://localhost:8081'
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.IO Middleware for Authentication
  io.use(async (socket, next) => {
    try {
      // Allow token from handshake auth or headers
      const token = socket.handshake.auth?.token || 
                    (socket.handshake.headers?.authorization && 
                     socket.handshake.headers.authorization.split(' ')[1]);
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      // Verify token matches secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch authenticated user properties natively
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user property to the socket globally
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket Auth Error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket connected: ${socket.id} (User: ${socket.user.username})`);

    // Map user to socket ID upon connection globally
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    // Join a uniquely named personal room for convenience
    socket.join(`user_${userId}`);

    // Register Modular Handlers
    registerConversationHandlers(io, socket, userSocketMap);

    // Listen for graceful websocket disconnects
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (User: ${socket.user.username})`);
      
      const userSockets = userSocketMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // Fully remove user registry if they closed all tabs
        if (userSockets.size === 0) {
          userSocketMap.delete(userId);
          // Broadcast offline presence
          const { handleDisconnectPresence } = require('./conversationSocketHandler');
          handleDisconnectPresence(io, userSocketMap, userId);
        }
      }
    });
  });

  return io;
};

/**
 * Retrieve the existing io instance logic
 * @returns {Server}
 */
const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

module.exports = { initSocket, getIo, getReceiverSocketIds };
