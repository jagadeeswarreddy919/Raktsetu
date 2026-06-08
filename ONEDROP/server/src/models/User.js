const mongoose = require('mongoose');

const referralHistorySchema = new mongoose.Schema({
  referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pointsEarned: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: function() { return !this.firebaseUid && !this.supabaseUid; } },
  firebaseUid: { type: String, unique: true, sparse: true },
  supabaseUid: { type: String, unique: true, sparse: true },
  isEmailVerified: { type: Boolean, default: true },
  phone: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['Super Admin', 'Admin', 'Donor', 'Recipient', 'Hospital'], 
    default: 'Donor' 
  },
  status: { type: String, enum: ['Active', 'Pending', 'Suspended'], default: 'Active' },
  profileImage: { type: String, default: '' },
  
  // Location Hierarchy (Map-free Database Filtering)
  country: { type: String, default: 'India' },
  state: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, default: '' },
  village: { type: String, default: '' },
  pincode: { type: String, required: true },
  address: { type: String, default: '' },

  // Donor-specific Profiles
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: function() { return this.role === 'Donor'; } },
  DOB: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  weight: { type: Number }, // in kgs
  medicalConditions: [{ type: String }],
  allergies: [{ type: String }],
  lastDonationDate: { type: Date },
  availability: { type: Boolean, default: true },
  availabilityStatus: { type: String, enum: ['Available', 'Busy', 'Not Available', 'Emergency Only'], default: 'Available' },
  isVerifiedDonor: { type: Boolean, default: false },
  fcmToken: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [79.4192, 13.6288] }
  },

  // Hospital-specific Profiles
  hospitalLicenseNumber: { type: String, required: function() { return this.role === 'Hospital'; } },
  isVerifiedHospital: { type: Boolean, default: false },
  bloodInventory: {
    'A+': { type: Number, default: 0 },
    'A-': { type: Number, default: 0 },
    'B+': { type: Number, default: 0 },
    'B-': { type: Number, default: 0 },
    'AB+': { type: Number, default: 0 },
    'AB-': { type: Number, default: 0 },
    'O+': { type: Number, default: 0 },
    'O-': { type: Number, default: 0 }
  },

  // Referral / Reward System
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalReferrals: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },
  referralRank: { type: Number, default: 9999 },
  referralHistory: [referralHistorySchema],
  badges: [{ type: String }], // 'First Invite', 'Life Saver', 'Century Club'

  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  emailOtp: { type: String, default: null },
  emailOtpExpires: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  this.availability = (this.availabilityStatus === 'Available' || this.availabilityStatus === 'Emergency Only');
  
  if (this.role === 'Donor') {
    try {
      const DonorStatus = require('./DonorStatus');
      await DonorStatus.findOneAndUpdate(
        { donor: this._id },
        {
          availabilityStatus: this.availabilityStatus,
          place: `${this.city || ''}, ${this.district || ''}, ${this.state || ''}`.trim(),
          pincode: this.pincode || '',
          lastUpdated: Date.now()
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('[User Pre-Save Sync] Failed to sync DonorStatus:', err.message);
    }
  }
  next();
});

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
