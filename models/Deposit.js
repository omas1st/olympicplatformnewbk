const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'ZAR'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cryptocurrency'],
    required: true
  },
  proofUrl: {
    type: String
  },
  proofPublicId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'proof_uploaded', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
depositSchema.index({ user: 1, createdAt: -1 });
depositSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Deposit', depositSchema);