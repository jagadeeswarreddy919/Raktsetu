const { Server } = require('socket.io');

// In-memory mapping of active user IDs to their socket IDs
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

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Register user session
    socket.on('register', (userId) => {
      if (userId) {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`[Socket] Registered user ${userId} to socket ${socket.id}`);
        
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

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user_status', { userId: socket.userId, status: 'offline' });
      }
    });
  });

  return io;
};

const getSocketId = (userId) => onlineUsers.get(userId);

const notifyUser = (userId, eventName, data) => {
  if (ioInstance && userId) {
    const socketId = getSocketId(userId.toString());
    if (socketId) {
      ioInstance.to(socketId).emit(eventName, data);
      return true;
    }
  }
  return false;
};

const broadcastToUsers = (userIds, eventName, data) => {
  if (ioInstance && Array.isArray(userIds)) {
    userIds.forEach((userId) => {
      if (userId) {
        const socketId = getSocketId(userId.toString());
        if (socketId) {
          ioInstance.to(socketId).emit(eventName, data);
        }
      }
    });
  }
};

module.exports = { initSockets, getSocketId, notifyUser, broadcastToUsers };
