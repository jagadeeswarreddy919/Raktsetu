const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetRole: { type: String, default: 'All' },
  bloodGroup: { type: String, default: 'All' },
  locationFilter: {
    city: { type: String, default: '' },
    state: { type: String, default: '' }
  },
  donorStatusFilter: { type: String, default: 'All' },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  successCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
