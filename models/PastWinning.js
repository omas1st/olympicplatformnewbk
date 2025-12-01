// models/pastWinning.js
const mongoose = require('mongoose');

const pastWinningSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  lotteryType: {
    type: String,
    required: true
  },
  lunchtime: [String],
  teatime: [String],
  goslotto536: [String],
  goslotto749: [String],
  powerball: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for automatic deletion after 3 days (3 * 24 * 60 * 60 = 259200 seconds)
pastWinningSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

module.exports = mongoose.model('PastWinning', pastWinningSchema);