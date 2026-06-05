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
app.set('trust proxy', 1); // Trust the Render reverse proxy to get correct client IP for rate limiting
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Rate Limiter Configuration (Configurable via environment variables)
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// Strict rate limiter for sensitive authentication, registration, & OTP endpoints
const authLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: parseInt(process.env.RATE_LIMIT_MAX_AUTH) || 30, // Default 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication or OTP attempts from this IP. Please try again after 15 minutes.' }
});

// Standard rate limiter for general API routes (looser to support SPA telemetry polling)
const generalLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: parseInt(process.env.RATE_LIMIT_MAX_GENERAL) || 5000, // Default 5000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP. Please try again later.' }
});

// Sensitive authentication and recovery endpoints to protect with strict rate limiting
const sensitiveAuthRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/firebase-login',
  '/api/auth/firebase-register',
  '/api/auth/supabase-login',
  '/api/auth/supabase-register',
  '/api/auth/mock-send-verification',
  '/api/auth/mock-verify-email',
  '/api/auth/mock-verify-email-otp',
  '/api/auth/mock-forgot-password',
  '/api/auth/admin-forgot-password',
  '/api/auth/admin-reset-password',
  '/api/auth/user-forgot-password',
  '/api/auth/user-reset-password',
  '/api/auth/admin-forgot-password-email',
  '/api/auth/user-forgot-password-email',
  '/api/auth/admin-verify-otp',
  '/api/auth/user-verify-otp',
  '/api/auth/admin-resend-sms',
  '/api/auth/user-resend-sms'
];

// Register strict rate limiting on all sensitive authentication routes
sensitiveAuthRoutes.forEach(route => {
  app.use(route, authLimiter);
});

// Apply general rate limiting to all other API endpoints
app.use('/api/', generalLimiter);

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
    platform: 'ONEDROP',
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
  console.log(`  ONEDROP BACKEND BOOTED SUCCESSFULLY  `);
  console.log(`  Running on http://localhost:${PORT}   `);
  console.log(`========================================`);
});
