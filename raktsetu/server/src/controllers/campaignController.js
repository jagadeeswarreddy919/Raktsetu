const Campaign = require('../models/Campaign');
const AuditLog = require('../models/AuditLog');

exports.createCampaign = async (req, res) => {
  try {
    const {
      title, description, startDate, endDate, locationName,
      state, district, city, pincode, bannerImage
    } = req.body;

    // Only Hospitals and Admins can organize donation drives
    if (!['Hospital', 'Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized. Hospital or Admin permissions needed.' });
    }

    const campaign = await Campaign.create({
      title,
      description,
      organizer: req.user.id,
      startDate,
      endDate,
      locationName,
      state,
      district,
      city,
      pincode,
      bannerImage
    });

    await AuditLog.create({
      action: 'CAMPAIGN_CREATE',
      performedBy: req.user.id,
      role: req.user.role,
      details: { campaignId: campaign._id, title }
    });

    res.status(201).json({ message: 'Blood donation drive successfully registered.', campaign });
  } catch (error) {
    res.status(500).json({ message: 'Failed to establish donation camp.', error: error.message });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { state, district, city, status } = req.query;

    const query = {};
    if (state) query.state = state;
    if (district) query.district = district;
    if (city) query.city = city;
    if (status) query.status = status;

    const campaigns = await Campaign.find(query)
      .populate('organizer', 'fullName email phone profileImage')
      .sort({ startDate: 1 });

    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving active campaigns.', error: error.message });
  }
};
