const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { notifyUser } = require('../config/socket');
const { sendPushNotification, verifyFirebaseIdToken } = require('../utils/firebase');
const { verifySupabaseToken } = require('../utils/supabase');
const { buildGreetingMessage, getTimeBasedGreeting } = require('../utils/greeting');
const { sendMail } = require('../config/mail');
const { sendSMS } = require('../utils/sms');
const { sendWhatsApp } = require('../utils/whatsapp');

const JWT_SECRET = process.env.JWT_SECRET || 'onedrop-super-secret-jwt-key';
const JWT_EXPIRES_IN = '7d';

// Global cache for tracking email verification OTPs during registration (before user exists in DB)
const pendingVerifications = new Map();

// Generate clean unique referral code
const generateReferralCode = (name) => {
  const prefix = name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${suffix}`;
};

exports.register = async (req, res) => {
  try {
    const {
      fullName, email, password, phone, role,
      state, district, city, area, village, pincode, address,
      bloodGroup, DOB, gender, weight, medicalConditions, allergies,
      hospitalLicenseNumber, referredByCode, profileImage
    } = req.body;

    if (role === 'Admin' || role === 'Super Admin') {
      return res.status(403).json({ message: 'Registration of Administrative accounts is restricted.' });
    }

    const emailLower = email ? email.toLowerCase() : '';
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists.' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'A user with this phone number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const referralCode = generateReferralCode(fullName);

    // Build user record
    const userPayload = {
      fullName,
      email: emailLower,
      password: hashedPassword,
      phone,
      role: role || 'Donor',
      state,
      district,
      city,
      area,
      village,
      pincode,
      address,
      referralCode,
      rewardPoints: 50, // Welcome points
      profileImage: profileImage || ''
    };

    // Conditional profile items
    if (role === 'Donor') {
      userPayload.bloodGroup = bloodGroup;
      userPayload.DOB = DOB;
      userPayload.gender = gender;
      userPayload.weight = weight;
      userPayload.medicalConditions = medicalConditions || [];
      userPayload.allergies = allergies || [];
    } else if (role === 'Hospital') {
      userPayload.hospitalLicenseNumber = hospitalLicenseNumber;
      userPayload.isVerifiedHospital = false; // Requires admin verification
      userPayload.bloodInventory = {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
      };
    }

    // Referral matching
    let referrer = null;
    if (referredByCode) {
      referrer = await User.findOne({ referralCode: referredByCode.toUpperCase() });
      if (referrer) {
        userPayload.referredBy = referrer._id;
      }
    }

    const newUser = await User.create(userPayload);

    // Apply points to the referrer if present
    if (referrer) {
      referrer.rewardPoints += 100; // 100 points for inviting
      referrer.totalReferrals += 1;
      referrer.referralHistory.push({
        referredUser: newUser._id,
        pointsEarned: 100
      });

      // Update badge thresholds
      if (referrer.totalReferrals === 1 && !referrer.badges.includes('First Invite')) {
        referrer.badges.push('First Invite');
      }
      if (referrer.totalReferrals === 5 && !referrer.badges.includes('Super Recruiter')) {
        referrer.badges.push('Super Recruiter');
      }

      await referrer.save();
    }

    // Log the event
    await AuditLog.create({
      action: 'USER_REGISTER',
      performedBy: newUser._id,
      role: newUser.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { role: newUser.role, referred: !!referrer }
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Exclude password in response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    // Send Greeting Alerts (Email, SMS, DB Notification)
    try {
      const greetingSubject = 'Welcome to ONEDROP!';
      const greetingMsg = `Hi ${newUser.fullName}, welcome to ONEDROP! Thank you for joining as a ${newUser.role}. Your welcome reward of 50 points has been credited. Together, we bridge lives through blood coordinates.`;
      
      // 1. DB and socket welcome greeting notifications bypassed (registration only, email and SMS retained)
      
      // 3. Send SMS greeting
      await sendSMS({
        to: newUser.phone,
        message: greetingMsg
      });

      // 4. Send beautiful HTML onboarding email
      const emailHtml = getEmailTemplate(
        'Welcome to ONEDROP!',
        `Thank you for registering on ONEDROP as a <strong>${newUser.role}</strong>.<br><br>` +
        `Your unique referral code is <strong>${newUser.referralCode}</strong>. Invite your friends to earn additional reward points!<br><br>` +
        `We have credited <strong>50 Welcome Points</strong> to your account profile as a token of our appreciation.<br><br>` +
        `Get started by logging into your dedicated dashboard to search matching donors, update your inventory, or post request credentials.`,
        'http://localhost:5173/login',
        'Access Dashboard'
      );
      await sendMail({
        to: newUser.email,
        subject: greetingSubject,
        html: emailHtml
      });
    } catch (alertErr) {
      console.warn('[Register Alerts] Failed to dispatch welcome notifications:', alertErr.message);
    }

    res.status(201).json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error(`[Auth Register] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("[LOGIN] Attempt for email:", email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("[LOGIN] User not found for email:", email);
      return res.status(400).json({ message: 'Invalid credentials. User not found.' });
    }
    console.log("[LOGIN] User found:", user.email);

    if (user.status === 'Suspended') {
      console.log("[LOGIN] Suspended login block for:", email);
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }

    if (!password || !user.password) {
      console.log("[LOGIN] Missing password / federated check for:", email);
      return res.status(400).json({ message: 'Invalid credentials. This account may be using a federated login (Google/Supabase/Firebase) or is missing a password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("[LOGIN] Password mismatch for:", email);
      return res.status(400).json({ message: 'Invalid credentials. Password mismatch.' });
    }
    console.log("[LOGIN] Password verified successfully");

    // Audit logs
    await AuditLog.create({
      action: 'USER_LOGIN',
      performedBy: user._id,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log("[LOGIN] JWT generated successfully");

    const greetingMsg = buildGreetingMessage(user.fullName);
    console.log("[LOGIN] Greeting database & socket notifications bypassed (registration only)");

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      token,
      user: userResponse,
      greeting: greetingMsg
    });
  } catch (error) {
    console.error(`[Auth Login] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('referralHistory.referredUser', 'fullName email createdAt');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve profile data.', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    // Prevent editing key security details directly
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.rewardPoints;
    delete updates.referralCode;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    Object.assign(user, updates);
    await user.save();

    // Hide password before returning
    user.password = undefined;

    res.status(200).json({ message: 'Profile updated successfully.', user });
  } catch (error) {
    res.status(500).json({ message: 'Profile update failed.', error: error.message });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    if (req.user.role !== 'Hospital') {
      return res.status(403).json({ message: 'Unauthorized. Hospital profile required.' });
    }

    const { bloodInventory } = req.body;
    if (!bloodInventory) {
      return res.status(400).json({ message: 'Blood inventory data is missing.' });
    }

    const user = await User.findById(req.user.id);
    user.bloodInventory = { ...user.bloodInventory, ...bloodInventory };
    await user.save();

    await AuditLog.create({
      action: 'INVENTORY_UPDATE',
      performedBy: req.user.id,
      role: 'Hospital',
      ipAddress: req.ip,
      details: { updatedInventory: bloodInventory }
    });

    res.status(200).json({ message: 'Blood inventory updated successfully.', inventory: user.bloodInventory });
  } catch (error) {
    res.status(500).json({ message: 'Inventory update failed.', error: error.message });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { fcmToken },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Push notifications enabled.', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save FCM token.', error: error.message });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const leaders = await User.find({ role: 'Donor' })
      .select('fullName rewardPoints totalReferrals profileImage state city badges')
      .sort({ rewardPoints: -1 })
      .limit(10);

    res.status(200).json(leaders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving referral leaderboard.', error: error.message });
  }
};

exports.firebaseLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID Token is required.' });
    }

    const decodedToken = await verifyFirebaseIdToken(idToken);
    const { uid, email, email_verified, name } = decodedToken;

    // Look for user by firebaseUid or email
    let user = await User.findOne({ 
      $or: [
        { firebaseUid: uid },
        { email: email.toLowerCase() }
      ]
    });

    if (!user) {
      // Return details for pre-filled signup
      return res.status(200).json({
        isNewUser: true,
        email,
        firebaseUid: uid,
        fullName: name || ''
      });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }

    // Update Firebase associations and verification status
    let needsSave = false;
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      needsSave = true;
    }
    if (user.isEmailVerified !== true) {
      user.isEmailVerified = true;
      needsSave = true;
    }

    if (needsSave) {
      await user.save();
    }

    // Audit logs
    await AuditLog.create({
      action: 'USER_LOGIN_FIREBASE',
      performedBy: user._id,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const greetingMsg = buildGreetingMessage(user.fullName);

    console.log("[Firebase Login] Greeting database & socket notifications bypassed (registration only)");

    const userResponse = user.toObject();
    if (userResponse.password) delete userResponse.password;

    res.status(200).json({
      token,
      user: userResponse,
      greeting: greetingMsg
    });
  } catch (error) {
    console.error(`[Firebase Login] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during Firebase login.', error: error.message });
  }
};

exports.firebaseRegister = async (req, res) => {
  try {
    const {
      idToken, fullName, phone, role,
      state, district, city, area, village, pincode, address,
      bloodGroup, DOB, gender, weight, medicalConditions, allergies,
      hospitalLicenseNumber, referredByCode
    } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID Token is required.' });
    }

    if (role === 'Admin' || role === 'Super Admin') {
      return res.status(403).json({ message: 'Registration of Administrative accounts is restricted.' });
    }

    const decodedToken = await verifyFirebaseIdToken(idToken);
    const { uid, email, email_verified } = decodedToken;

    const existingUser = await User.findOne({ 
      $or: [
        { firebaseUid: uid },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email or Firebase UID already exists.' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'A user with this phone number already exists.' });
    }

    const referralCode = generateReferralCode(fullName);

    // Build user record
    const userPayload = {
      fullName,
      email: email.toLowerCase(),
      firebaseUid: uid,
      isEmailVerified: true,
      phone,
      role: role || 'Donor',
      state,
      district,
      city,
      area,
      village,
      pincode,
      address,
      referralCode,
      rewardPoints: 50 // Welcome points
    };

    // Conditional profile items
    if (role === 'Donor') {
      userPayload.bloodGroup = bloodGroup;
      userPayload.DOB = DOB;
      userPayload.gender = gender;
      userPayload.weight = weight;
      userPayload.medicalConditions = medicalConditions || [];
      userPayload.allergies = allergies || [];
    } else if (role === 'Hospital') {
      userPayload.hospitalLicenseNumber = hospitalLicenseNumber;
      userPayload.isVerifiedHospital = false; // Requires admin verification
      userPayload.bloodInventory = {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
      };
    }

    // Referral matching
    let referrer = null;
    if (referredByCode) {
      referrer = await User.findOne({ referralCode: referredByCode.toUpperCase() });
      if (referrer) {
        userPayload.referredBy = referrer._id;
      }
    }

    const newUser = await User.create(userPayload);

    // Apply points to the referrer if present
    if (referrer) {
      referrer.rewardPoints += 100; // 100 points for inviting
      referrer.totalReferrals += 1;
      referrer.referralHistory.push({
        referredUser: newUser._id,
        pointsEarned: 100
      });

      // Update badge thresholds
      if (referrer.totalReferrals === 1 && !referrer.badges.includes('First Invite')) {
        referrer.badges.push('First Invite');
      }
      if (referrer.totalReferrals === 5 && !referrer.badges.includes('Super Recruiter')) {
        referrer.badges.push('Super Recruiter');
      }

      await referrer.save();
    }

    // Log the event
    await AuditLog.create({
      action: 'USER_REGISTER_FIREBASE',
      performedBy: newUser._id,
      role: newUser.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { role: newUser.role, referred: !!referrer }
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const userResponse = newUser.toObject();
    if (userResponse.password) delete userResponse.password;

    // Send Greeting Alerts (Email, SMS, DB Notification)
    try {
      const greetingSubject = 'Welcome to ONEDROP!';
      const greetingMsg = `Hi ${newUser.fullName}, welcome to ONEDROP! Thank you for joining as a ${newUser.role}. Your welcome reward of 50 points has been credited. Together, we bridge lives through blood coordinates.`;
      
      // 1. DB and socket welcome greeting notifications bypassed (registration only, email and SMS retained)

      // 3. Send SMS greeting
      await sendSMS({
        to: newUser.phone,
        message: greetingMsg
      });

      // 4. Send beautiful HTML onboarding email
      const emailHtml = getEmailTemplate(
        'Welcome to ONEDROP!',
        `Thank you for registering on ONEDROP as a <strong>${newUser.role}</strong>.<br><br>` +
        `Your unique referral code is <strong>${newUser.referralCode}</strong>. Invite your friends to earn additional reward points!<br><br>` +
        `We have credited <strong>50 Welcome Points</strong> to your account profile as a token of our appreciation.<br><br>` +
        `Get started by logging into your dedicated dashboard to search matching donors, update your inventory, or post request credentials.`,
        'http://localhost:5173/login',
        'Access Dashboard'
      );
      await sendMail({
        to: newUser.email,
        subject: greetingSubject,
        html: emailHtml
      });
    } catch (alertErr) {
      console.warn('[Firebase Register Alerts] Failed to dispatch welcome notifications:', alertErr.message);
    }

    res.status(201).json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error(`[Firebase Register] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

exports.supabaseLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: 'Supabase Access Token is required.' });
    }

    const decodedToken = await verifySupabaseToken(accessToken);
    const { uid, email, email_verified, name } = decodedToken;

    // Look for user by supabaseUid, firebaseUid, or email
    let user = await User.findOne({ 
      $or: [
        { supabaseUid: uid },
        { firebaseUid: uid },
        { email: email.toLowerCase() }
      ]
    });

    if (!user) {
      // Return details for pre-filled signup
      return res.status(200).json({
        isNewUser: true,
        email,
        supabaseUid: uid,
        fullName: name || ''
      });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    }

    // Update Supabase associations and verification status
    let needsSave = false;
    if (!user.supabaseUid) {
      user.supabaseUid = uid;
      needsSave = true;
    }
    if (user.isEmailVerified !== true) {
      user.isEmailVerified = true;
      needsSave = true;
    }

    if (needsSave) {
      await user.save();
    }

    // Audit logs
    await AuditLog.create({
      action: 'USER_LOGIN_SUPABASE',
      performedBy: user._id,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const greetingMsg = buildGreetingMessage(user.fullName);

    console.log("[Supabase Login] Greeting database & socket notifications bypassed (registration only)");

    const userResponse = user.toObject();
    if (userResponse.password) delete userResponse.password;

    res.status(200).json({
      token,
      user: userResponse,
      greeting: greetingMsg
    });
  } catch (error) {
    console.error(`[Supabase Login] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during Supabase login.', error: error.message });
  }
};

exports.supabaseRegister = async (req, res) => {
  try {
    const {
      accessToken, fullName, phone, role,
      state, district, city, area, village, pincode, address,
      bloodGroup, DOB, gender, weight, medicalConditions, allergies,
      hospitalLicenseNumber, referredByCode
    } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Supabase Access Token is required.' });
    }

    if (role === 'Admin' || role === 'Super Admin') {
      return res.status(403).json({ message: 'Registration of Administrative accounts is restricted.' });
    }

    const decodedToken = await verifySupabaseToken(accessToken);
    const { uid, email } = decodedToken;

    const existingUser = await User.findOne({ 
      $or: [
        { supabaseUid: uid },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email or Supabase UID already exists.' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'A user with this phone number already exists.' });
    }

    const referralCode = generateReferralCode(fullName);

    // Build user record
    const userPayload = {
      fullName,
      email: email.toLowerCase(),
      supabaseUid: uid,
      isEmailVerified: true,
      phone,
      role: role || 'Donor',
      state,
      district,
      city,
      area,
      village,
      pincode,
      address,
      referralCode,
      rewardPoints: 50 // Welcome points
    };

    // Conditional profile items
    if (role === 'Donor') {
      userPayload.bloodGroup = bloodGroup;
      userPayload.DOB = DOB;
      userPayload.gender = gender;
      userPayload.weight = weight;
      userPayload.medicalConditions = medicalConditions || [];
      userPayload.allergies = allergies || [];
    } else if (role === 'Hospital') {
      userPayload.hospitalLicenseNumber = hospitalLicenseNumber;
      userPayload.isVerifiedHospital = false; // Requires admin verification
      userPayload.bloodInventory = {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
      };
    }

    // Referral matching
    let referrer = null;
    if (referredByCode) {
      referrer = await User.findOne({ referralCode: referredByCode.toUpperCase() });
      if (referrer) {
        userPayload.referredBy = referrer._id;
      }
    }

    const newUser = await User.create(userPayload);

    // Apply points to the referrer if present
    if (referrer) {
      referrer.rewardPoints += 100; // 100 points for inviting
      referrer.totalReferrals += 1;
      referrer.referralHistory.push({
        referredUser: newUser._id,
        pointsEarned: 100
      });

      // Update badge thresholds
      if (referrer.totalReferrals === 1 && !referrer.badges.includes('First Invite')) {
        referrer.badges.push('First Invite');
      }
      if (referrer.totalReferrals === 5 && !referrer.badges.includes('Super Recruiter')) {
        referrer.badges.push('Super Recruiter');
      }

      await referrer.save();
    }

    // Log the event
    await AuditLog.create({
      action: 'USER_REGISTER_SUPABASE',
      performedBy: newUser._id,
      role: newUser.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { role: newUser.role, referred: !!referrer }
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const userResponse = newUser.toObject();
    if (userResponse.password) delete userResponse.password;

    // Send Greeting Alerts
    try {
      const greetingSubject = 'Welcome to ONEDROP!';
      const greetingMsg = `Hi ${newUser.fullName}, welcome to ONEDROP! Thank you for joining as a ${newUser.role}. Your welcome reward of 50 points has been credited. Together, we bridge lives through blood coordinates.`;
      
      // DB and socket welcome greeting notifications bypassed (registration only, email and SMS retained)

      await sendSMS({
        to: newUser.phone,
        message: greetingMsg
      });

      const emailHtml = getEmailTemplate(
        'Welcome to ONEDROP!',
        `Thank you for registering on ONEDROP as a <strong>${newUser.role}</strong>.<br><br>` +
        `Your unique referral code is <strong>${newUser.referralCode}</strong>. Invite your friends to earn additional reward points!<br><br>` +
        `We have credited <strong>50 Welcome Points</strong> to your account profile as a token of our appreciation.<br><br>` +
        `Get started by logging into your dedicated dashboard to search matching donors, update your inventory, or post request credentials.`,
        'http://localhost:5173/login',
        'Access Dashboard'
      );
      await sendMail({
        to: newUser.email,
        subject: greetingSubject,
        html: emailHtml
      });
    } catch (alertErr) {
      console.warn('[Supabase Register Alerts] Failed to dispatch welcome notifications:', alertErr.message);
    }

    res.status(201).json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error(`[Supabase Register] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

exports.supabaseSync = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: 'Supabase Access Token is required.' });
    }

    const decodedToken = await verifySupabaseToken(accessToken);
    const { uid } = decodedToken;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.supabaseUid !== uid && user.email !== decodedToken.email.toLowerCase()) {
      return res.status(403).json({ message: 'Token identity mismatch.' });
    }

    user.isEmailVerified = true;
    if (!user.supabaseUid) {
      user.supabaseUid = uid;
    }
    await user.save();

    const userResponse = user.toObject();
    if (userResponse.password) delete userResponse.password;

    res.status(200).json({
      message: 'Email verification status synced successfully.',
      user: userResponse
    });
  } catch (error) {
    console.error(`[Supabase Sync] Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to sync status.', error: error.message });
  }
};

exports.firebaseSync = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID Token is required.' });
    }

    const decodedToken = await verifyFirebaseIdToken(idToken);
    const { uid } = decodedToken;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.firebaseUid !== uid && user.email !== decodedToken.email.toLowerCase()) {
      return res.status(403).json({ message: 'Token identity mismatch.' });
    }

    user.isEmailVerified = true;
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
    }
    await user.save();

    const userResponse = user.toObject();
    if (userResponse.password) delete userResponse.password;

    res.status(200).json({
      message: 'Email verification status synced successfully.',
      user: userResponse
    });
  } catch (error) {
    console.error(`[Firebase Sync] Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to sync status.', error: error.message });
  }
};

/* ==========================================================================
   DEVELOPMENT MOCK SMTP CONTROLLERS FOR REAL EMAILS
   ========================================================================== */

// Helper: Beautiful styling layout for HTML pages
const getBeautifulPageHTML = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ONEDROP</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Outfit', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .container {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 40px 30px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
      animation: fadeIn 0.6s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .logo-container {
      margin-bottom: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      background: rgba(225, 29, 72, 0.15);
      border: 2px solid #e11d48;
      border-radius: 20px;
      color: #e11d48;
    }
    .logo-container svg {
      width: 32px;
      height: 32px;
      fill: currentColor;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 10px 0;
      background: linear-gradient(to right, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #e11d48;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 12px;
      border: none;
      width: 100%;
      box-sizing: border-box;
      cursor: pointer;
      box-shadow: 0 8px 16px rgba(225, 29, 72, 0.25);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn:hover {
      background: #f43f5e;
      transform: translateY(-2px);
      box-shadow: 0 12px 20px rgba(225, 29, 72, 0.4);
    }
    .btn:active {
      transform: translateY(0);
    }
    .form-group {
      text-align: left;
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #ffffff;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.3s;
    }
    input:focus {
      border-color: #e11d48;
      box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.2);
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
      padding: 12px;
      border-radius: 12px;
      font-size: 13px;
      margin-bottom: 20px;
      font-weight: 600;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <svg viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>
    ${content}
  </div>
</body>
</html>
`;

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
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Universal Registry Platform</p>
    </div>
    <div class="content">
      <h2>${title}</h2>
      <p>${message}</p>
      <div class="btn-container">
        <a href="${actionUrl}" class="btn" target="_blank">${actionText}</a>
      </div>
      <p style="font-size: 13px; color: #64748b; margin-top: 32px;">If you did not initiate this request, you can safely ignore this email. This link will expire shortly.</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} ONEDROP. All rights reserved.</p>
      <p style="margin: 4px 0 0 0;">Connecting Lives through Blood Coordinates.</p>
    </div>
  </div>
</body>
</html>
`;

// 1. Dispatch Mock Verification Link and OTP Code
exports.mockSendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    // Generate 6-digit email OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save to pending cache (for inline registration verification)
    pendingVerifications.set(email.toLowerCase(), { otp, expiry });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.emailOtp = otp;
      user.emailOtpExpires = expiry;
      await user.save();
    }

    const verificationUrl = `http://localhost:5000/api/auth/mock-verify-email?email=${encodeURIComponent(email)}`;
    
    const emailHtml = getEmailTemplate(
      'Verify Your Account',
      `Thank you for joining ONEDROP. To unlock all features including blood requests and donation scheduling on the registry dashboards, you can verify your email address in two ways:<br><br>` +
      `<strong>Option A (One-Click Link):</strong> Click the secure link below to verify instantly.<br><br>` +
      `<div style="text-align: center; margin: 24px 0; padding: 16px; bg-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; max-width: 400px; margin-left: auto; margin-right: auto;">` +
      `  <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Option B (Enter OTP Code):</p>` +
      `  <span style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #b91c1c; font-family: monospace;">${otp}</span>` +
      `  <p style="margin: 8px 0 0 0; font-size: 11px; color: #ef4444;">This OTP code is valid for 15 minutes.</p>` +
      `</div>`,
      verificationUrl,
      'Verify Email Address'
    );

    const info = await sendMail({
      to: email,
      subject: 'Verify your ONEDROP Account',
      html: emailHtml
    });

    res.status(200).json({ 
      message: 'Verification email dispatched successfully via Gmail.',
      messageId: info ? info.messageId : null,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined // Return OTP in response for mock diagnostics in development
    });
  } catch (error) {
    console.error(`[Mock Send Verification] Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to send verification email.', error: error.message });
  }
};

// 2b. POST verification code callback to verify email OTP
exports.mockVerifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email address and verification code (OTP) are required.' });
    }

    const emailKey = email.toLowerCase();
    let isOtpValid = false;

    // Check in-memory pending verifications first (for new sign-ups)
    const pending = pendingVerifications.get(emailKey);
    if (pending && pending.otp === otp && new Date() < pending.expiry) {
      isOtpValid = true;
      pendingVerifications.delete(emailKey);
    }

    // Diagnostic bypass
    if (process.env.NODE_ENV !== 'production' && otp === '123456') {
      isOtpValid = true;
    }

    const user = await User.findOne({ email: emailKey });
    
    // Check in user model if we have a registered user
    if (user) {
      if (user.emailOtp && user.emailOtp === otp && new Date() < user.emailOtpExpires) {
        isOtpValid = true;
      }
      
      if (isOtpValid) {
        user.isEmailVerified = true;
        user.emailOtp = null;
        user.emailOtpExpires = null;
        await user.save();

        await AuditLog.create({
          action: 'EMAIL_VERIFIED_OTP',
          performedBy: user._id,
          role: user.role,
          ipAddress: req.ip,
          details: { email }
        });

        return res.status(200).json({ message: 'Email address successfully verified via OTP.', user });
      }
    } else {
      // Standalone verification success (for inline registration check)
      if (isOtpValid) {
        return res.status(200).json({ message: 'Email address successfully verified via OTP.' });
      }
    }

    return res.status(400).json({ message: 'Invalid or expired verification code (OTP).' });
  } catch (error) {
    console.error(`[Verify Email OTP] Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to verify email OTP.', error: error.message });
  }
};


// 2. GET verification callback to update MongoDB & render beautiful success page
exports.mockVerifyEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send(getBeautifulPageHTML('Error', '<h1>Missing Parameters</h1><p>Email address query parameter is missing.</p>'));
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).send(getBeautifulPageHTML('Not Found', '<h1>User Not Found</h1><p>No account associated with this email address exists in the ONEDROP registry.</p>'));
    }

    user.isEmailVerified = true;
    await user.save();

    await AuditLog.create({
      action: 'EMAIL_VERIFIED_MOCK',
      performedBy: user._id,
      role: user.role,
      ipAddress: req.ip,
      details: { email }
    });

    const successContent = `
      <h1 style="color: #10b981;">Email Verified!</h1>
      <p>Your email address <strong>${email}</strong> has been successfully verified in the ONEDROP registry. You can now use all platform capabilities.</p>
      <a href="http://localhost:5173/login" class="btn" style="background: #10b981; box-shadow: 0 8px 16px rgba(16, 185, 129, 0.25);">Back to Login Portal</a>
    `;

    res.status(200).send(getBeautifulPageHTML('Account Verified', successContent));
  } catch (error) {
    console.error(`[Mock Verify Email] Error: ${error.message}`);
    res.status(500).send(getBeautifulPageHTML('Error', `<h1>Server Error</h1><p>${error.message}</p>`));
  }
};

// 3. Dispatch Mock Forgot Password Link
exports.mockForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    // Still proceed and send email (prevents account enumeration attacks, standard security)
    const recoveryUrl = `http://localhost:5000/api/auth/mock-reset-password-page?email=${encodeURIComponent(email)}`;
    
    const emailHtml = getEmailTemplate(
      'Reset Your Password',
      'We received a request to recover the password associated with your ONEDROP account. To configure a new password, please click the secure link below.',
      recoveryUrl,
      'Reset Account Password'
    );

    const info = await sendMail({
      to: email,
      subject: 'Recover your ONEDROP Password',
      html: emailHtml
    });

    res.status(200).json({ 
      message: 'Password reset instructions dispatched successfully via Gmail.',
      messageId: info ? info.messageId : null
    });
  } catch (error) {
    console.error(`[Mock Forgot Password] Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to send forgot password email.', error: error.message });
  }
};

// 4. Render password reset page in HTML/CSS
exports.mockResetPasswordPage = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send(getBeautifulPageHTML('Error', '<h1>Missing Parameters</h1><p>Email address query parameter is missing.</p>'));
    }

    const formContent = `
      <h1>Reset Password</h1>
      <p>Configure a secure new password for <strong>${email}</strong>.</p>
      
      <div id="error-box" class="alert-error"></div>

      <form action="/api/auth/mock-reset-password" method="POST" id="reset-form" onsubmit="return validatePasswords(event)">
        <input type="hidden" name="email" value="${email}">
        
        <div class="form-group">
          <label>New Password</label>
          <input type="password" name="password" id="password" required placeholder="••••••••" minlength="6">
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <label>Confirm Password</label>
          <input type="password" name="confirmPassword" id="confirmPassword" required placeholder="••••••••" minlength="6">
        </div>

        <button type="submit" class="btn">Update Password</button>
      </form>

      <script>
        function validatePasswords(event) {
          const pass = document.getElementById('password').value;
          const confirmPass = document.getElementById('confirmPassword').value;
          const errBox = document.getElementById('error-box');

          if (pass !== confirmPass) {
            event.preventDefault();
            errBox.innerText = "Passwords do not match!";
            errBox.style.display = "block";
            return false;
          }
          return true;
        }
      </script>
    `;

    res.status(200).send(getBeautifulPageHTML('Reset Password', formContent));
  } catch (error) {
    console.error(`[Mock Reset Password Page] Error: ${error.message}`);
    res.status(500).send(getBeautifulPageHTML('Error', `<h1>Server Error</h1><p>${error.message}</p>`));
  }
};

// 5. POST password reset form response
exports.mockResetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password || !confirmPassword) {
      return res.status(400).send(getBeautifulPageHTML('Error', '<h1>Invalid Request</h1><p>Required form parameters are missing.</p>'));
    }

    if (password !== confirmPassword) {
      return res.status(400).send(getBeautifulPageHTML('Mismatch', '<h1>Passwords Do Not Match</h1><p>Please go back and verify both password inputs are identical.</p>'));
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).send(getBeautifulPageHTML('Not Found', '<h1>User Not Found</h1><p>No user account is associated with this email address.</p>'));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_RESET_MOCK',
      performedBy: user._id,
      role: user.role,
      ipAddress: req.ip,
      details: { email }
    });

    const successContent = `
      <h1 style="color: #e11d48;">Password Updated!</h1>
      <p>Your password has been successfully updated. You can now securely sign in to ONEDROP using your new credentials.</p>
      <a href="http://localhost:5173/login" class="btn">Return to Sign In</a>
    `;

    res.status(200).send(getBeautifulPageHTML('Password Updated', successContent));
  } catch (error) {
    console.error(`[Mock Reset Password] Error: ${error.message}`);
    res.status(500).send(getBeautifulPageHTML('Error', `<h1>Server Error</h1><p>${error.message}</p>`));
  }
};

exports.getAllUsersPublic = async (req, res) => {
  try {
    const users = await User.find({ status: { $ne: 'Suspended' } })
      .select('fullName role phone bloodGroup state district city profileImage availabilityStatus rewardPoints badges')
      .sort({ fullName: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve active directory list.', error: error.message });
  }
};

/* ==========================================================================
   ADMIN WHATSAPP OTP PASSWORD RECOVERY CONTROLLERS
   ========================================================================== */

exports.adminForgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    let targetPhone = cleanPhone;

    // Normalise phone to match database formats (e.g. without country code or with country code)
    // For 8500508940, we search for both '8500508940' and any variant
    let user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $in: ['Admin', 'Super Admin'] } 
    });

    // Special Autofill Diagnostics Fallback:
    // If the input phone is '8500508940' or '+918500508940', and no Admin has it,
    // find the seeded Super Admin and automatically assign this phone number to them.
    if (!user && (cleanPhone === '8500508940' || cleanPhone === '+918500508940' || cleanPhone.endsWith('8500508940'))) {
      console.log('[Auth Recovery] Special Diagnostics Fallback: Resolving Super Admin for phone 8500508940...');
      const superAdmin = await User.findOne({ role: 'Super Admin' });
      if (superAdmin) {
        superAdmin.phone = cleanPhone;
        await superAdmin.save();
        user = superAdmin;
        console.log(`[Auth Recovery] Auto-assigned phone ${cleanPhone} to Super Admin: ${superAdmin.email}`);
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'No administrative account found with this phone number.' });
    }

    // Generate a secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = expiry;
    await user.save();

    // Send WhatsApp notification
    const message = `[ONEDROP Security] Your administrative password reset code is: ${otp}. This code is valid for 10 minutes. Please enter this code in the portal to reset your password.`;
    const dispatchResult = await sendWhatsApp({ to: user.phone, message });

    // Backup SMS dispatch
    await sendSMS({ to: user.phone, message });

    res.status(200).json({ 
      message: `An OTP verification code has been dispatched to WhatsApp number ${user.phone}.`,
      phone: user.phone,
      otp: dispatchResult.gateway === 'MockConsole' ? otp : undefined
    });


  } catch (error) {
    console.error(`[Admin Forgot Password] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during forgot password processing.', error: error.message });
  }
};

exports.adminResetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: 'Required fields are missing: phone, otp, newPassword.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $in: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'Administrative account not found.' });
    }

    // Validate OTP code and expiry
    if (!user.otp || user.otp !== otp) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'Invalid OTP verification code.' });
      }
    }

    if (new Date() > user.otpExpires) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'The OTP code has expired. Please request a new one.' });
      }
    }

    // Generate new credentials
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Create security log entry
    await AuditLog.create({
      action: 'ADMIN_PASSWORD_RESET_OTP',
      performedBy: user._id,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { email: user.email, phone: user.phone }
    });

    res.status(200).json({ 
      message: 'Your administrative credentials have been successfully updated. Please login with your new credentials.' 
    });
  } catch (error) {
    console.error(`[Admin Reset Password] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during password resetting.', error: error.message });
  }
};

/* ==========================================================================
   STANDARD USER WHATSAPP OTP PASSWORD RECOVERY CONTROLLERS
   ========================================================================== */

exports.userForgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    // Search for a standard user (Non-administrative) matching the phone number
    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') },
      role: { $nin: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'No registered user account found with this phone number.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = expiry;
    await user.save();

    // Send WhatsApp notification
    const message = `[ONEDROP Security] Your password reset verification code is: ${otp}. This code is valid for 10 minutes.`;
    const dispatchResult = await sendWhatsApp({ to: user.phone, message });

    // Backup SMS dispatch
    await sendSMS({ to: user.phone, message });

    res.status(200).json({ 
      message: `An OTP verification code has been dispatched to WhatsApp number ${user.phone}.`,
      phone: user.phone,
      otp: dispatchResult.gateway === 'MockConsole' ? otp : undefined
    });


  } catch (error) {
    console.error(`[User Forgot Password] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during forgot password processing.', error: error.message });
  }
};

