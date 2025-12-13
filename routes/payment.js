// routes/payment.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const PaymentPage = require('../models/PaymentPage');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get payment page
router.get('/payment/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const paymentPage = await PaymentPage.findById(id);
    if (!paymentPage || !paymentPage.isActive) {
      return res.status(404).json({ 
        success: false,
        message: 'Payment page not found' 
      });
    }
    
    res.json({ 
      success: true,
      page: paymentPage
    });
  } catch (error) {
    console.error('Get payment page error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching payment page' 
    });
  }
});

// Process payment
router.post('/payment/:id/process', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    const paymentPage = await PaymentPage.findById(id);
    if (!paymentPage || !paymentPage.isActive) {
      return res.status(404).json({ 
        success: false,
        message: 'Payment page not found' 
      });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Check if amount matches
    if (parseFloat(amount) !== paymentPage.amount) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid amount' 
      });
    }
    
    // Check balance
    if (user.balance < paymentPage.amount) {
      return res.status(400).json({ 
        success: false,
        message: `Insufficient balance. Please fund your wallet with R${paymentPage.amount - user.balance}` 
      });
    }
    
    // Deduct amount
    user.balance -= paymentPage.amount;
    await user.save();
    
    // Create notification
    const notification = new Notification({
      user: req.user._id,
      message: `Payment of R${paymentPage.amount} processed successfully for ${paymentPage.name}.`,
      type: 'system'
    });
    await notification.save();
    
    res.json({ 
      success: true,
      message: 'Payment processed successfully',
      user,
      nextPage: paymentPage.nextPage
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing payment' 
    });
  }
});

module.exports = router;