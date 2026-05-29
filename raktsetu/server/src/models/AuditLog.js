const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. "USER_LOGIN", "USER_REGISTER", "DONOR_VERIFY", "BLOOD_REQUEST_CREATE"
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed }, // Arbitrary diagnostic metadata
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