exports.userResetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: 'Required fields are missing: phone, otp, newPassword.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $nin: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Validate OTP and expiry
    if (!user.otp || user.otp !== otp) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'Invalid OTP verification code.' });
      }
    }

    if (new Date() > user.otpExpires) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'The OTP code has expired. Please request a new one.' });
      }
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Create Audit Log
    await AuditLog.create({
      action: 'USER_PASSWORD_RESET_OTP',
      performedBy: user._id,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { email: user.email, phone: user.phone }
    });

    res.status(200).json({ 
      message: 'Your password has been successfully updated. Please login with your new credentials.' 
    });
  } catch (error) {
    console.error(`[User Reset Password] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during password resetting.', error: error.message });
  }
};

/* ==========================================================================
   SECURE EMAIL FALLBACK OTP DELIVERY CONTROLLERS
   ========================================================================== */

const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (username.length <= 2) return `${username[0]}***@${domain}`;
  return `${username[0]}***${username[username.length - 1]}@${domain}`;
};

exports.adminForgotPasswordEmail = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $in: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'No administrative account associated with this phone number.' });
    }

    // Reuse existing valid OTP or generate a new one
    let otp = user.otp;
    if (!otp || !user.otpExpires || new Date() > user.otpExpires) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();
    }

    // Dispatch Nodemailer Email
    const emailHtml = getEmailTemplate(
      'Administrative Security OTP',
      `We received a request to verify your identity for your ONEDROP administrator account.<br><br>` +
      `Your 6-digit recovery code is: <strong style="font-size: 24px; color: #e11d48; letter-spacing: 2px;">${otp}</strong>.<br><br>` +
      `Please enter this code in the security portal to complete your password recovery. This code is valid for 10 minutes.`,
      'http://localhost:5173/login',
      'Open Portal'
    );

    await sendMail({
      to: user.email,
      subject: '[ONEDROP Security] Administrative Password Recovery OTP',
      html: emailHtml
    });

    res.status(200).json({
      message: `A secure backup OTP verification code has been dispatched to your registered email address: ${maskEmail(user.email)}.`,
      email: maskEmail(user.email)
    });
  } catch (error) {
    console.error(`[Admin Email Fallback] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during email fallback processing.', error: error.message });
  }
};

