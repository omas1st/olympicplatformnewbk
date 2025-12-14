const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  whatsapp: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  sex: {
    type: String,
    required: true,
    enum: ['male', 'female']
  },
  occupation: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 18
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'ZAR' // Changed from USD to ZAR
  },
  plans: [{
    type: String
  }],
  proofOfPayment: {
    type: String
  },
  subscriptionDate: {
    type: Date
  },
  idCardGenerated: {
    type: Boolean,
    default: false
  },
  trackingNumber: {
    type: String
  },
  signatureAdded: {
    type: Boolean,
    default: false
  },
  approvalStampAdded: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  personalPin: {
    type: String
  },
  lastLogin: {
    type: Date
  },
  verifiedAt: {
    type: Date
  },
  cloudinaryPublicId: {
    type: String
  },
  // NEW: Add progress tracking field
  progress: {
    lastVisitedPage: String,
    lastVisitedTime: Date,
    lastCompletedPage: String,
    completedSteps: [String],
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// SIMPLIFIED password hashing - No next parameter issues
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw new Error('Password hashing failed: ' + error.message);
  }
});

// SIMPLIFIED password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed: ' + error.message);
  }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.personalPin;
  delete user.cloudinaryPublicId;
  return user;
};

module.exports = mongoose.model('User', userSchema);