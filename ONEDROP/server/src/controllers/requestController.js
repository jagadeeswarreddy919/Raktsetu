const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { notifyUser } = require('../config/socket');
const { sendPushNotification } = require('../utils/firebase');
const { sendMail } = require('../config/mail');
const { sendSMS } = require('../utils/sms');

// Helper: Gorgeous HTML email template wrapper
const getEmailTemplate = (title, message, actionUrl, actionText) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 30px;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
      padding: 40px;
      text-align: center;
      color: #ffffff;
    }
    .logo {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .content {
      padding: 40px;
      color: #334155;
    }
    h2 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 16px 0;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 24px 0;
      color: #475569;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #e11d48;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 30px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(225, 29, 72, 0.15);
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="logo">ONEDROP</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Emergency Registry Platform</p>
    </div>
    <div class="content">
      <h2>${title}</h2>
      <p>${message}</p>
      <div class="btn-container">
        <a href="${actionUrl}" class="btn" target="_blank">${actionText}</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} ONEDROP. All rights reserved.</p>
      <p style="margin: 4px 0 0 0;">Connecting Lives through Blood Coordinates.</p>
    </div>
  </div>
</body>
</html>
`;

exports.createRequest = async (req, res) => {
  try {
    const {
      patientName, bloodGroup, unitsRequired, hospitalName,
      state, district, city, area, village, pincode, hospitalAddress,
      emergencyMode, neededBy, reason
    } = req.body;

    const newRequest = await BloodRequest.create({
      requester: req.user.id,
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      state,
      district,
      city,
      area,
      village,
      pincode,
      hospitalAddress,
      emergencyMode: emergencyMode || false,
      neededBy,
      reason
    });

    await AuditLog.create({
      action: 'BLOOD_REQUEST_CREATE',
      performedBy: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      details: { requestId: newRequest._id, bloodGroup, emergencyMode }
    });

    // ----------------------------------------------------
    // AUTOMATIC SMART MATCHING & REAL-TIME NOTIFICATIONS
    // ----------------------------------------------------
    try {
      const donorQuery = {
        _id: { $ne: req.user.id },
        role: 'Donor',
        bloodGroup: bloodGroup,
        // Exclude 'Busy' and 'Not Available'
        availabilityStatus: { $in: ['Available', 'Emergency Only'] }
      };

      // If NOT in emergency mode, exclude 'Emergency Only' donors
      if (!emergencyMode) {
        donorQuery.availabilityStatus = 'Available';
      }

      // Restrict notifications: send blood requests to matching local area only.
      // Admin alert notifications bypass location filters to reach all users system-wide.
      const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super Admin';
      if (!isAdmin) {
        const locationFilters = [];
        if (pincode) locationFilters.push({ pincode });
        if (village) locationFilters.push({ village });
        if (area) locationFilters.push({ area });
        
        // District-wide match (State + District)
        const localAreaMatch = {};
        if (state) localAreaMatch.state = state;
        if (district) localAreaMatch.district = district;
        
        if (Object.keys(localAreaMatch).length > 0) {
          locationFilters.push(localAreaMatch);
        }
        
        if (locationFilters.length > 0) {
          donorQuery.$or = locationFilters;
        }
      }

      // Fetch matching donors
      const matchingDonors = await User.find(donorQuery);

      // Fetch matching hospitals and blood banks in the same district/local area
      const hospitalQuery = {
        role: 'Hospital'
      };
      if (!isAdmin) {
        const hospLocationFilters = [];
        if (pincode) hospLocationFilters.push({ pincode });
        if (village) hospLocationFilters.push({ village });
        if (area) hospLocationFilters.push({ area });
        
        const localHospMatch = {};
        if (state) localHospMatch.state = state;
        if (district) localHospMatch.district = district;
        
        if (Object.keys(localHospMatch).length > 0) {
          hospLocationFilters.push(localHospMatch);
        }
        
        if (hospLocationFilters.length > 0) {
          hospitalQuery.$or = hospLocationFilters;
        }
      }
      const matchingHospitals = await User.find(hospitalQuery);

      const allAlertRecipients = [
        ...matchingDonors.map(d => ({ user: d, isDonor: true })),
        ...matchingHospitals.map(h => ({ user: h, isDonor: false }))
      ];

      if (allAlertRecipients.length > 0) {
        // Save persistent notifications to the DB
        const notificationsData = allAlertRecipients.map(recipient => ({
          recipient: recipient.user._id,
          donor: req.user.id,
          bloodRequest: newRequest._id,
          type: emergencyMode ? 'emergency_request' : 'new_request',
          message: recipient.isDonor
            ? `🚨 Emergency! ${bloodGroup} blood request received for ${patientName} at ${hospitalName}, ${city}.`
            : `🚨 Proximity Alert! ${bloodGroup} blood request received for ${patientName} at ${hospitalName}, ${city}. Please check inventory status.`,
          requestStatus: 'Pending'
        }));

        await Notification.insertMany(notificationsData);

        // Dispatch alerts
        allAlertRecipients.forEach(async (recipient) => {
          const recUser = recipient.user;
          
          notifyUser(recUser._id, 'new_blood_request', {
            request: newRequest,
            requestId: newRequest._id,
            requester: req.user.id,
            requesterId: req.user.id,
            patientName,
            bloodGroup,
            unitsRequired,
            hospitalName,
            place: `${city}, ${district}, ${state}`,
            pincode,
            emergencyMode,
            neededBy,
            contactNumber: req.user.phone,
            createdAt: newRequest.createdAt
          });

          if (recUser.fcmToken) {
            sendPushNotification(recUser.fcmToken, {
              title: emergencyMode ? '🚨 EMERGENCY BLOOD MATCH REQUIRED' : 'Blood Match Request Found',
              body: `Patient: ${patientName} requires ${unitsRequired} units of ${bloodGroup} at ${hospitalName}.`,
              data: {
                type: emergencyMode ? 'emergency_request' : 'new_request',
                requestId: newRequest._id.toString(),
                requesterId: req.user.id.toString(),
                chatPartnerId: req.user.id.toString()
              }
            });
          }

          if (recipient.isDonor) {
            // Trigger SMS alert to the matching donor
            try {
              const smsMessage = `🚨 ONEDROP EMERGENCY: ${bloodGroup} blood match required for ${patientName} at ${hospitalName}, ${city}. Proximity matching active. Accept request on your dashboard.`;
              await sendSMS({
                to: recUser.phone,
                message: smsMessage
              });
            } catch (smsErr) {
              console.error(`[Request Alerts] SMS dispatch failed for donor ${recUser.fullName}:`, smsErr.message);
            }
          }

          // Trigger HTML email alert to the matching donor/hospital
          try {
            const emailHtml = getEmailTemplate(
              emergencyMode ? '🚨 Urgent: Emergency Blood Request Match' : 'Blood Donation Request Match Found',
              recipient.isDonor
                ? `Dear ${recUser.fullName},<br><br>` +
                  `A new blood request matching your blood group (<strong>${bloodGroup}</strong>) has been registered in your area.<br><br>` +
                  `<strong>Patient Name:</strong> ${patientName}<br>` +
                  `<strong>Units Required:</strong> ${unitsRequired} Units<br>` +
                  `<strong>Hospital Location:</strong> ${hospitalName}, ${city}, ${state}<br>` +
                  `<strong>Proximity Pincode:</strong> ${pincode}<br>` +
                  `<strong>Emergency Mode:</strong> ${emergencyMode ? 'URGENT/CRITICAL' : 'Standard'}<br><br>` +
                  `If you are eligible and currently available to donate, please access your dashboard to accept the request and coordinate direct secure communications.`
                : `Dear Medical Partner at ${recUser.fullName},<br><br>` +
                  `A new proximity blood request has been registered for patient <strong>${patientName}</strong>.<br><br>` +
                  `<strong>Blood Group Required:</strong> <strong>${bloodGroup}</strong><br>` +
                  `<strong>Units Required:</strong> ${unitsRequired} Units<br>` +
                  `<strong>Target Hospital/Clinic:</strong> ${hospitalName}, ${city}, ${state}<br>` +
                  `<strong>Proximity Pincode:</strong> ${pincode}<br><br>` +
                  `Please check your blood bank inventory and coordinate if you can help fulfill this request.`,
              recipient.isDonor ? `http://localhost:5173/donor-dashboard` : `http://localhost:5173/hospital-dashboard`,
              recipient.isDonor ? 'Pledge Blood Donation' : 'Go to Hospital Portal'
            );
            await sendMail({
              to: recUser.email,
              subject: emergencyMode ? `🚨 EMERGENCY: ${bloodGroup} Match Required!` : `Blood Match Found: ${bloodGroup}`,
              html: emailHtml
            });
          } catch (mailErr) {
            console.error(`[Request Alerts] Email dispatch failed for ${recUser.fullName}:`, mailErr.message);
          }
        });
      }
    } catch (matchErr) {
      console.error('[Smart Matcher] Failed to notify matching donors:', matchErr.message);
    }

    res.status(201).json({ message: 'Blood request registered successfully.', request: newRequest });
  } catch (error) {
    console.error(`[Request Controller] Create error: ${error.message}`);
    res.status(500).json({ message: 'Failed to create blood request.', error: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { state, district, city, bloodGroup, emergencyMode, status } = req.query;
    
    const filter = {};
    if (state) filter.state = state;
    if (district) filter.district = district;
    if (city) filter.city = city;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (emergencyMode !== undefined) filter.emergencyMode = emergencyMode === 'true';
    if (status) filter.status = status;

    const requests = await BloodRequest.find(filter)
      .populate('requester', 'fullName phone email profileImage')
      .populate('donorsPledged.donor', 'fullName phone email bloodGroup')
      .sort({ emergencyMode: -1, createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests.', error: error.message });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requester', 'fullName phone email profileImage role')
      .populate('donorsPledged.donor', 'fullName phone email bloodGroup pincode availability');
      
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving request details.', error: error.message });
  }
};

exports.pledgeDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { unitsPledged } = req.body;

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    if (request.status === 'Fulfilled' || request.status === 'Cancelled') {
      return res.status(400).json({ message: 'This request is no longer accepting pledges.' });
    }

    // Check if user already pledged
    const alreadyPledged = request.donorsPledged.some(
      (p) => p.donor.toString() === req.user.id
    );
    if (alreadyPledged) {
      return res.status(400).json({ message: 'You have already pledged to this blood request.' });
    }

    request.donorsPledged.push({
      donor: req.user.id,
      unitsPledged: unitsPledged || 1,
      status: 'Pledged'
    });

    // Update status to Fulfilled, acceptedBy, and requestStatus
    request.status = 'Fulfilled';
    request.requestStatus = 'Accepted';
    request.acceptedBy = req.user.id;
    await request.save();

    // Fetch accepting donor information first to use details in all channels
    const donorUser = await User.findById(req.user.id).select('fullName phone bloodGroup profileImage rewardPoints isVerifiedDonor lastDonationDate state district city');

    const cleanWaPhone = donorUser.phone.trim().replace(/\s+/g, '');
    let targetWa = cleanWaPhone;
    if (!targetWa.startsWith('+')) {
      if (targetWa.length === 10) {
        targetWa = `91${targetWa}`;
      }
    } else {
      targetWa = targetWa.replace('+', '');
    }

    const contactDetailsMessage = `❤️ Great news! Your blood request for ${request.patientName} has been accepted by donor ${donorUser.fullName} (${donorUser.bloodGroup}).\n\n📞 Call Donor: ${donorUser.phone}\n💬 WhatsApp Donor: https://wa.me/${targetWa}\n💬 Chat on Platform: http://localhost:5173/chat`;

    // Create a persistent notification for the recipient
    const recipientId = request.requester;
    await Notification.create({
      recipient: recipientId,
      donor: req.user.id,
      bloodRequest: request._id,
      type: 'request_accepted',
      message: contactDetailsMessage,
      requestStatus: 'Accepted',
      acceptedBy: req.user.id
    });

    // Emit live WebSocket notification to recipient
    notifyUser(recipientId, 'request_accepted', {
      requestId: request._id,
      message: `Your request for ${request.patientName} has been accepted by ${donorUser.fullName}!`,
      donor: donorUser,
      donorId: req.user.id,
      request
    });

    // Trigger FCM push notifications
    const recipientUser = await User.findById(recipientId);
    if (recipientUser && recipientUser.fcmToken) {
      sendPushNotification(recipientUser.fcmToken, {
        title: '❤️ Blood Request Accepted!',
        body: `${donorUser.fullName} (${donorUser.bloodGroup}) accepted! Call: ${donorUser.phone}.`,
        data: {
          type: 'request_accepted',
          requestId: request._id.toString(),
          chatPartnerId: req.user.id.toString(),
          senderId: req.user.id.toString()
        }
      });
    }

    // Send email & SMS to recipient user informing them of the acceptance
    if (recipientUser) {
      // 1. Send SMS alert
      try {
        const acceptSms = `❤️ ONEDROP: Your request for ${request.patientName} was accepted by donor ${donorUser.fullName} (${donorUser.bloodGroup}). Call: ${donorUser.phone}, WA: https://wa.me/${targetWa}, Chat: http://localhost:5173/chat`;
        await sendSMS({
          to: recipientUser.phone,
          message: acceptSms
        });
      } catch (smsErr) {
        console.error('[Pledge Alerts] SMS failed for recipient:', smsErr.message);
      }

      // 2. Send HTML Email
      try {
        const emailHtml = getEmailTemplate(
          'Blood Request Accepted!',
          `Dear ${recipientUser.fullName},<br><br>` +
          `Great news! Your blood request for patient <strong>${request.patientName}</strong> has been accepted by a verified donor.<br><br>` +
          `<strong>Donor Name:</strong> ${req.user.fullName}<br>` +
          `<strong>Blood Group:</strong> ${donorUser.bloodGroup}<br>` +
          `<strong>Contact Phone:</strong> ${donorUser.phone}<br><br>` +
          `Please coordinate with the donor directly by entering your real-time peer-to-peer Chat Workspace.`,
          `http://localhost:5173/chat`,
          'Open Chat Workspace'
        );
        await sendMail({
          to: recipientUser.email,
          subject: '❤️ Your Blood Request has been Accepted!',
          html: emailHtml
        });
      } catch (mailErr) {
        console.error('[Pledge Alerts] Email failed for recipient:', mailErr.message);
      }
    }

    await AuditLog.create({
      action: 'DONATION_PLEDGE',
      performedBy: req.user.id,
      role: req.user.role,
      details: { requestId: id, units: unitsPledged, autoDeleted: false }
    });

    res.status(200).json({ message: 'Thank you for your generous pledge! The request has been successfully accepted and scheduled.', request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to pledge donation.', error: error.message });
  }
};

exports.updatePledgeStatus = async (req, res) => {
  try {
    const { id, pledgeId } = req.params;
    const { status } = req.body; // 'Donated', 'Cancelled'

    if (!['Donated', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid pledge status transition.' });
    }

    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    // Only requester (recipient/hospital) or admin can verify the completed donation
    if (request.requester.toString() !== req.user.id && !['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized to verify this donation pledge.' });
    }

    const pledge = request.donorsPledged.id(pledgeId);
    if (!pledge) {
      return res.status(404).json({ message: 'Pledge record not found.' });
    }

    if (pledge.status !== 'Pledged') {
      return res.status(400).json({ message: 'This pledge status has already been finalized.' });
    }

    pledge.status = status;

    if (status === 'Donated') {
      request.unitsFulfilled += pledge.unitsPledged;
      
      // Update donor statistics & credit reward points
      const donor = await User.findById(pledge.donor);
      if (donor) {
        donor.rewardPoints += 200; // Lifesaver points
        donor.lastDonationDate = new Date();
        
        // Count total successful donations in requests
        const pastDonationsCount = await BloodRequest.countDocuments({
          'donorsPledged': {
            $elemMatch: { donor: donor._id, status: 'Donated' }
          }
        });
        
        const totalSuccessful = pastDonationsCount + 1;
        if (totalSuccessful >= 1 && !donor.badges.includes('Bronze Lifesaver')) {
          donor.badges.push('Bronze Lifesaver');
        }
        if (totalSuccessful >= 5 && !donor.badges.includes('Gold Lifesaver')) {
          donor.badges.push('Gold Lifesaver');
        }

        await donor.save();

        // Create persistent appreciation greeting notification in MongoDB
        try {
          const appreciationMessage = `🎉 Thank you, ${donor.fullName}! Your blood donation for ${request.patientName} has been successfully verified. You have earned 200 Reward Points and an Appreciation Certificate! ❤️`;
          await Notification.create({
            recipient: donor._id,
            type: 'greeting',
            message: appreciationMessage,
            requestStatus: 'None'
          });

          // Dispatch live socket notification to donor
          notifyUser(donor._id, 'donation_verified', {
            requestId: request._id,
            message: appreciationMessage,
            rewardPoints: 200,
            certificate: true
          });

          // Send Thank You Email and SMS to donor
          try {
            const thankYouSms = `🎉 ONEDROP: Thank you, ${donor.fullName}! Your donation for ${request.patientName} has been verified. You've earned 200 Reward Points! ❤️`;
            await sendSMS({
              to: donor.phone,
              message: thankYouSms
            });
          } catch (smsErr) {
            console.error('[Verify Alerts] SMS failed for donor:', smsErr.message);
          }

          try {
            const emailHtml = getEmailTemplate(
              '🎉 Thank You for Your Lifesaving Donation!',
              `Dear ${donor.fullName},<br><br>` +
              `Your blood donation for patient <strong>${request.patientName}</strong> at <strong>${request.hospitalName}</strong> has been successfully verified by the requestor.<br><br>` +
              `Your contribution has successfully earned you <strong>+200 Reward Points</strong> (New Balance: ${donor.rewardPoints} Points) and a **Bronze/Gold Lifesaver Milestone Badge**!<br><br>` +
              `We have generated your <strong>Official Certificate of Appreciation</strong> which you can download directly from your dashboard profile.<br><br>` +
              `Thank you for being the bridge that saves lives.`,
              `http://localhost:5173/donor-dashboard`,
              'View Certificate'
            );
            await sendMail({
              to: donor.email,
              subject: '🎉 Thank you for saving a life!',
              html: emailHtml
            });
          } catch (mailErr) {
            console.error('[Verify Alerts] Email failed for donor:', mailErr.message);
          }
        } catch (notifErr) {
          console.warn('[Notification Error] Failed to create appreciation greeting:', notifErr.message);
        }
      }

      // Also award recipient 50 points for posting and completing
      const requesterUser = await User.findById(request.requester);
      if (requesterUser) {
        requesterUser.rewardPoints += 50;
        await requesterUser.save();
      }
    }

    // Auto-fulfill request if enough units met
    if (request.unitsFulfilled >= request.unitsRequired) {
      request.status = 'Fulfilled';
    }

    await request.save();

    await AuditLog.create({
      action: 'DONATION_VERIFY',
      performedBy: req.user.id,
      role: req.user.role,
      details: { requestId: id, pledgeId, donorId: pledge.donor, outcome: status }
    });

    res.status(200).json({ message: `Pledge status marked as ${status}.`, request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update pledge status.', error: error.message });
  }
};

exports.searchDonors = async (req, res) => {
  try {
    const { state, district, city, pincode, bloodGroup, availabilityStatus, availability, verified, emergency, excludeId } = req.query;

    const query = { role: 'Donor' };
    
    // Exclude 'Busy' and 'Not Available' from standard recipient search
    query.availabilityStatus = { $in: ['Available', 'Emergency Only'] };

    // Exclude the requesting user themselves from results
    if (excludeId) {
      const mongoose = require('mongoose');
      try { query._id = { $ne: new mongoose.Types.ObjectId(excludeId) }; } catch(e) {}
    }

    // Apply strict filters if requested by recipient search
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (state) query.state = state;
    if (district) query.district = district;
    if (city) query.city = city;
    if (pincode) query.pincode = pincode;

    if (verified === 'true') {
      query.isVerifiedDonor = true;
    }
    if (emergency === 'true') {
      query.availabilityStatus = 'Emergency Only';
    } else if (availability === 'true') {
      query.availabilityStatus = 'Available';
    } else if (availabilityStatus) {
      query.availabilityStatus = availabilityStatus;
    }

    let donors = await User.find(query)
      .select('fullName email phone bloodGroup state district city area village pincode availabilityStatus availability isVerifiedDonor lastDonationDate profileImage rewardPoints badges')
      .lean();

    // ----------------------------------------------------
    // PRIORITY MATCH SCORING SYSTEM
    // ----------------------------------------------------
    donors = donors.map(donor => {
      let score = 0;

      // 1. Same blood group
      if (bloodGroup && donor.bloodGroup === bloodGroup) {
        score += 1000;
      }

      // 2. Same place/area coordinates
      if (city && donor.city && donor.city.toLowerCase() === city.toLowerCase()) {
        score += 300;
      }
      if (district && donor.district && donor.district.toLowerCase() === district.toLowerCase()) {
        score += 200;
      }
      if (state && donor.state && donor.state.toLowerCase() === state.toLowerCase()) {
        score += 100;
      }

      // 3. Same pincode
      if (pincode && donor.pincode === pincode) {
        score += 500;
      }

      // 4. Availability Status
      if (donor.availabilityStatus === 'Available') {
        score += 400;
      } else if (donor.availabilityStatus === 'Emergency Only') {
        score += 200;
      }

      // 5. Verified Donors
      if (donor.isVerifiedDonor) {
        score += 300;
      }

      // 6. Active Lifesavers (Fast Responders / High Points)
      score += (donor.rewardPoints || 0) / 10;

      return {
        ...donor,
        matchScore: Math.round(score),
        responseRate: donor.rewardPoints > 500 ? '98%' : donor.rewardPoints > 200 ? '85%' : '70%',
        lastActiveTime: 'Active now'
      };
    });

    // Sort by match score in descending order
    donors.sort((a, b) => b.matchScore - a.matchScore);

    // Call Python AI microservice for extra scoring & ranking if available
    if (state && district && city && bloodGroup && donors.length > 0) {
      const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';
      const isLocalHost = aiEngineUrl.includes('127.0.0.1') || aiEngineUrl.includes('localhost');
      
      // Skip connecting to local AI engine in production/Render contexts to prevent request timeouts
      const shouldAttemptAI = !isLocalHost || (process.env.NODE_ENV !== 'production' && !process.env.RENDER);

      if (shouldAttemptAI) {
        try {
          const response = await fetch(`${aiEngineUrl}/api/ai/rank-donors`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              request: { bloodGroup, state, district, city, area: req.query.area || '', village: req.query.village || '' },
              donors: donors
            })
          });

          if (response.ok) {
            const rankedDonors = await response.json();
            // Merge matches to ensure UI consistency
            const merged = rankedDonors.map((rd, index) => {
              const match = donors.find(d => d.email === rd.email);
              return {
                ...match,
                ...rd,
                matchScore: Math.round((rd.matchScore || (100 - index * 5)) + (match ? match.matchScore : 0))
              };
            });
            merged.sort((a, b) => b.matchScore - a.matchScore);
            return res.status(200).json(merged);
          }
        } catch (aiError) {
          console.log(`[AI Engine] Offline fallback active: ${aiError.message}`);
        }
      }
    }

    res.status(200).json(donors);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search donors.', error: error.message });
  }
};

exports.getGlobalStats = async (req, res) => {
  try {
    const registeredDonors = await User.countDocuments({ role: 'Donor' });
    const registeredRecipients = await User.countDocuments({ role: 'Recipient' });
    const registeredHospitals = await User.countDocuments({ role: 'Hospital' });
    const fulfilledRequests = await BloodRequest.countDocuments({ status: 'Fulfilled' });

    const unitsPledged = await BloodRequest.aggregate([
      { $match: { status: 'Fulfilled' } },
      { $unwind: '$donorsPledged' },
      { $group: { _id: null, total: { $sum: '$donorsPledged.unitsPledged' } } }
    ]);
    const savedLives = unitsPledged[0]?.total || 0;

    res.status(200).json({
      activeDonors: registeredDonors,
      registeredRecipients,
      hospitals: registeredHospitals,
      fulfilledRequests,
      savedLives
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch global stats.', error: error.message });
  }
};

exports.getBloodInventoryStats = async (req, res) => {
  try {
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const stock = Object.fromEntries(bloodGroups.map((g) => [g, 0]));
    const required = Object.fromEntries(bloodGroups.map((g) => [g, 0]));

    const hospitals = await User.find({ role: 'Hospital' }).select('bloodInventory');
    hospitals.forEach((h) => {
      bloodGroups.forEach((g) => {
        stock[g] += h.bloodInventory?.[g] || 0;
      });
    });

    const pendingRequests = await BloodRequest.find({ status: 'Pending' }).select('bloodGroup unitsRequired');
    pendingRequests.forEach((r) => {
      required[r.bloodGroup] = (required[r.bloodGroup] || 0) + (r.unitsRequired || 1);
    });

    const chartData = bloodGroups.map((group) => ({
      group,
      Stock: stock[group],
      Required: required[group]
    }));

    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory stats.', error: error.message });
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BloodRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: 'Blood request ticket not found.' });
    }

    // Ensure only the requester can delete their request
    if (request.requester.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the publisher can remove this request ticket.' });
    }

    await BloodRequest.findByIdAndDelete(id);

    // Create an audit log for this removal
    await AuditLog.create({
      action: 'BLOOD_REQUEST_DELETE',
      performedBy: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      details: { requestId: id, patientName: request.patientName, bloodGroup: request.bloodGroup }
    });

    res.status(200).json({ message: 'Blood request ticket successfully deleted.' });
  } catch (error) {
    console.error(`[Request Controller] Delete error: ${error.message}`);
    res.status(500).json({ message: 'Failed to delete blood request.', error: error.message });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BloodRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: 'Blood request ticket not found.' });
    }

    // Ensure only the requester can edit their request
    if (request.requester.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only the publisher can edit this request ticket.' });
    }

    const {
      patientName, bloodGroup, unitsRequired, hospitalName,
      state, district, city, area, village, pincode, hospitalAddress,
      emergencyMode, neededBy, reason, status
    } = req.body;

    if (patientName !== undefined) request.patientName = patientName;
    if (bloodGroup !== undefined) request.bloodGroup = bloodGroup;
    if (unitsRequired !== undefined) request.unitsRequired = unitsRequired;
    if (hospitalName !== undefined) request.hospitalName = hospitalName;
    if (state !== undefined) request.state = state;
    if (district !== undefined) request.district = district;
    if (city !== undefined) request.city = city;
    if (area !== undefined) request.area = area;
    if (village !== undefined) request.village = village;
    if (pincode !== undefined) request.pincode = pincode;
    if (hospitalAddress !== undefined) request.hospitalAddress = hospitalAddress;
    if (emergencyMode !== undefined) request.emergencyMode = emergencyMode;
    if (neededBy !== undefined) request.neededBy = neededBy;
    if (reason !== undefined) request.reason = reason;
    if (status !== undefined) {
      if (!['Pending', 'Approved', 'Fulfilled', 'Cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      request.status = status;
    }

    await request.save();

    await AuditLog.create({
      action: 'BLOOD_REQUEST_UPDATE',
      performedBy: req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      details: { requestId: id, status: request.status }
    });

    res.status(200).json({ message: 'Blood request ticket successfully updated.', request });
  } catch (error) {
    console.error(`[Request Controller] Update error: ${error.message}`);
    res.status(500).json({ message: 'Failed to update blood request.', error: error.message });
  }
};

