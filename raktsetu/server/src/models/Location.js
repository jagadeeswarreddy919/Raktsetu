const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  country: { type: String, default: 'India' },
  state: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, required: true },
  areas: [{ type: String }],
  villages: [{ type: String }],
  pincode: { type: String, required: true }
});

// Indexes for super fast cascading lookups and auto-complete
locationSchema.index({ state: 1, district: 1, city: 1 });
locationSchema.index({ pincode: 1 });

module.exports = mongoose.model('Location', locationSchema);
