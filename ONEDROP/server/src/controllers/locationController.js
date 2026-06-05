const Location = require('../models/Location');

// Get all unique states
exports.getStates = async (req, res) => {
  try {
    const states = await Location.distinct('state');
    res.status(200).json(states.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving states.', error: error.message });
  }
};

// Get all districts in a state
exports.getDistricts = async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).json({ message: 'State parameter is required.' });
    }

    const districts = await Location.distinct('district', { state });
    res.status(200).json(districts.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving districts.', error: error.message });
  }
};

// Get all cities in a state and district
exports.getCities = async (req, res) => {
  try {
    const { state, district } = req.query;
    if (!state || !district) {
      return res.status(400).json({ message: 'State and District parameters are required.' });
    }

    const cities = await Location.distinct('city', { state, district });
    res.status(200).json(cities.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving cities.', error: error.message });
  }
};

// Get areas, villages, and pincodes for a specific city
exports.getAreasAndVillages = async (req, res) => {
  try {
    const { state, district, city } = req.query;
    if (!state || !district || !city) {
      return res.status(400).json({ message: 'State, District, and City parameters are required.' });
    }

    const locationRecord = await Location.findOne({ state, district, city });
    if (!locationRecord) {
      return res.status(404).json({ message: 'Location data not found.' });
    }

    res.status(200).json({
      areas: locationRecord.areas || [],
      villages: locationRecord.villages || [],
      pincode: locationRecord.pincode
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving location specifics.', error: error.message });
  }
};

// Search by pincode directly
exports.getByPincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!pincode) {
      return res.status(400).json({ message: 'Pincode parameter is required.' });
    }

    const match = await Location.findOne({ pincode });
    if (!match) {
      return res.status(404).json({ message: 'Pincode not found in database.' });
    }

    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({ message: 'Error searching pincode.', error: error.message });
  }
};
