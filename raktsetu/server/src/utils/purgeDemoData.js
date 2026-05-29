/**
 * Removes seed/demo records from the database.
 * Keeps users who registered outside the seed email list.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Campaign = require('../models/Campaign');
const Blog = require('../models/Blog');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/raktsetu';

const SEED_EMAILS = [
  'raktsetuu@gmail.com',
  'info@metrohospital.com',
  'aarav@gmail.com',
  'priya@gmail.com',
  'rohan@gmail.com'
];

async function purge() {
  await mongoose.connect(MONGO_URI);
  console.log('[Purge] Connected to MongoDB');

  const seedUsers = await User.find({ email: { $in: SEED_EMAILS } }).select('_id email');
  const seedUserIds = seedUsers.map((u) => u._id);

  await Notification.deleteMany({});
  await Message.deleteMany({});
  await Chat.deleteMany({});
  await BloodRequest.deleteMany({});

  if (seedUserIds.length) {
    await User.deleteMany({ _id: { $in: seedUserIds } });
    console.log(`[Purge] Removed ${seedUserIds.length} seed user accounts.`);
  }

  await Blog.deleteMany({});
  await Campaign.deleteMany({});
  console.log('[Purge] Cleared all demo campaigns and blogs.');

  const remaining = {
    donors: await User.countDocuments({ role: 'Donor' }),
    recipients: await User.countDocuments({ role: 'Recipient' }),
    hospitals: await User.countDocuments({ role: 'Hospital' })
  };
  console.log('[Purge] Remaining registered users:', remaining);

  await mongoose.disconnect();
  process.exit(0);
}

purge().catch((err) => {
  console.error('[Purge] Failed:', err);
  process.exit(1);
});
