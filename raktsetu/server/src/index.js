require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const { initSockets } = require('./config/socket');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const requestRoutes = require('./routes/requestRoutes');
const chatRoutes = require('./routes/chatRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const blogRoutes = require('./routes/blogRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const galleryRoutes = require('./routes/galleryRoutes');

const app = express();
const server = http.createServer(app);

// Initialize database
connectDB();

// Initialize Socket.IO
initSockets(server);

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading uploaded assets directly in frontend
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express parser & static upload routes
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Loosened for local testing (limit each IP to 100000 requests per windowMs)
  message: { message: 'Too many requests from this IP. Please try again later.' }
});
app.use('/api/', apiLimiter);

// Route Bindings
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gallery', galleryRoutes);

// Base Router status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    platform: 'RAKTSETU',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// Error handling fallback
app.use((err, req, res, next) => {
  console.error(`[Server Error] ${err.message}`);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Auto-cleanup expired blood requests (older than 4 hours) every 5 minutes as a fallback
const BloodRequest = require('./models/BloodRequest');
setInterval(async () => {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const result = await BloodRequest.deleteMany({
      createdAt: { $lt: fourHoursAgo }
    });
    if (result.deletedCount > 0) {
      console.log(`[Auto-Cleanup] Automatically purged ${result.deletedCount} expired blood requests older than 4 hours.`);
    }
  } catch (err) {
    console.error(`[Auto-Cleanup] Failed to run expired requests cleanup: ${err.message}`);
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  RAKTSETU BACKEND BOOTED SUCCESSFULLY  `);
  console.log(`  Running on http://localhost:${PORT}   `);
  console.log(`========================================`);
});
