const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, campaignController.createCampaign);
router.get('/', campaignController.getCampaigns);

module.exports = router;
