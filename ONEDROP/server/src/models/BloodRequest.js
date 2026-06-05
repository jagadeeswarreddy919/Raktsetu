const mongoose = require('mongoose');

const donorPledgeSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  unitsPledged: { type: Number, default: 1 },
  status: { type: String, enum: ['Pledged', 'Donated', 'Cancelled'], default: 'Pledged' },
  pledgedAt: { type: Date, default: Date.now }
});

const bloodRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  unitsRequired: { type: Number, required: true, default: 1 },
  unitsFulfilled: { type: Number, default: 0 },
  hospitalName: { type: String, required: true },
  
  // Location Hierarchy for database filtering
  country: { type: String, default: 'India' },
  state: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, default: '' },
  village: { type: String, default: '' },
  pincode: { type: String, required: true },
  hospitalAddress: { type: String, required: true },

  emergencyMode: { type: Boolean, default: false },
  neededBy: { type: Date, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Fulfilled', 'Cancelled'], default: 'Pending' },
  requestStatus: { type: String, enum: ['Pending', 'Accepted', 'Fulfilled', 'Cancelled'], default: 'Pending' },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  donorsPledged: [donorPledgeSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from creation
    index: { expires: 0 } // native TTL index
  }
});

bloodRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
