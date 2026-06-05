const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Location = require('../models/Location');
const Campaign = require('../models/Campaign');
const Blog = require('../models/Blog');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/onedrop';

const sampleLocations = [
  { state: 'Maharashtra', district: 'Mumbai', city: 'Mumbai South', areas: ['Colaba', 'Marine Drive', 'Byculla'], villages: [], pincode: '400001' },
  { state: 'Maharashtra', district: 'Mumbai', city: 'Mumbai North', areas: ['Borivali', 'Andheri', 'Bandra'], villages: [], pincode: '400050' },
  { state: 'Maharashtra', district: 'Pune', city: 'Pune City', areas: ['Kothrud', 'Kalyani Nagar', 'Hadapsar'], villages: ['Wagholi', 'Uruli Kanchan'], pincode: '411001' },
  { state: 'Karnataka', district: 'Bangalore', city: 'Bangalore Urban', areas: ['Koramangala', 'Indiranagar', 'Jayanagar', 'Whitefield'], villages: ['Varthur', 'Gunjur'], pincode: '560034' },
  { state: 'Karnataka', district: 'Mysore', city: 'Mysore City', areas: ['Gokulam', 'Jayalakshmipuram'], villages: ['Chamundi Hill Village'], pincode: '570001' },
  { state: 'Delhi', district: 'New Delhi', city: 'Connaught Place', areas: ['Chanakyapuri', 'Karol Bagh'], villages: [], pincode: '110001' },
  { state: 'Delhi', district: 'South Delhi', city: 'Saket', areas: ['Hauz Khas', 'Greater Kailash'], villages: [], pincode: '110017' }
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database. Setting up seed/admin data...');

    console.log('Upserting cascading locations...');
    for (const loc of sampleLocations) {
      await Location.findOneAndUpdate(
        { pincode: loc.pincode, state: loc.state, district: loc.district, city: loc.city },
        loc,
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded/verified ${sampleLocations.length} cascading locations.`);

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash('password123', salt);

    console.log('Seeding administrative and role-specific accounts...');

    // 1. Super Admin
    const superAdmin = await User.findOneAndUpdate(
      { email: 'onedropu@gmail.com' },
      {
        fullName: 'Jagadeeswar reddy',
        password: hashPassword,
        phone: '8500508940',
        role: 'Super Admin',
        state: 'andhra pradesh',
        district: 'Kadapa',
        city: 'Proddatur',
        pincode: '516362',
        referralCode: 'SUPER100',
        rewardPoints: 500,
        badges: ['Platform Founder']
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2. Hospital Admin
    const hospital = await User.findOneAndUpdate(
      { email: 'info@metrohospital.com' },
      {
        fullName: 'Metro General Hospital',
        password: hashPassword,
        phone: '8023456789',
        role: 'Hospital',
        state: 'Karnataka',
        district: 'Bangalore',
        city: 'Bangalore Urban',
        pincode: '560034',
        address: '100 Feet Road, Koramangala',
        hospitalLicenseNumber: 'MHL-2026-9872',
        isVerifiedHospital: true,
        bloodInventory: {
          'A+': 15, 'A-': 5, 'B+': 22, 'B-': 3, 'AB+': 8, 'AB-': 2, 'O+': 30, 'O-': 12
        },
        referralCode: 'METROHOSP',
        rewardPoints: 100
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Seeded Administrative Users.');

    console.log('Seeding Campaigns & Drives...');
    await Campaign.findOneAndUpdate(
      { title: 'Mega Summer Blood Donation Camp' },
      {
        description: 'Join us at Metro General Hospital for our annual blood collection drive. Ensure adequate stock for critical surgeries.',
        organizer: hospital._id,
        startDate: new Date('2026-06-01T09:00:00Z'),
        endDate: new Date('2026-06-01T18:00:00Z'),
        locationName: 'Hospital Central Parking Lot',
        state: 'Karnataka',
        district: 'Bangalore',
        city: 'Bangalore Urban',
        pincode: '560034',
        bannerImage: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?q=80&w=600&auto=format&fit=crop',
        status: 'Active'
      },
      { upsert: true, new: true }
    );

    console.log('Seeding Blogs...');
    await Blog.findOneAndUpdate(
      { title: '5 Life-Saving Benefits of Regular Blood Donation' },
      {
        content: 'Blood donation is not just life-saving for the recipient; it also benefits the donor in multiple ways including reducing excessive iron stores, burning calories, and stimulating blood cell reproduction. Read on to learn more...',
        author: superAdmin._id,
        tags: ['Health', 'Education', 'Blood Donation'],
        coverImage: 'https://images.unsplash.com/photo-1536856788636-419b89e47d13?q=80&w=600&auto=format&fit=crop'
      },
      { upsert: true, new: true }
    );

    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding encountered an error:', err);
    process.exit(1);
  }
}

seed();
