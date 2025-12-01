// models/Carousel.js
const mongoose = require('mongoose');

const carouselSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: Number,
    default: 0,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Updated pre-save middleware with proper async handling
carouselSchema.pre('save', async function(next) {
  try {
    // Update the updatedAt field
    this.updatedAt = new Date();
    
    // If this is a new document (not an update)
    if (this.isNew) {
      // Set created date
      this.createdAt = new Date();
      
      // Only set order if it's not already set
      if (this.order === 0 || !this.order) {
        // Get count of existing documents to set order
        const count = await mongoose.model('Carousel').countDocuments();
        this.order = count;
      }
    }
    
    // Call next to continue with the save operation
    if (next && typeof next === 'function') {
      next();
    }
  } catch (error) {
    console.error('Error in carousel pre-save middleware:', error);
    if (next && typeof next === 'function') {
      next(error);
    }
  }
});

module.exports = mongoose.model('Carousel', carouselSchema);