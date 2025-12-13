const mongoose = require('mongoose');

const idCardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: String,
  lastName: String,
  phoneNumber: String,
  gender: String,
  dateOfBirth: Date,
  selectedPlan: String,
  imageUrl: String,
  publicId: String,
  trackingNumber: String,
  signatureUrl: String,
  approvalStampUrl: String,
  status: {
    type: String,
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('IDCard', idCardSchema);