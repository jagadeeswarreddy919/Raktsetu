const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/firebase-login', authController.firebaseLogin);
router.post('/firebase-register', authController.firebaseRegister);
router.post('/firebase-sync', authenticate, authController.firebaseSync);
router.post('/supabase-login', authController.supabaseLogin);
router.post('/supabase-register', authController.supabaseRegister);
router.post('/supabase-sync', authenticate, authController.supabaseSync);
router.get('/profile', authenticate, authController.getProfile);
router.get('/users', authenticate, authController.getAllUsersPublic);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/fcm-token', authenticate, authController.updateFcmToken);
router.put('/inventory', authenticate, authController.updateInventory);
router.get('/leaderboard', authController.getLeaderboard);

// Development Mock SMTP Routes for Real Email dispatches
router.post('/mock-send-verification', authController.mockSendVerification);
router.get('/mock-verify-email', authController.mockVerifyEmail);
router.post('/mock-verify-email-otp', authController.mockVerifyEmailOTP);
router.post('/mock-forgot-password', authController.mockForgotPassword);
router.get('/mock-reset-password-page', authController.mockResetPasswordPage);
// Admin WhatsApp OTP Password Recovery Routes
router.post('/admin-forgot-password', authController.adminForgotPassword);
router.post('/admin-reset-password', authController.adminResetPassword);

// User WhatsApp OTP Password Recovery Routes
router.post('/user-forgot-password', authController.userForgotPassword);
router.post('/user-reset-password', authController.userResetPassword);

// Secure Email Fallback OTP Delivery Routes
router.post('/admin-forgot-password-email', authController.adminForgotPasswordEmail);
router.post('/user-forgot-password-email', authController.userForgotPasswordEmail);

// Verification endpoints for the progressive 3-step wizard
router.post('/admin-verify-otp', authController.adminVerifyOtp);
router.post('/user-verify-otp', authController.userVerifyOtp);

// Secure Resend SMS OTP Delivery Routes
router.post('/admin-resend-sms', authController.adminResendSms);
router.post('/user-resend-sms', authController.userResendSms);

module.exports = router;
