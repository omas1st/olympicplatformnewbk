const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const AccessPin = require('../models/AccessPin');
const emailService = require('../utils/emailService');
const { uploadToCloudinary } = require('../middleware/upload');

const userController = {
  // Get user notifications - FIXED VERSION
  getNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const notifications = await Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50);

      await Notification.updateMany(
        { user: userId, read: false },
        { read: true }
      );

      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error fetching notifications' 
      });
    }
  },

  // Send message to admin
  sendMessage: async (req, res) => {
    try {
      const { message } = req.body;

      const userMessage = new Message({
        from: req.user._id,
        message: message
      });

      await userMessage.save();

      res.json({ message: 'Message sent to admin successfully' });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Error sending message' });
    }
  },

  // Upload proof of payment
  uploadProof: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const uploadResult = await uploadToCloudinary(
        req.file.buffer, 
        req.user._id, 
        req.file.mimetype
      );

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { 
          proofOfPayment: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          isVerified: false
        },
        { new: true }
      ).select('-password');

      try {
        await emailService.sendProofOfPaymentNotification(user.toObject(), uploadResult.secure_url);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }

      res.json({ 
        message: 'Proof of payment uploaded successfully.',
        user,
        cloudinaryUrl: uploadResult.secure_url
      });
    } catch (error) {
      console.error('Upload proof error:', error);
      res.status(500).json({ 
        message: 'Error uploading proof of payment'
      });
    }
  },

  // Verify PIN - FIXED VERSION
  verifyPin: async (req, res) => {
    try {
      const { pin } = req.body;

      console.log('PIN verification attempt:', { 
        userId: req.user._id, 
        pin,
        timestamp: new Date().toISOString() 
      });

      // Validate PIN format
      if (!pin || pin.length !== 5 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ 
          message: 'Invalid PIN format. PIN must be exactly 5 digits.',
          verified: false 
        });
      }

      // FIRST: Check user's personal PIN (set by admin)
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found',
          verified: false 
        });
      }

      console.log('User personal PIN:', user.personalPin);
      console.log('User verification status:', user.isVerified);

      // Check if user has a personal PIN set by admin
      if (user.personalPin && user.personalPin.trim() === pin.trim()) {
        console.log('Personal PIN matched for user:', user._id);
        
        // Update user verification status
        user.isVerified = true;
        user.verifiedAt = new Date();
        await user.save();

        // Send notification
        try {
          await emailService.sendPinSubmissionNotification(
            user.toObject(), 
            'Personal PIN Verification Successful', 
            pin
          );
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }

        return res.json({ 
          message: 'PIN verified successfully. You now have VIP access.',
          verified: true,
          pinType: 'personal'
        });
      }

      // SECOND: Check global access PIN
      let accessPin = await AccessPin.findOne();
      
      if (!accessPin) {
        accessPin = await AccessPin.create({ pin: '68120' });
      }

      console.log('Global PIN from DB:', accessPin.pin);

      if (pin.trim() === accessPin.pin.trim()) {
        console.log('Global PIN matched for user:', user._id);
        
        user.isVerified = true;
        user.verifiedAt = new Date();
        await user.save();

        try {
          await emailService.sendPinSubmissionNotification(
            user.toObject(), 
            'Global PIN Verification Successful', 
            pin
          );
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }

        return res.json({ 
          message: 'PIN verified successfully. You now have VIP access.',
          verified: true,
          pinType: 'global'
        });
      }

      // THIRD: If no match, return error
      console.log('No PIN match for user:', user._id);
      
      try {
        await emailService.sendPinSubmissionNotification(
          user.toObject(), 
          'Failed PIN Attempt', 
          pin
        );
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }

      return res.status(400).json({ 
        message: 'Invalid PIN. Please contact the admin for the correct PIN.',
        verified: false 
      });

    } catch (error) {
      console.error('Verify PIN error details:', error);
      
      res.status(500).json({ 
        message: 'Error verifying PIN. Please try again.',
        verified: false
      });
    }
  },

  // Simple verification endpoint
  verifyUser: async (req, res) => {
    try {
      const { verified } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { 
          isVerified: verified,
          verifiedAt: new Date()
        },
        { new: true }
      ).select('-password');

      res.json({ 
        message: 'Verification status updated',
        user 
      });
    } catch (error) {
      console.error('Verify user error:', error);
      res.status(500).json({ message: 'Error updating verification status' });
    }
  },

  // Get dashboard data
  getDashboard: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({
        user,
        notifications
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error fetching dashboard data'
      });
    }
  },

  // Get access PIN info
  getAccessPinInfo: async (req, res) => {
    try {
      const accessPin = await AccessPin.findOne();
      const user = await User.findById(req.user._id);
      
      res.json({
        globalPin: accessPin ? accessPin.pin : '68120',
        hasPersonalPin: !!user.personalPin,
        personalPinSet: user.personalPin ? 'Yes' : 'No'
      });
    } catch (error) {
      console.error('Get PIN info error:', error);
      res.status(500).json({ message: 'Error fetching PIN information' });
    }
  },

  // Check if user is verified
  checkVerification: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('isVerified verifiedAt plans personalPin');
      res.json({
        isVerified: user.isVerified || false,
        verifiedAt: user.verifiedAt,
        plans: user.plans || [],
        hasPersonalPin: !!user.personalPin
      });
    } catch (error) {
      console.error('Check verification error:', error);
      res.status(500).json({ message: 'Error checking verification status' });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-password');
      res.json(user);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Error fetching profile' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const updates = req.body;
      const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true }
      ).select('-password');

      res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  }
};

module.exports = userController;