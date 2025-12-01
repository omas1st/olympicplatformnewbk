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

// Notification routes
router.get('/notifications/:userId', userController.getNotifications);

// PIN verification routes
router.post('/verify-pin', userController.verifyPin);
router.get('/pin-info', userController.getAccessPinInfo);
router.get('/check-verification', userController.checkVerification);
router.post('/verify-user', userController.verifyUser);

// Message routes
router.post('/send-message', userController.sendMessage);

// File upload routes
router.post('/upload-proof', multerUpload.single('proof'), userController.uploadProof);

module.exports = router;