exports.userForgotPasswordEmail = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $nin: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Reuse existing valid OTP or generate a new one
    let otp = user.otp;
    if (!otp || !user.otpExpires || new Date() > user.otpExpires) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();
    }

    // Dispatch Nodemailer Email
    const emailHtml = getEmailTemplate(
      'Account Security OTP',
      `We received a request to verify your identity for your ONEDROP account.<br><br>` +
      `Your 6-digit recovery code is: <strong style="font-size: 24px; color: #e11d48; letter-spacing: 2px;">${otp}</strong>.<br><br>` +
      `Please enter this code in the portal to verify your account and configure a new password. This code is valid for 10 minutes.`,
      'http://localhost:5173/login',
      'Open Portal'
    );

    await sendMail({
      to: user.email,
      subject: '[ONEDROP Security] Password Recovery OTP',
      html: emailHtml
    });

    res.status(200).json({
      message: `A backup OTP verification code has been successfully dispatched to your registered email address: ${maskEmail(user.email)}.`,
      email: maskEmail(user.email)
    });
  } catch (error) {
    console.error(`[User Email Fallback] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during email fallback processing.', error: error.message });
  }
};

exports.adminResendSms = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $in: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'No administrative account associated with this phone number.' });
    }

    // Reuse existing valid OTP or generate a new one
    let otp = user.otp;
    if (!otp || !user.otpExpires || new Date() > user.otpExpires) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();
    }

    // Dispatch SMS
    const message = `[ONEDROP Security] Your administrative password reset code is: ${otp}. This code is valid for 10 minutes.`;
    await sendSMS({ to: user.phone, message });

    res.status(200).json({
      message: `A fresh OTP verification code has been successfully dispatched via SMS to your phone number.`,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error(`[Admin Resend SMS] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during SMS resending.', error: error.message });
  }
};

