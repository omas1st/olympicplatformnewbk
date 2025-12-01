const express = require('express');
const Result = require('../models/Result');
const router = express.Router();

// Get current results
router.get('/', async (req, res) => {
  try {
    let results = await Result.findOne();
    
    if (!results) {
      results = new Result();
      await results.save();
    }

    res.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Error fetching results' });
  }
});

module.exports = router;