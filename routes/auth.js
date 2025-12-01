const express = require('express');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth'); // Correct
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.get('/me', auth, authController.getMe);

module.exports = router;