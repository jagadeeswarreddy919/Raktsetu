const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkUsers() {
  try {
    const uri = process.env.MONGO_URI;
    console.log('Connecting to database...');
    await mongoose.connect(uri);
    console.log('Connected!');

    const users = await User.find({});
    console.log(`Found ${users.length} users in the database:`);
    users.forEach(u => {
      console.log(`- ID: ${u._id}, Name: ${u.fullName}, Email: ${u.email}, Phone: ${u.phone}, Role: ${u.role}, Status: ${u.status}`);
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
