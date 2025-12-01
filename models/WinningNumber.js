const mongoose = require('mongoose');

const winningNumberSchema = new mongoose.Schema({
  lunchtime: {
    type: [String],
    default: ['00', '00', '00', '00']
  },
  teatime: {
    type: [String],
    default: ['00', '00', '00', '00']
  },
  goslotto536: {
    type: [String],
    default: ['00', '00', '00', '00']
  },
  goslotto749: {
    type: [String],
    default: ['00', '00', '00', '00']
  },
  powerball: {
    type: [String],
    default: ['00', '00', '00', '00']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WinningNumber', winningNumberSchema);