const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('./firebase');
require('dotenv').config();

async function sendDemo() {
  try {
    const uri = process.env.MONGO_URI;
    console.log('Connecting to database...');
    await mongoose.connect(uri);
    console.log('Connected!');

    // Find users with registered FCM tokens
    const users = await User.find({ fcmToken: { $ne: '' } });
    console.log(`Found ${users.length} users with FCM tokens.`);

    // Always create demo notification for all active users so they see it in the dashboard
    const allUsers = await User.find({ status: 'Active' });
    console.log(`Creating in-app demo notifications for all ${allUsers.length} active users.`);
    
    const notifications = allUsers.map(user => ({
      recipient: user._id,
      type: 'general_announcement',
      message: '📢 [Demo Notification] This is a test notification to confirm that your ONEDROP alerts are fully active!',
      requestStatus: 'None'
    }));

    await Notification.insertMany(notifications);
    console.log('Successfully created in-app demo notifications in the database.');

    // Dispatch FCM pushes to users with active tokens
    if (users.length > 0) {
      for (const user of users) {
        console.log(`Sending FCM push alert to ${user.fullName} (${user.email})...`);
        const res = await sendPushNotification(user.fcmToken, {
          title: 'Welcome to ONEDROP',
          body: '📢 This is a demo notification to confirm that your push alerts are fully active!',
          data: {
            type: 'general_announcement'
          }
        });
        console.log(`Push result for ${user.fullName}:`, res);
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected!');
  } catch (err) {
    console.error('Error sending demo notification:', err);
  }
}

sendDemo();
