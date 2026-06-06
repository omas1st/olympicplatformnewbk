// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.get('/me', auth, authController.getMe);

// Forgot password flow
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
