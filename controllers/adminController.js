// controllers/adminController.js
const User = require('../models/User');
const WinningNumber = require('../models/WinningNumber');
const Result = require('../models/Result');
const Carousel = require('../models/Carousel');
const PastWinning = require('../models/PastWinning');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const AccessPin = require('../models/AccessPin');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary } = require('../middleware/upload');

const adminController = {
  // Get all users
  getUsers: async (req, res) => {
    try {
      const users = await User.find({ role: 'user' }).select('-password');
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Error fetching users' });
    }
  },

  // Send message to user - FIXED VERSION
  sendMessage: async (req, res) => {
    try {
      const { userId } = req.params;
      const { message } = req.body;

      if (!message || message.trim() === '') {
        return res.status(400).json({ 
          success: false,
          message: 'Message cannot be empty' 
        });
      }

      // Find the user first
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Create notification with proper user reference
      const notification = new Notification({
        user: userId,
        message: `Admin: ${message.trim()}`,
        type: 'admin_message',
        read: false
      });
      
      await notification.save();
      
      console.log(`Message sent to user ${userId} (${user.email}):`, message);

      res.json({ 
        success: true,
        message: 'Message sent successfully',
        notificationId: notification._id
      });
    } catch (error) {
      console.error('Send message error details:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error sending message: ' + error.message 
      });
    }
  },

  // Set user plan - FIXED VERSION
  setUserPlan: async (req, res) => {
    try {
      const { userId } = req.params;
      const { plan } = req.body;

      if (!plan) {
        return res.status(400).json({ 
          success: false,
          message: 'Plan is required' 
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Update user's plans (only one plan per user)
      user.plans = [plan];
      await user.save();

      // Send notification to user about plan update
      const notification = new Notification({
        user: userId,
        message: `Your plan has been updated to: ${plan}. You can now access the winning numbers.`,
        type: 'plan_update',
        read: false
      });
      await notification.save();

      console.log(`Plan updated for user ${userId}: ${plan}`);

      // Return updated user without password
      const updatedUser = await User.findById(userId).select('-password');

      res.json({ 
        success: true,
        message: 'Plan updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Set user plan error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error setting user plan: ' + error.message 
      });
    }
  },

  // Get current access PIN - FIXED VERSION
  getAccessPin: async (req, res) => {
    try {
      // Try to find existing PIN
      let accessPin = await AccessPin.findOne();
      
      // If no PIN exists, create one with default value
      if (!accessPin) {
        accessPin = await AccessPin.create({ 
          pin: '68120',
          updatedBy: req.user._id,
          updatedAt: new Date()
        });
      }
      
      res.json({ 
        pin: accessPin.pin,
        updatedAt: accessPin.updatedAt,
        updatedBy: accessPin.updatedBy 
      });
    } catch (error) {
      console.error('Get access PIN error:', error);
      // Return default PIN in case of error
      res.json({ pin: '68120', updatedAt: new Date() });
    }
  },

  // Update access PIN - COMPLETELY REWRITTEN VERSION
  updateAccessPin: async (req, res) => {
    try {
      const { pin } = req.body;

      if (!pin || pin.length !== 5 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ message: 'PIN must be exactly 5 digits' });
      }

      // Use findOneAndUpdate with upsert to handle both create and update
      const accessPin = await AccessPin.findOneAndUpdate(
        {}, // Empty filter to find the first/only document
        { 
          pin: pin,
          updatedBy: req.user._id,
          updatedAt: new Date()
        },
        { 
          upsert: true, // Create if doesn't exist
          new: true,    // Return the updated document
          setDefaultsOnInsert: true, // Use defaults when creating
          runValidators: true // Run schema validators
        }
      );

      console.log('Access PIN updated successfully:', accessPin.pin);

      // Notify all users about PIN change
      try {
        const users = await User.find({ role: 'user' });
        const notificationPromises = users.map(user => 
          new Notification({
            user: user._id,
            message: 'Important: The access PIN has been updated. If you have issues accessing VIP content, please contact admin.',
            type: 'system'
          }).save()
        );
        await Promise.all(notificationPromises);
        console.log(`Notifications sent to ${users.length} users about PIN change`);
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError);
        // Continue even if notifications fail
      }

      res.json({ 
        success: true,
        message: 'Access PIN updated successfully',
        pin: accessPin.pin,
        updatedAt: accessPin.updatedAt
      });
    } catch (error) {
      console.error('Update access PIN error details:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error updating access PIN: ' + error.message 
      });
    }
  },

  // Set user-specific PIN
  setUserPin: async (req, res) => {
    try {
      const { userId } = req.params;
      const { pin } = req.body;

      // Validate PIN format
      if (!pin || pin.length !== 5 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ message: 'PIN must be exactly 5 digits' });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { personalPin: pin },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Send notification to user
      const notification = new Notification({
        user: userId,
        message: `Your personal PIN has been set. Use this PIN to access VIP features.`,
        type: 'pin_update'
      });
      await notification.save();

      res.json({ message: 'User PIN set successfully', user });
    } catch (error) {
      console.error('Set user PIN error:', error);
      res.status(500).json({ message: 'Error setting user PIN' });
    }
  },

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

  // Update winning numbers
  updateWinningNumbers: async (req, res) => {
    try {
      const { lunchtime, teatime, goslotto536, goslotto749, powerball } = req.body;

      let winningNumbers = await WinningNumber.findOne();
      if (!winningNumbers) {
        winningNumbers = new WinningNumber();
      }

      // Update numbers
      winningNumbers.lunchtime = lunchtime;
      winningNumbers.teatime = teatime;
      winningNumbers.goslotto536 = goslotto536;
      winningNumbers.goslotto749 = goslotto749;
      winningNumbers.powerball = powerball;
      winningNumbers.lastUpdated = new Date();

      await winningNumbers.save();

      res.json({ message: 'Winning numbers updated successfully' });
    } catch (error) {
      console.error('Update winning numbers error:', error);
      res.status(500).json({ message: 'Error updating winning numbers' });
    }
  },

  // Move to past winning
  moveToPastWinning: async (req, res) => {
    try {
      const { date } = req.body;
      const winningNumbers = await WinningNumber.findOne();

      if (!winningNumbers) {
        return res.status(400).json({ message: 'No winning numbers found' });
      }

      // Create combined past winning record
      const pastWinning = new PastWinning({
        date: new Date(date),
        lotteryType: 'Combined Results',
        lunchtime: winningNumbers.lunchtime,
        teatime: winningNumbers.teatime,
        goslotto536: winningNumbers.goslotto536,
        goslotto749: winningNumbers.goslotto749,
        powerball: winningNumbers.powerball
      });

      await pastWinning.save();
      res.json({ message: 'Winning numbers moved to past records' });
    } catch (error) {
      console.error('Move winning numbers error:', error);
      res.status(500).json({ message: 'Error moving winning numbers' });
    }
  },

  // Get results
  getResults: async (req, res) => {
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
  },

  // Update results
  updateResults: async (req, res) => {
    try {
      const { lunchtime, teatime, goslotto536, goslotto749, powerball } = req.body;

      let results = await Result.findOne();
      if (!results) {
        results = new Result();
      }

      results.lunchtime = lunchtime;
      results.teatime = teatime;
      results.goslotto536 = goslotto536;
      results.goslotto749 = goslotto749;
      results.powerball = powerball;
      results.lastUpdated = new Date();

      await results.save();
      res.json({ message: 'Results updated successfully' });
    } catch (error) {
      console.error('Update results error:', error);
      res.status(500).json({ message: 'Error updating results' });
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
  },

  // Upload carousel images - FIXED VERSION FOR MEMORY STORAGE
  uploadCarousel: async (req, res) => {
    try {
      console.log('[DEBUG] Upload carousel request received');
      console.log('[DEBUG] Files:', req.files);
      console.log('[DEBUG] User:', req.user._id);

      if (!req.files || req.files.length === 0) {
        console.log('[DEBUG] No files provided');
        return res.status(400).json({ message: 'No image files provided' });
      }

      const uploadedImages = [];
      const errors = [];

      // Get current count for ordering
      const currentCount = await Carousel.countDocuments();
      console.log('[DEBUG] Current carousel count:', currentCount);

      // Process files one by one
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        console.log(`[DEBUG] Processing file ${i + 1}/${req.files.length}:`, file.originalname);

        try {
          // Upload to Cloudinary using the uploadToCloudinary function with carousel folder
          const cloudinaryResult = await uploadToCloudinary(
            file.buffer, 
            req.user._id, 
            file.mimetype, 
            'olympic/carousel' // Specify carousel folder
          );

          console.log('[DEBUG] Cloudinary upload successful:', cloudinaryResult.secure_url);

          // Create carousel document with explicit dates to avoid middleware issues
          const carouselImage = new Carousel({
            imageUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            uploadedBy: req.user._id,
            order: currentCount + i,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // Save without triggering the pre-save middleware issues
          const savedImage = await carouselImage.save({ validateBeforeSave: true });
          console.log('[DEBUG] Image saved to database:', savedImage._id);

          uploadedImages.push(savedImage);

        } catch (fileError) {
          console.error(`[ERROR] Error processing file ${file.originalname}:`, fileError);
          errors.push(`${file.originalname}: ${fileError.message}`);
        }
      }

      console.log('[DEBUG] Upload completed. Success:', uploadedImages.length, 'Errors:', errors.length);

      if (uploadedImages.length === 0) {
        const errorMsg = errors.length > 0 
          ? `Failed to upload any images. Errors: ${errors.join(', ')}`
          : 'Failed to upload any images';
        return res.status(500).json({ message: errorMsg });
      }

      const successMessage = errors.length > 0
        ? `${uploadedImages.length} image(s) uploaded successfully. ${errors.length} failed: ${errors.join(', ')}`
        : `${uploadedImages.length} image(s) uploaded successfully`;

      res.json({
        success: true,
        message: successMessage,
        images: uploadedImages,
        totalUploaded: uploadedImages.length,
        failed: errors.length
      });

    } catch (error) {
      console.error('[ERROR] Upload carousel error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading images: ' + (error.message || 'Unknown error')
      });
    }
  },

  // Delete single carousel image
  deleteCarousel: async (req, res) => {
    try {
      const { id } = req.params;
      const carouselImage = await Carousel.findById(id);

      if (!carouselImage) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(carouselImage.publicId);
        console.log('[DEBUG] Image deleted from Cloudinary:', carouselImage.publicId);
      } catch (cloudinaryError) {
        console.error('[DEBUG] Cloudinary delete error:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }

      // Delete from database
      await Carousel.findByIdAndDelete(id);
      console.log('[DEBUG] Image deleted from database:', id);

      res.json({ 
        success: true,
        message: 'Image deleted successfully' 
      });
    } catch (error) {
      console.error('Delete carousel error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error deleting image' 
      });
    }
  },

  // Delete all carousel images
  deleteAllCarousel: async (req, res) => {
    try {
      const carouselImages = await Carousel.find();

      if (carouselImages.length === 0) {
        return res.status(200).json({ 
          success: true,
          message: 'No carousel images to delete' 
        });
      }

      console.log('[DEBUG] Deleting all carousel images:', carouselImages.length);

      // Delete each image from Cloudinary
      for (const image of carouselImages) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
          console.log('[DEBUG] Deleted from Cloudinary:', image.publicId);
        } catch (error) {
          console.error(`[DEBUG] Failed to delete image ${image.publicId} from Cloudinary:`, error);
        }
      }

      // Delete all from database
      await Carousel.deleteMany({});
      console.log('[DEBUG] All images deleted from database');

      res.json({ 
        success: true,
        message: `All ${carouselImages.length} carousel images deleted successfully` 
      });
    } catch (error) {
      console.error('Delete all carousel error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error deleting all carousel images' 
      });
    }
  },

  // Update user balance
  updateBalance: async (req, res) => {
    try {
      const { userId } = req.params;
      const { balance } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { balance },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'Balance updated successfully', user });
    } catch (error) {
      console.error('Update balance error:', error);
      res.status(500).json({ message: 'Error updating balance' });
    }
  },

  // Activate plan
  activatePlan: async (req, res) => {
    try {
      const { userId } = req.params;
      const { plan } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Add plan if not exists
      if (!user.plans.includes(plan)) {
        user.plans.push(plan);
        await user.save();
      }

      res.json({ message: 'Plan activated successfully', user });
    } catch (error) {
      console.error('Activate plan error:', error);
      res.status(500).json({ message: 'Error activating plan' });
    }
  },

  // Get all messages
  getMessages: async (req, res) => {
    try {
      const messages = await Message.find()
        .populate('from', 'name email')
        .sort({ createdAt: -1 });
      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: 'Error fetching messages' });
    }
  },

  // Get single user details
  getUserById: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ message: 'Error fetching user details' });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Also delete user's notifications and messages
      await Notification.deleteMany({ user: userId });
      await Message.deleteMany({ from: userId });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Error deleting user' });
    }
  },

  // Get statistics
  getStatistics: async (req, res) => {
    try {
      const totalUsers = await User.countDocuments({ role: 'user' });
      const verifiedUsers = await User.countDocuments({ isVerified: true });
      const totalMessages = await Message.countDocuments();
      const totalNotifications = await Notification.countDocuments();
      
      // Get recent users (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentUsers = await User.countDocuments({ 
        createdAt: { $gte: weekAgo } 
      });

      res.json({
        totalUsers,
        verifiedUsers,
        totalMessages,
        totalNotifications,
        recentUsers,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ message: 'Error fetching statistics' });
    }
  }
};

module.exports = adminController;