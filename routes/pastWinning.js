const express = require('express');
const PastWinning = require('../models/PastWinning');
const router = express.Router();

// Get past winning numbers (last 7 days)
router.get('/', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pastWinnings = await PastWinning.find({
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ date: -1 });

    res.json(pastWinnings);
  } catch (error) {
    console.error('Get past winning error:', error);
    res.status(500).json({ message: 'Error fetching past winning numbers' });
  }
});

module.exports = router;