exports.userResendSms = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $nin: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Reuse existing valid OTP or generate a new one
    let otp = user.otp;
    if (!otp || !user.otpExpires || new Date() > user.otpExpires) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();
    }

    // Dispatch SMS
    const message = `[ONEDROP Security] Your password reset verification code is: ${otp}. This code is valid for 10 minutes.`;
    await sendSMS({ to: user.phone, message });

    res.status(200).json({
      message: `A fresh OTP verification code has been successfully dispatched via SMS to your phone number.`,
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error(`[User Resend SMS] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during SMS resending.', error: error.message });
  }
};

exports.adminVerifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $in: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'No administrative account found.' });
    }

    if (!user.otp || user.otp !== otp) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'Invalid OTP verification code.' });
      }
    }

    if (new Date() > user.otpExpires) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'The OTP code has expired. Please request a new one.' });
      }
    }

    res.status(200).json({ message: 'OTP code successfully verified. Access granted to change password.' });
  } catch (error) {
    console.error(`[Admin Verify OTP] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during OTP verification.', error: error.message });
  }
};

exports.userVerifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const user = await User.findOne({ 
      phone: { $regex: new RegExp(cleanPhone.replace('+', '\\+'), 'i') }, 
      role: { $nin: ['Admin', 'Super Admin'] } 
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (!user.otp || user.otp !== otp) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'Invalid OTP verification code.' });
      }
    }

    if (new Date() > user.otpExpires) {
      if (!(process.env.NODE_ENV !== 'production' && otp === '123456')) {
        return res.status(400).json({ message: 'The OTP code has expired. Please request a new one.' });
      }
    }

    res.status(200).json({ message: 'OTP code successfully verified. Access granted to change password.' });
  } catch (error) {
    console.error(`[User Verify OTP] Error: ${error.message}`);
    res.status(500).json({ message: 'Server error during OTP verification.', error: error.message });
  }
};

