const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'onedrop-super-secret-jwt-key';

// In-memory mapping of active user IDs to a Set of their active socket IDs
const onlineUsers = new Map();
let ioInstance = null;

const initSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  ioInstance = io;

  // Listen to engine connection errors for diagnostics
  io.engine.on("connection_error", (err) => {
    console.warn(`[Socket Engine Connection Error] Code ${err.code}: ${err.message}`);
  });

  // Verify JWT token during handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        console.log(`[Socket Auth] Socket ${socket.id} authenticated for user ${decoded.id}`);
      }
      next();
    } catch (err) {
      console.warn(`[Socket Auth Warning] Handshake token verification failed: ${err.message}`);
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Register user session
    socket.on('register', (userId) => {
      if (userId) {
        // Support multiple sockets per user for concurrent logins
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }
        
        const sockets = onlineUsers.get(userId);
        sockets.add(socket.id);
        socket.userId = userId;
        console.log(`[Socket] Registered user ${userId} to socket ${socket.id} (Total sockets: ${sockets.size})`);
        
        // Broadcast user status change
        io.emit('user_status', { userId, status: 'online' });
      }
    });

    // Enter a chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`[Socket] Socket ${socket.id} joined chat room: ${chatId}`);
    });

    // Typing Indicators
    socket.on('typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('typing', { chatId, userId });
    });

    socket.on('stop_typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('stop_typing', { chatId, userId });
    });

    // Send instant messaging
    socket.on('send_message', (message) => {
      // message has: chat, sender, text, fileUrl, fileType, _id, createdAt
      socket.to(message.chat.toString()).emit('new_message', message);
    });

    // Receive emergency alerts broadcast
    socket.on('emergency_broadcast', (alertData) => {
      // alertData contains: request, state, district, city, message
      // Broadcast to everyone. The client-side will filter by regional proximity
      console.log(`[Socket] Broadcasting emergency alert in ${alertData.city}: ${alertData.message}`);
      io.emit('emergency_alert', alertData);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.userId) {
        const sockets = onlineUsers.get(socket.userId);
        if (sockets) {
          sockets.delete(socket.id);
          console.log(`[Socket] Removed socket ${socket.id} for user ${socket.userId}. Remaining: ${sockets.size}`);
          if (sockets.size === 0) {
            onlineUsers.delete(socket.userId);
            io.emit('user_status', { userId: socket.userId, status: 'offline' });
            console.log(`[Socket] User ${socket.userId} is now fully offline`);
          }
        }
      }
    });
  });

  return io;
};

// Returns one of the active socket IDs for backwards compatibility if needed
const getSocketId = (userId) => {
  const sockets = onlineUsers.get(userId);
  return sockets && sockets.size > 0 ? Array.from(sockets)[0] : null;
};

const notifyUser = (userId, eventName, data) => {
  if (ioInstance && userId) {
    const sockets = onlineUsers.get(userId.toString());
    if (sockets && sockets.size > 0) {
      console.log(`[Socket Notify] Sending event '${eventName}' to user ${userId} across ${sockets.size} active sockets`);
      sockets.forEach(socketId => {
        ioInstance.to(socketId).emit(eventName, data);
      });
      return true;
    } else {
      console.log(`[Socket Notify] User ${userId} is offline`);
    }
  }
  return false;
};

const broadcastToUsers = (userIds, eventName, data) => {
  if (ioInstance && Array.isArray(userIds)) {
    userIds.forEach((userId) => {
      if (userId) {
        const sockets = onlineUsers.get(userId.toString());
        if (sockets && sockets.size > 0) {
          console.log(`[Socket Broadcast] Sending event '${eventName}' to user ${userId} across ${sockets.size} active sockets`);
          sockets.forEach(socketId => {
            ioInstance.to(socketId).emit(eventName, data);
          });
        } else {
          console.log(`[Socket Broadcast] User ${userId} is offline`);
        }
      }
    });
  }
};

module.exports = { initSockets, getSocketId, notifyUser, broadcastToUsers };
