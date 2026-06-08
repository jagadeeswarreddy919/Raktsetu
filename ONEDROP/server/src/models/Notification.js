const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bloodRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  type: {
    type: String,
    enum: [
      'new_request', 'request_accepted', 'emergency_request', 'donor_unavailable', 'chat_message', 'greeting',
      'camp_announcement', 'eligibility_reminder', 'certificate_issued', 'ngo_hospital_update', 'general_announcement'
    ],
    required: true
  },
  message: { type: String, required: true },
  requestStatus: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'None'],
    default: 'None'
  },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Post-save hook to automatically push notifications to WhatsApp (excluding 'greeting' type)
notificationSchema.post('save', async function(doc) {
  try {
    if (doc.type === 'greeting') {
      console.log('[Notification Post-Save Hook] Greeting type notification exempted from WhatsApp dispatch.');
      return;
    }

    const User = mongoose.model('User');
    const user = await User.findById(doc.recipient);
    if (user && user.phone) {
      console.log(`[Notification Post-Save Hook] Dispatched auto WhatsApp push alert for type "${doc.type}" to ${user.phone}`);
      const { sendWhatsApp } = require('../utils/whatsapp');
      await sendWhatsApp({
        to: user.phone,
        message: doc.message
      });
    } else {
      console.warn(`[Notification Post-Save Hook] No recipient or phone number found for user ID: ${doc.recipient}`);
    }
  } catch (err) {
    console.error('[Notification Post-Save Hook Error]:', err.message);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