exports.alertDonor = async (req, res) => {
  try {
    const { id, donorId } = req.params;
    const request = await BloodRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    const donorUser = await User.findById(donorId);
    if (!donorUser || donorUser.role !== 'Donor') {
      return res.status(404).json({ message: 'Matching donor user not found.' });
    }

    // Ensure only the requester (or admin) can alert donors for this request
    if (request.requester.toString() !== req.user.id.toString() && !['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized: Only the publisher of this request can send alerts.' });
    }

    const notificationMessage = `🚨 Urgent Alert! You are a matching donor for ${request.patientName} who needs ${request.bloodGroup} blood at ${request.hospitalName}, ${request.city}. Please pledge if you are available.`;

    // Check if notification already exists to prevent duplication
    const existingNotif = await Notification.findOne({
      recipient: donorId,
      bloodRequest: request._id,
      type: request.emergencyMode ? 'emergency_request' : 'new_request'
    });

    if (!existingNotif) {
      await Notification.create({
        recipient: donorId,
        donor: req.user.id,
        bloodRequest: request._id,
        type: request.emergencyMode ? 'emergency_request' : 'new_request',
        message: notificationMessage,
        requestStatus: 'Pending'
      });
    }

    // Real-time socket notification
    notifyUser(donorId, 'new_blood_request', {
      request: request,
      requestId: request._id,
      requester: req.user.id,
      requesterId: req.user.id,
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      hospitalName: request.hospitalName,
      place: `${request.city}, ${request.district}, ${request.state}`,
      pincode: request.pincode,
      emergencyMode: request.emergencyMode,
      neededBy: request.neededBy,
      contactNumber: req.user.phone,
      createdAt: request.createdAt
    });

    // FCM Notification
    if (donorUser.fcmToken) {
      try {
        sendPushNotification(donorUser.fcmToken, {
          title: request.emergencyMode ? '🚨 EMERGENCY BLOOD MATCH REQUIRED' : 'Blood Match Request Found',
          body: `Patient ${request.patientName} requires ${request.bloodGroup} at ${request.hospitalName}.`,
          data: {
            type: request.emergencyMode ? 'emergency_request' : 'new_request',
            requestId: request._id.toString(),
            requesterId: req.user.id.toString(),
            chatPartnerId: req.user.id.toString()
          }
        });
      } catch (fcmErr) {
        console.error('[Alert Donor] FCM send failed:', fcmErr.message);
      }
    }

    // SMS Notification
    try {
      const smsMessage = `🚨 ONEDROP DIRECT ALERT: You are a matching donor for patient ${request.patientName} who needs ${request.bloodGroup} at ${request.hospitalName}, ${request.city}. Accept request on your dashboard.`;
      await sendSMS({
        to: donorUser.phone,
        message: smsMessage
      });
    } catch (smsErr) {
      console.error(`[Alert Donor] SMS failed:`, smsErr.message);
    }

    // Email Notification
    try {
      const emailHtml = getEmailTemplate(
        request.emergencyMode ? '🚨 Urgent: Emergency Blood Request Match' : 'Blood Donation Request Match Found',
        `Dear ${donorUser.fullName},<br><br>` +
        `You have been directly alerted for a blood request matching your blood group (<strong>${request.bloodGroup}</strong>) in your area.<br><br>` +
        `<strong>Patient Name:</strong> ${request.patientName}<br>` +
        `<strong>Units Required:</strong> ${request.unitsRequired} Units<br>` +
        `<strong>Hospital Location:</strong> ${request.hospitalName}, ${request.city}, ${request.state}<br>` +
        `<strong>Proximity Pincode:</strong> ${request.pincode}<br>` +
        `<strong>Emergency Mode:</strong> ${request.emergencyMode ? 'URGENT/CRITICAL' : 'Standard'}<br><br>` +
        `If you are eligible and currently available to donate, please access your dashboard to accept the request and coordinate direct secure communications.`,
        `http://localhost:5173/donor-dashboard`,
        'Pledge Blood Donation'
      );
      await sendMail({
        to: donorUser.email,
        subject: request.emergencyMode ? `🚨 EMERGENCY: ${request.bloodGroup} Match Required!` : `Blood Match Found: ${request.bloodGroup}`,
        html: emailHtml
      });
    } catch (mailErr) {
      console.error(`[Alert Donor] Email failed:`, mailErr.message);
    }

    res.status(200).json({ message: `Successfully sent direct alert notification to donor ${donorUser.fullName}.` });
  } catch (error) {
    console.error(`[Request Controller] Alert donor error: ${error.message}`);
    res.status(500).json({ message: 'Failed to send alert notification to donor.', error: error.message });
  }
};

