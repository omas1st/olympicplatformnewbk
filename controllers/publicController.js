// controllers/publicController.js
const WinningNumber = require('../models/WinningNumber');
const Result = require('../models/Result');
const PastWinning = require('../models/PastWinning');
const Carousel = require('../models/Carousel');

const publicController = {
  // Get winning numbers
  getWinningNumbers: async (req, res) => {
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
  },

  // Get results
  getResults: async (req, res) => {
    try {
      console.log('[DEBUG] Fetching results from database...');
      let results = await Result.findOne();
      
      if (!results) {
        console.log('[DEBUG] No results found, creating default...');
        results = new Result();
        await results.save();
      }
      
      console.log('[DEBUG] Results fetched successfully');
      res.json(results);
    } catch (error) {
      console.error('[ERROR] Get results error:', error);
      res.status(500).json({ message: 'Error fetching results' });
    }
  },

  // Get past winning numbers - WITH DEBUG LOGGING
  getPastWinning: async (req, res) => {
    try {
      console.log('[DEBUG] Fetching past winning numbers...');
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      console.log('[DEBUG] Looking for records created after:', threeDaysAgo);

      const pastWinnings = await PastWinning.find({
        createdAt: { $gte: threeDaysAgo }
      }).sort({ date: -1 });

      console.log(`[DEBUG] Found ${pastWinnings.length} past winning records:`);
      
      // Log each record for debugging
      pastWinnings.forEach((record, index) => {
        console.log(`[DEBUG] Record ${index + 1}:`, {
          id: record._id,
          date: record.date,
          lotteryType: record.lotteryType,
          createdAt: record.createdAt,
          lunchtime: record.lunchtime,
          teatime: record.teatime,
          goslotto536: record.goslotto536,
          goslotto749: record.goslotto749,
          powerball: record.powerball
        });
      });

      res.json(pastWinnings);
    } catch (error) {
      console.error('[ERROR] Get past winning error:', error);
      res.status(500).json({ message: 'Error fetching past winning numbers' });
    }
  },

  // Get carousel images
  getCarousel: async (req, res) => {
  try {
    const carouselImages = await Carousel.find().sort({ order: 1, createdAt: -1 });
    res.json(carouselImages);
  } catch (error) {
    console.error('Get carousel error:', error);
    res.status(500).json({ message: 'Error fetching carousel images' });
  }
  }
};

module.exports = publicController;