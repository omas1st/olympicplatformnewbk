// routes/carousel.js
const express = require('express');
const Carousel = require('../models/Carousel');
const router = express.Router();

// Get carousel images
router.get('/', async (req, res) => {
  try {
    const carouselImages = await Carousel.find().sort({ order: 1, createdAt: -1 });
    res.json(carouselImages);
  } catch (error) {
    console.error('Get carousel error:', error);
    res.status(500).json({ message: 'Error fetching carousel images' });
  }
});

module.exports = router;