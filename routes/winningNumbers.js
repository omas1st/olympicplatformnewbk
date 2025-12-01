const express = require('express');
const WinningNumber = require('../models/WinningNumber');
const router = express.Router();

// Get current winning numbers
router.get('/', async (req, res) => {
  try {
    let winningNumbers = await WinningNumber.findOne();
    
    if (!winningNumbers) {
      winningNumbers = new WinningNumber();
      await winningNumbers.save();
    }

    res.json(winningNumbers);
  } catch (error) {
    console.error('Get winning numbers error:', error);
    res.status(500).json({ message: 'Error fetching winning numbers' });
  }
});

module.exports = router;