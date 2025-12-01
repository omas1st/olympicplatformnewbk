const mongoose = require('mongoose');

const accessPinSchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    default: '68120',
    minlength: 5,
    maxlength: 5,
    validate: {
      validator: function(v) {
        return /^\d{5}$/.test(v);
      },
      message: 'PIN must be exactly 5 digits'
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Create a pre-save middleware to ensure only one document
accessPinSchema.pre('save', async function(next) {
  try {
    // Count existing documents
    const count = await mongoose.model('AccessPin').countDocuments();
    if (count > 0 && this.isNew) {
      throw new Error('Only one AccessPin document is allowed');
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get or create the single PIN document
accessPinSchema.statics.getPin = async function() {
  let pin = await this.findOne();
  if (!pin) {
    pin = await this.create({ pin: '68120' });
  }
  return pin;
};

const AccessPin = mongoose.model('AccessPin', accessPinSchema);

module.exports = AccessPin;