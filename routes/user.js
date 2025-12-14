const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth'); // FIXED: Destructure auth from the object
const { multerUpload } = require('../middleware/upload');
const userController = require('../controllers/userController');

// All routes require authentication
router.use(auth);

// Dashboard routes
router.get('/dashboard', userController.getDashboard);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// NEW: Progress tracking routes
router.post('/update-progress', userController.updateProgress);
router.get('/progress', userController.getProgress);
router.delete('/reset-progress', userController.resetProgress);

// Notification routes
router.get('/notifications/:userId', userController.getNotifications);

// PIN verification routes
router.post('/verify-pin', userController.verifyPin);
router.get('/pin-info', userController.getAccessPinInfo);
router.get('/check-verification', userController.checkVerification);
router.post('/verify-user', userController.verifyUser);

// Message routes
router.post('/send-message', userController.sendMessage);

// Deposit routes - ADD THESE
router.post('/submit-deposit', userController.submitDeposit);
router.post('/upload-deposit-proof', multerUpload.single('proof'), userController.uploadDepositProof);

// File upload routes (original proof upload - keep for compatibility)
router.post('/upload-proof', multerUpload.single('proof'), userController.uploadProof);

// Add these routes to routes/user.js:
router.post('/vip-redirect', userController.vipRedirect);
router.post('/subscribe-plan', userController.subscribePlan);
router.post('/generate-id-card', multerUpload.single('image'), userController.generateIdCard);
router.post('/generate-tracking', userController.generateTracking);
router.post('/generate-signature', userController.generateSignature);
router.post('/generate-stamp', userController.generateStamp);
router.post('/deduct-pin-fee', userController.deductPinFee);
router.get('/next-page', userController.getNextPage);

module.exports = router;