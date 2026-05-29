const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Hospital or Admin
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  locationName: { type: String, required: true }, // e.g. "Community Hall"
  
  // Cascading location tags
  country: { type: String, default: 'India' },
  state: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, default: '' },
  pincode: { type: String, required: true },

  bannerImage: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Campaign', campaignSchema);
