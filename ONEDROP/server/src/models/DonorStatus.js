const mongoose = require('mongoose');

const donorStatusSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  availabilityStatus: {
    type: String,
    enum: ['Available', 'Busy', 'Not Available', 'Emergency Only'],
    default: 'Available',
    required: true
  },
  place: { type: String, default: '' },
  pincode: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
});

donorStatusSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('DonorStatus', donorStatusSchema);
