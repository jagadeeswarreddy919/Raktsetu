const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Apply security barriers globally across admin pathways
router.use(authenticate);
router.use(authorizeRoles('Admin', 'Super Admin'));

router.get('/metrics', adminController.getMetrics);
router.put('/verify/donor/:donorId', adminController.verifyDonor);
router.put('/verify/hospital/:hospitalId', adminController.verifyHospital);
router.put('/user/:userId/status', adminController.updateUserStatus);
router.get('/users', adminController.getAllUsers);
router.post('/predict-shortage', adminController.predictShortage);

// Advanced administrative mutations
router.delete('/campaigns/:id', adminController.deleteCampaign);
router.delete('/blogs/:id', adminController.deleteBlog);
router.delete('/users/:userId', adminController.deleteUser);
router.delete('/requests/:requestId', adminController.deleteRequest);
router.put('/user/:userId/role', adminController.updateUserRole);
router.put('/user/:userId/rewards', adminController.updateUserRewards);
router.put('/hospital/:userId/inventory', adminController.updateHospitalInventory);
router.put('/requests/:requestId/status', adminController.updateRequestStatus);
router.put('/requests/:requestId/emergency', adminController.toggleRequestEmergency);
router.post('/broadcast', adminController.broadcastNotification);

module.exports = router;


