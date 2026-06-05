const mongoose = require('mongoose');
const BloodRequest = require('../models/BloodRequest');
require('dotenv').config();

async function checkRequests() {
  try {
    const uri = process.env.MONGO_URI;
    console.log('Connecting to database...');
    await mongoose.connect(uri);
    console.log('Connected!');

    const requests = await BloodRequest.find({});
    console.log(`Found ${requests.length} requests in the database:`);
    requests.forEach(r => {
      console.log(`- ID: ${r._id}, Patient: ${r.patientName}, Status: ${r.status}, Requester: ${r.requester}, BloodGroup: ${r.bloodGroup}`);
    });

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRequests();
