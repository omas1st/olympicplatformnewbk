const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const AccessPin = require('../models/AccessPin');
const emailService = require('../utils/emailService');
const { uploadToCloudinary } = require('../middleware/upload'); // Updated import

const userController = {
  // Get user notifications - FIXED VERSION
  getNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify user has permission to view these notifications
      if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Fetch notifications for this user, sorted by most recent
      const notifications = await Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(50); // Increased limit to ensure all notifications show

      // Mark notifications as read if needed
      await Notification.updateMany(
        { user: userId, read: false },
        { read: true }
      );

      console.log(`Fetched ${notifications.length} notifications for user ${userId}`);

      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error fetching notifications: ' + error.message 
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

  // Upload proof of payment - UPDATED FOR DIRECT CLOUDINARY UPLOAD
  uploadProof: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      console.log('File received in memory:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer ? 'Exists' : 'Missing'
      });

      // Upload the buffer from memory directly to Cloudinary
      const uploadResult = await uploadToCloudinary(
        req.file.buffer, 
        req.user._id, 
        req.file.mimetype
      );

      console.log('Cloudinary upload result:', {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format
      });

      // Update user with Cloudinary URL and public_id
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { 
          proofOfPayment: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          isVerified: false
        },
        { new: true }
      ).select('-password');

      // Send email notification to admin
      try {
        await emailService.sendProofOfPaymentNotification(user.toObject(), uploadResult.secure_url);
        console.log('Proof of payment email sent to admin for user:', user.email);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Continue even if email fails
      }

      res.json({ 
        message: 'Proof of payment uploaded successfully to Cloudinary.',
        user,
        cloudinaryUrl: uploadResult.secure_url
      });
    } catch (error) {
      console.error('Upload proof error:', error);
      res.status(500).json({ 
        message: 'Error uploading proof of payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Verify PIN - UPDATED WITH EMAIL NOTIFICATION
  verifyPin: async (req, res) => {
    try {
      const { pin } = req.body;

      console.log('PIN verification attempt:', { userId: req.user._id, pin });

      // Validate PIN format
      if (!pin || pin.length !== 5 || !/^\d+$/.test(pin)) {
        // Send email notification for invalid PIN attempt
        try {
          const user = await User.findById(req.user._id);
          if (user) {
            await emailService.sendPinSubmissionNotification(user.toObject(), 'Invalid PIN Format', pin);
          }
        } catch (emailError) {
          console.error('Failed to send invalid PIN email:', emailError);
        }
        
        return res.status(400).json({ 
          message: 'Invalid PIN format. PIN must be exactly 5 digits.',
          verified: false 
        });
      }

      // Get current access PIN from database
      let accessPin = await AccessPin.findOne();
      
      // If no PIN exists in database, create default
      if (!accessPin) {
        console.log('No access PIN found, creating default');
        accessPin = await AccessPin.create({ pin: '68120' });
      }

      console.log('Current PIN in DB:', accessPin.pin);
      console.log('Entered PIN:', pin);

      // Check if PIN matches
      if (pin === accessPin.pin) {
        console.log('PIN matches, updating user verification');
        
        // Update user verification status
        const user = await User.findByIdAndUpdate(
          req.user._id, 
          { 
            isVerified: true,
            verifiedAt: new Date()
          },
          { new: true }
        ).select('-password');
        
        console.log('User updated:', user._id);
        
        // Send email notification to admin for successful PIN verification
        try {
          await emailService.sendPinSubmissionNotification(user.toObject(), 'Valid PIN - User Verified', pin);
          console.log('PIN verification email sent to admin for user:', user.email);
        } catch (emailError) {
          console.error('Failed to send PIN verification email:', emailError);
        }
        
        return res.json({ 
          message: 'PIN verified successfully. You now have VIP access.',
          verified: true,
          user
        });
      }

      // Check if user has personal PIN
      const user = await User.findById(req.user._id);
      if (user.personalPin && pin === user.personalPin) {
        console.log('Personal PIN matches');
        await User.findByIdAndUpdate(req.user._id, { 
          isVerified: true,
          verifiedAt: new Date()
        });
        
        // Send email notification to admin
        try {
          await emailService.sendPinSubmissionNotification(user.toObject(), 'Valid Personal PIN - User Verified', pin);
        } catch (emailError) {
          console.error('Failed to send personal PIN email:', emailError);
        }
        
        return res.json({ 
          message: 'PIN verified successfully. You now have VIP access.',
          verified: true 
        });
      }

      console.log('PIN does not match');
      
      // Send email notification for invalid PIN attempt
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          await emailService.sendPinSubmissionNotification(user.toObject(), 'Invalid PIN Attempt', pin);
        }
      } catch (emailError) {
        console.error('Failed to send invalid PIN email:', emailError);
      }
      
      // If PIN doesn't match any valid PIN
      return res.status(400).json({ 
        message: 'Invalid PIN. Please message the admin for the correct PIN to access the winning numbers.',
        verified: false 
      });
    } catch (error) {
      console.error('Verify PIN error details:', error);
      
      // Send email notification for PIN verification error
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          await emailService.sendPinSubmissionNotification(user.toObject(), 'PIN Verification Error', 'N/A');
        }
      } catch (emailError) {
        console.error('Failed to send PIN error email:', emailError);
      }
      
      res.status(500).json({ 
        message: 'Error verifying PIN. Please try again or contact admin.',
        verified: false,
        error: error.message 
      });
    }
  },

  // Simple verification endpoint (alternative)
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

  // Get dashboard data - UPDATED VERSION
  getDashboard: async (req, res) => {
    try {
      // Get fresh user data from database
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
        message: 'Error fetching dashboard data: ' + error.message 
      });
    }
  },

  // Get access PIN info
  getAccessPinInfo: async (req, res) => {
    try {
      const accessPin = await AccessPin.findOne();
      const user = await User.findById(req.user._id);
      const hasPersonalPin = user.personalPin ? true : false;
      
      res.json({
        globalPin: accessPin ? accessPin.pin : '68120',
        hasPersonalPin,
        personalPin: hasPersonalPin ? 'Set (hidden for security)' : 'Not set'
      });
    } catch (error) {
      console.error('Get PIN info error:', error);
      res.status(500).json({ message: 'Error fetching PIN information' });
    }
  },

  // Check if user is verified
  checkVerification: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('isVerified verifiedAt plans');
      res.json({
        isVerified: user.isVerified || false,
        verifiedAt: user.verifiedAt,
        plans: user.plans || []
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