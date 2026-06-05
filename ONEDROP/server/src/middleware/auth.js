const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'onedrop-super-secret-jwt-key';

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. Token missing.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found. Authentication revoked.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'This account has been suspended by an Administrator.' });
    }

    // Attach user payload to request
    req.user = user;
    next();
  } catch (error) {
    console.error(`[Auth Middleware] JWT Error: ${error.message}`);
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

// Role authorization middleware factory
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. Authentication details missing.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Role '${req.user.role}' does not have permissions to perform this action.` 
      });
    }

    next();
  };
};

module.exports = { authenticate, authorizeRoles };
