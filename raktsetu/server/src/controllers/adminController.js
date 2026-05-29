const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const AuditLog = require('../models/AuditLog');
const Campaign = require('../models/Campaign');
const Blog = require('../models/Blog');
const Notification = require('../models/Notification');
const { broadcastToUsers } = require('../config/socket');


exports.getMetrics = async (req, res) => {
  try {
    const totalDonors = await User.countDocuments({ role: 'Donor' });
    const totalRecipients = await User.countDocuments({ role: 'Recipient' });
    const totalHospitals = await User.countDocuments({ role: 'Hospital' });
    const totalRequests = await BloodRequest.countDocuments();
    const emergencyRequests = await BloodRequest.countDocuments({ emergencyMode: true });
    
    // Total completed donations
    const completedDonations = await BloodRequest.aggregate([
      { $unwind: '$donorsPledged' },
      { $match: { 'donorsPledged.status': 'Donated' } },
      { $group: { _id: null, count: { $sum: '$donorsPledged.unitsPledged' } } }
    ]);
    
    const fulfilledCount = completedDonations[0] ? completedDonations[0].count : 0;

    // State-wise distribution of Donors
    const stateDonors = await User.aggregate([
      { $match: { role: 'Donor' } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Active blood requests by state
    const stateRequests = await BloodRequest.aggregate([
      { $match: { status: 'Pending' } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Audit logs (Recent 20)
    const logs = await AuditLog.find()
      .populate('performedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      summary: {
        totalDonors,
        totalRecipients,
        totalHospitals,
        totalRequests,
        emergencyRequests,
        completedDonations: fulfilledCount
      },
      stateDonors,
      stateRequests,
      logs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytical metrics.', error: error.message });
  }
};

exports.verifyDonor = async (req, res) => {
  try {
    const { donorId } = req.params;
    const { isVerified } = req.body;

    const donor = await User.findOneAndUpdate(
      { _id: donorId, role: 'Donor' },
      { $set: { isVerifiedDonor: isVerified } },
      { new: true }
    ).select('-password');

    if (!donor) {
      return res.status(404).json({ message: 'Donor record not found.' });
    }

    await AuditLog.create({
      action: 'DONOR_VERIFY_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { donorId, isVerified }
    });

    res.status(200).json({ message: 'Donor verification status updated.', donor });
  } catch (error) {
    res.status(500).json({ message: 'Donor verification update failed.', error: error.message });
  }
};

exports.verifyHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { isVerified } = req.body;

    const hospital = await User.findOneAndUpdate(
      { _id: hospitalId, role: 'Hospital' },
      { $set: { isVerifiedHospital: isVerified } },
      { new: true }
    ).select('-password');

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital record not found.' });
    }

    await AuditLog.create({
      action: 'HOSPITAL_VERIFY_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { hospitalId, isVerified }
    });

    res.status(200).json({ message: 'Hospital verification status updated.', hospital });
  } catch (error) {
    res.status(500).json({ message: 'Hospital verification update failed.', error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // 'Active', 'Suspended'

    if (!['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status type.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { status } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await AuditLog.create({
      action: 'USER_STATUS_CHANGE',
      performedBy: req.user.id,
      role: req.user.role,
      details: { userId, updatedStatus: status }
    });

    res.status(200).json({ message: `User status changed to ${status}.`, user });
  } catch (error) {
    res.status(500).json({ message: 'User status update failed.', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve user registry.', error: error.message });
  }
};

exports.predictShortage = async (req, res) => {
  try {
    const { month, state, currentInventory, prevMonthDemand } = req.body;

    const stateMap = {
      'Andhra Pradesh': 1,
      'Arunachal Pradesh': 2,
      'Assam': 3,
      'Bihar': 4,
      'Chhattisgarh': 5,
      'Goa': 6,
      'Gujarat': 7,
      'Haryana': 8,
      'Himachal Pradesh': 9,
      'Jharkhand': 10,
      'Karnataka': 11,
      'Kerala': 12,
      'Madhya Pradesh': 13,
      'Maharashtra': 14,
      'Manipur': 15,
      'Meghalaya': 16,
      'Mizoram': 17,
      'Nagaland': 18,
      'Odisha': 19,
      'Punjab': 20,
      'Rajasthan': 21,
      'Sikkim': 22,
      'Tamil Nadu': 23,
      'Telangana': 24,
      'Tripura': 25,
      'Uttar Pradesh': 26,
      'Uttarakhand': 27,
      'West Bengal': 28,
      'Delhi': 29
    };

    const stateCode = stateMap[state] || ((state && state.charCodeAt(0) % 9) + 1) || 3;
    const currentMonth = month ? parseInt(month) : (new Date().getMonth() + 1);
    const prevDemand = prevMonthDemand ? parseInt(prevMonthDemand) : 40;
    const inventory = currentInventory ? parseInt(currentInventory) : 25;
    const pincodeFactor = 0.65;

    try {
      const response = await fetch('http://localhost:8000/api/ai/predict-shortage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          state_code: stateCode,
          pincode_factor: pincodeFactor,
          current_inventory: inventory,
          prev_month_demand: prevDemand
        })
      });

      if (!response.ok) {
        throw new Error(`AI engine responded with status: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (aiError) {
      console.warn(`[AI Predict Shortage] Falling back to rule-based forecast. Reason: ${aiError.message}`);
      
      const isSummer = currentMonth >= 5 && currentMonth <= 7;
      const seasonFactor = isSummer ? 1.3 : 1.0;
      const expectedDeficit = Math.max(0, Math.round((prevDemand * seasonFactor * pincodeFactor) - inventory));
      const message = expectedDeficit > 30 ? "High risk of blood deficit! (Fallback)" : "Safe buffer levels predicted. (Fallback)";
      
      return res.status(200).json({
        predicted_shortage: expectedDeficit,
        message
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error processing shortage forecast.', error: error.message });
  }
};

// 1. Delete a campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByIdAndDelete(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }
    await AuditLog.create({
      action: 'CAMPAIGN_DELETE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { campaignId: id, title: campaign.title }
    });
    res.status(200).json({ message: 'Campaign drive deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete campaign.', error: error.message });
  }
};

// 2. Delete a CMS blog article
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog article not found.' });
    }
    await AuditLog.create({
      action: 'BLOG_DELETE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { blogId: id, title: blog.title }
    });
    res.status(200).json({ message: 'Blog article deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete blog article.', error: error.message });
  }
};

// 3. Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['Super Admin', 'Admin', 'Donor', 'Recipient', 'Hospital'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await AuditLog.create({
      action: 'USER_ROLE_CHANGE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { userId, updatedRole: role }
    });

    res.status(200).json({ message: `User role updated successfully to ${role}.`, user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role.', error: error.message });
  }
};

// 4. Update user reward points and badges
exports.updateUserRewards = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rewardPoints, badges } = req.body;

    const updates = {};
    if (rewardPoints !== undefined) updates.rewardPoints = rewardPoints;
    if (badges !== undefined) updates.badges = badges;

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await AuditLog.create({
      action: 'USER_REWARDS_UPDATE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { userId, rewardPoints, badges }
    });

    res.status(200).json({ message: 'User rewards and badges updated successfully.', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user rewards.', error: error.message });
  }
};

// 5. Update hospital blood inventory
exports.updateHospitalInventory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { bloodInventory } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: userId, role: 'Hospital' },
      { $set: { bloodInventory } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Hospital account not found.' });
    }

    await AuditLog.create({
      action: 'HOSPITAL_INVENTORY_UPDATE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { userId, bloodInventory }
    });

    res.status(200).json({ message: 'Hospital blood inventory updated successfully.', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update hospital inventory.', error: error.message });
  }
};

// 6. Update blood request status
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // 'Pending', 'Fulfilled', 'Cancelled'

    if (!['Pending', 'Fulfilled', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid blood request status.' });
    }

    const request = await BloodRequest.findByIdAndUpdate(requestId, { status }, { new: true });
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    await AuditLog.create({
      action: 'REQUEST_STATUS_CHANGE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { requestId, status }
    });

    res.status(200).json({ message: `Blood request status updated to ${status}.`, request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update request status.', error: error.message });
  }
};

// 7. Toggle blood request emergency mode
exports.toggleRequestEmergency = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { emergencyMode } = req.body;

    const request = await BloodRequest.findByIdAndUpdate(requestId, { emergencyMode }, { new: true });
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found.' });
    }

    await AuditLog.create({
      action: 'REQUEST_EMERGENCY_TOGGLE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { requestId, emergencyMode }
    });

    res.status(200).json({ message: `Request emergency mode ${emergencyMode ? 'activated' : 'deactivated'}.`, request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle request emergency mode.', error: error.message });
  }
};

// 8. Broadcast platform-wide administrative notification
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, targetRole } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message details are required.' });
    }

    // Determine target query
    const query = {};
    if (targetRole && targetRole !== 'All') {
      query.role = targetRole;
    } else {
      query.role = { $in: ['Donor', 'Recipient', 'Hospital'] };
    }

    const targetUsers = await User.find(query).select('_id');
    if (targetUsers.length === 0) {
      return res.status(200).json({ message: 'No matching users found for notification broadcast.' });
    }

    const notificationsData = targetUsers.map(user => ({
      recipient: user._id,
      donor: req.user.id,
      type: 'greeting',
      message: `📢 [Admin Broadcast] ${title}: ${message}`,
      requestStatus: 'None'
    }));

    await Notification.insertMany(notificationsData);

    try {
      const targetUserIds = targetUsers.map(u => u._id);
      broadcastToUsers(targetUserIds, 'admin_broadcast', {
        title: title,
        message: `📢 [Admin Broadcast] ${message}`,
        type: 'warning'
      });
    } catch (socketErr) {
      console.warn('[Admin Broadcast Sockets] Failed to emit socket broadcast:', socketErr.message);
    }

    await AuditLog.create({
      action: 'GLOBAL_BROADCAST_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { title, targetRole, messageBody: message }
    });

    res.status(201).json({ message: `Successfully broadcasted to ${targetUsers.length} users.` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to broadcast global notification.', error: error.message });
  }
};

// 9. Delete a user account permanently
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent administrative self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Self-deletion is prohibited.' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    // Create Audit Log of deletion for compliance tracing
    await AuditLog.create({
      action: 'USER_DELETE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { deletedUserId: userId, fullName: user.fullName, email: user.email }
    });

    res.status(200).json({ message: 'User account successfully deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user account.', error: error.message });
  }
};

// 10. Delete a blood request ticket permanently
exports.deleteRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await BloodRequest.findByIdAndDelete(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Blood request ticket not found.' });
    }

    // Record action in the Audit Log for tracking compliance
    await AuditLog.create({
      action: 'REQUEST_DELETE_ADMIN',
      performedBy: req.user.id,
      role: req.user.role,
      details: { requestId, patientName: request.patientName, bloodGroup: request.bloodGroup }
    });

    res.status(200).json({ message: 'Blood request ticket permanently deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete blood request ticket.', error: error.message });
  }
};




