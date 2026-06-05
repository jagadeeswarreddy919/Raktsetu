const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, requestController.createRequest);
router.get('/', requestController.getRequests);
router.get('/stats/global', requestController.getGlobalStats);
router.get('/stats/inventory', requestController.getBloodInventoryStats);
router.get('/search/donors', requestController.searchDonors);
router.get('/:id', requestController.getRequestById);
router.post('/:id/pledge', authenticate, requestController.pledgeDonation);
router.put('/:id/pledge/:pledgeId', authenticate, requestController.updatePledgeStatus);
router.delete('/:id', authenticate, requestController.deleteRequest);
router.put('/:id', authenticate, requestController.updateRequest);


module.exports = router;
