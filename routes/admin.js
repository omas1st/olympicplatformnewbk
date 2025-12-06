// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, adminAuth } = require('../middleware/auth');
const { multerUpload } = require('../middleware/upload');

// Protect all routes with admin authentication
router.use(auth, adminAuth);

// Existing routes
router.get('/users', adminController.getUsers);
router.post('/message/:userId', adminController.sendMessage);
router.get('/winning-numbers', adminController.getWinningNumbers);
router.put('/winning-numbers', adminController.updateWinningNumbers);
router.post('/winning-numbers', adminController.updateWinningNumbers);
router.post('/move-to-past', adminController.moveToPastWinning);
router.post('/move-winning-numbers', adminController.moveToPastWinning);
router.get('/results', adminController.getResults);
router.put('/results', adminController.updateResults);
router.post('/results', adminController.updateResults);
router.get('/carousel', adminController.getCarousel);
router.post('/carousel', multerUpload.array('images', 10), adminController.uploadCarousel);
router.delete('/carousel/:id', adminController.deleteCarousel);
router.delete('/carousel', adminController.deleteAllCarousel);
router.put('/balance/:userId', adminController.updateBalance);
router.post('/balance/:userId', adminController.updateBalance); // ADDED: POST route for balance update
router.post('/update-balance/:userId', adminController.updateBalance); // ADDED: Alternative route
router.post('/activate-plan/:userId', adminController.activatePlan);
router.post('/set-user-plan/:userId', adminController.setUserPlan);
router.get('/messages', adminController.getMessages);

// New PIN management routes
router.get('/access-pin', adminController.getAccessPin);
router.put('/access-pin', adminController.updateAccessPin);
router.post('/access-pin', adminController.updateAccessPin);
router.post('/set-user-pin/:userId', adminController.setUserPin);

// New deposit management routes
router.get('/pending-deposits', adminController.getPendingDeposits);
router.post('/approve-deposit/:depositId', adminController.approveDeposit);
router.post('/reject-deposit/:depositId', adminController.rejectDeposit);

// New route for getting user by ID
router.get('/user/:userId', adminController.getUserById);

// Statistics route
router.get('/statistics', adminController.getStatistics);

module.exports = router;