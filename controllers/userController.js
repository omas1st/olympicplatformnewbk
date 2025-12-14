const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const AccessPin = require('../models/AccessPin');
const Deposit = require('../models/Deposit');
const UserSubscription = require('../models/UserSubscription'); // Add this
const IDCard = require('../models/IDCard'); // Add this
const emailService = require('../utils/emailService');
const { uploadToCloudinary } = require('../middleware/upload');

const userController = {
  // Get user notifications
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

  // Upload proof of payment (for general use)
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

  // Submit deposit request - FIXED VERSION
  submitDeposit: async (req, res) => {
    try {
      console.log('Submit deposit request received:', req.body);
      console.log('User ID:', req.user._id);

      const { amount, paymentMethod, currency } = req.body;

      // Validate amount
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Please enter a valid deposit amount' 
        });
      }

      // Validate payment method
      const validPaymentMethods = ['bank_transfer', 'cryptocurrency'];
      if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ 
          success: false,
          message: 'Please select a valid payment method' 
        });
      }

      // Parse the amount to ensure it's a number
      const depositAmount = parseFloat(amount);

      // Create deposit record
      const deposit = new Deposit({
        user: req.user._id,
        amount: depositAmount,
        paymentMethod: paymentMethod,
        currency: currency || 'ZAR',
        status: 'pending'
      });

      console.log('Creating deposit record:', deposit);

      // Save deposit
      await deposit.save();
      console.log('Deposit saved successfully, ID:', deposit._id);

      // Send notification to user about deposit request
      const userNotification = new Notification({
        user: req.user._id,
        message: `Your deposit request of ${currency || 'ZAR'} ${depositAmount.toFixed(2)} has been submitted. Please upload proof of payment.`,
        type: 'system'
      });
      await userNotification.save();

      // Also create a notification for admin (optional, you might want to handle this differently)
      try {
        const adminNotification = new Notification({
          user: req.user._id, // This would be better with an admin user ID
          message: `New deposit request: ${currency || 'ZAR'} ${depositAmount.toFixed(2)} from user ${req.user.email}`,
          type: 'admin_message'
        });
        await adminNotification.save();
      } catch (adminNotifyError) {
        console.error('Failed to create admin notification:', adminNotifyError);
        // Don't fail the whole request if admin notification fails
      }

      // Send email notification if email service is configured
      try {
        const user = await User.findById(req.user._id).select('-password');
        if (user && emailService) {
          await emailService.sendDepositRequestNotification(
            user.toObject(), 
            depositAmount, 
            currency || 'ZAR',
            paymentMethod
          );
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the whole request if email fails
      }

      res.json({ 
        success: true,
        message: 'Deposit request submitted successfully. Please upload proof of payment.',
        depositId: deposit._id,
        deposit: deposit
      });

    } catch (error) {
      console.error('Submit deposit error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      let errorMessage = 'Error submitting deposit request';
      
      if (error.name === 'ValidationError') {
        errorMessage = 'Validation error: ' + Object.values(error.errors).map(err => err.message).join(', ');
        return res.status(400).json({ 
          success: false,
          message: errorMessage
        });
      }

      res.status(500).json({ 
        success: false,
        message: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Upload deposit proof
  uploadDepositProof: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'No file provided' 
        });
      }

      // Check file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid file type. Only JPG, PNG, and PDF are allowed.' 
        });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ 
          success: false,
          message: 'File size too large. Maximum size is 5MB.' 
        });
      }

      // Upload to Cloudinary
      console.log('Uploading deposit proof to Cloudinary for user:', req.user._id);
      const uploadResult = await uploadToCloudinary(
        req.file.buffer, 
        req.user._id, 
        req.file.mimetype,
        'deposit_proofs'
      );

      console.log('Cloudinary upload successful:', uploadResult.secure_url);

      // Find the user's latest pending deposit
      const deposit = await Deposit.findOne({
        user: req.user._id,
        status: 'pending'
      }).sort({ createdAt: -1 });

      if (!deposit) {
        // Create a new deposit record if none exists
        console.log('No pending deposit found, creating new one');
        const newDeposit = new Deposit({
          user: req.user._id,
          amount: 0,
          paymentMethod: 'unknown',
          currency: 'ZAR',
          status: 'proof_uploaded',
          proofUrl: uploadResult.secure_url,
          proofPublicId: uploadResult.public_id
        });
        
        await newDeposit.save();

        // Create notification for user
        const notification = new Notification({
          user: req.user._id,
          message: 'Proof of payment uploaded successfully. Please wait for admin approval.',
          type: 'system'
        });
        await notification.save();

        res.json({ 
          success: true,
          message: 'Proof of payment uploaded successfully. Please wait for admin approval.',
          deposit: newDeposit,
          cloudinaryUrl: uploadResult.secure_url
        });
        return;
      }

      // Update existing deposit with proof
      console.log('Updating deposit:', deposit._id, 'with proof');
      deposit.proofUrl = uploadResult.secure_url;
      deposit.proofPublicId = uploadResult.public_id;
      deposit.status = 'proof_uploaded';
      await deposit.save();

      // Get user info for email
      const user = await User.findById(req.user._id).select('-password');

      // Send email notification to admin
      try {
        if (emailService) {
          await emailService.sendDepositProofNotification(
            user.toObject(), 
            deposit.amount, 
            deposit.currency, 
            uploadResult.secure_url
          );
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }

      // Create notification for user
      const notification = new Notification({
        user: req.user._id,
        message: `Your deposit proof for ${deposit.currency} ${deposit.amount} has been uploaded successfully. Waiting for admin approval.`,
        type: 'system'
      });
      await notification.save();

      // Create notification for admin
      try {
        const adminNotification = new Notification({
          user: req.user._id,
          message: `Deposit proof uploaded by ${user.email} for amount ${deposit.currency} ${deposit.amount}. Please review.`,
          type: 'admin_message'
        });
        await adminNotification.save();
      } catch (adminNotifyError) {
        console.error('Failed to create admin notification:', adminNotifyError);
      }

      res.json({ 
        success: true,
        message: 'Proof of payment uploaded successfully. Admin has been notified and will review your deposit.',
        deposit: deposit,
        cloudinaryUrl: uploadResult.secure_url
      });
    } catch (error) {
      console.error('Upload deposit proof error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Error uploading proof of payment';
      
      if (error.name === 'ValidationError') {
        errorMessage = 'Validation error: ' + Object.values(error.errors).map(err => err.message).join(', ');
        return res.status(400).json({ 
          success: false,
          message: errorMessage
        });
      }

      res.status(500).json({ 
        success: false,
        message: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // VIP redirect notification
  vipRedirect: async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Create notification for admin
      const notification = new Notification({
        user: userId,
        message: `User ${req.user.email} has been redirected to subscription page from VIP membership.`,
        type: 'admin_message'
      });
      await notification.save();
      
      res.json({ 
        success: true,
        message: 'Redirect successful' 
      });
    } catch (error) {
      console.error('VIP redirect error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error processing redirect' 
      });
    }
  },

  // Subscribe to plan
  subscribePlan: async (req, res) => {
    try {
      console.log('Subscribe plan request received:', req.body);
      console.log('Authenticated user ID:', req.user._id);
      
      const { plan, price } = req.body;
      
      // Find the authenticated user
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      console.log('User found:', user.email, 'Balance:', user.balance);
      
      // Check balance
      if (user.balance < price) {
        return res.status(400).json({ 
          success: false,
          message: `Insufficient balance. You have R${user.balance.toFixed(2)} but need R${price}.` 
        });
      }
      
      // Deduct amount
      user.balance -= price;
      user.plans = [plan];
      user.subscriptionDate = new Date();
      await user.save();
      
      console.log('Plan subscribed, new balance:', user.balance);
      
      // Create subscription record
      const subscription = new UserSubscription({
        user: req.user._id,
        plan,
        price,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
      await subscription.save();
      
      // Create notification for user
      const userNotification = new Notification({
        user: req.user._id,
        message: `You have successfully subscribed to: ${plan}. Amount R${price} deducted from your balance.`,
        type: 'system'
      });
      await userNotification.save();
      
      // Create notification for admin
      const adminNotification = new Notification({
        user: req.user._id,
        message: `User ${user.email} has subscribed to ${plan} for R${price}.`,
        type: 'admin_message'
      });
      await adminNotification.save();
      
      res.json({ 
        success: true,
        message: 'Subscription successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          currency: user.currency,
          plans: user.plans
        }
      });
    } catch (error) {
      console.error('Subscribe plan error:', error);
      console.error('Error details:', error.stack);
      res.status(500).json({ 
        success: false,
        message: 'Error processing subscription' 
      });
    }
  },

  // Generate ID card
  generateIdCard: async (req, res) => {
    try {
      const { firstName, lastName, phoneNumber, gender, dateOfBirth, selectedPlan, amount } = req.body;
      const image = req.file;
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      // Check balance
      if (user.balance < amount) {
        return res.status(400).json({ 
          success: false,
          message: 'Insufficient balance' 
        });
      }
      
      // Upload image to Cloudinary
      const uploadResult = await uploadToCloudinary(
        image.buffer,
        req.user._id,
        image.mimetype,
        'id_cards'
      );
      
      // Deduct amount
      user.balance -= amount;
      user.idCardGenerated = true;
      await user.save();
      
      // Create ID card record
      const idCard = new IDCard({
        user: req.user._id,
        firstName,
        lastName,
        phoneNumber,
        gender,
        dateOfBirth,
        selectedPlan,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id
      });
      await idCard.save();
      
      // Create notification for user
      const userNotification = new Notification({
        user: req.user._id,
        message: `ID Card generated successfully. Amount R${amount} deducted from your balance.`,
        type: 'system'
      });
      await userNotification.save();
      
      // Create notification for admin
      const adminNotification = new Notification({
        user: req.user._id,
        message: `User ${user.email} has generated an ID card for R${amount}.`,
        type: 'admin_message'
      });
      await adminNotification.save();
      
      res.json({ 
        success: true,
        message: 'ID Card generated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          currency: user.currency,
          plans: user.plans
        },
        idCard
      });
    } catch (error) {
      console.error('Generate ID card error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error generating ID card' 
      });
    }
  },

  // Generate tracking number
  generateTracking: async (req, res) => {
    try {
      const { amount } = req.body;
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      // Check balance
      if (user.balance < amount) {
        return res.status(400).json({ 
          success: false,
          message: 'Insufficient balance' 
        });
      }
      
      // Generate tracking number
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const trackingNumber = `member${randomDigits}OWP`;
      
      // Deduct amount
      user.balance -= amount;
      user.trackingNumber = trackingNumber;
      await user.save();
      
      // Update ID card with tracking number
      await IDCard.findOneAndUpdate(
        { user: req.user._id },
        { trackingNumber },
        { new: true }
      );
      
      // Create notification for user
      const userNotification = new Notification({
        user: req.user._id,
        message: `Tracking number generated: ${trackingNumber}. Amount R${amount} deducted from your balance.`,
        type: 'system'
      });
      await userNotification.save();
      
      // Create notification for admin
      const adminNotification = new Notification({
        user: req.user._id,
        message: `User ${user.email} has generated a tracking number for R${amount}.`,
        type: 'admin_message'
      });
      await adminNotification.save();
      
      res.json({ 
        success: true,
        message: 'Tracking number generated',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          currency: user.currency,
          plans: user.plans
        },
        trackingNumber
      });
    } catch (error) {
      console.error('Generate tracking error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error generating tracking number' 
      });
    }
  },

  // Generate signature
  generateSignature: async (req, res) => {
    try {
      const { amount } = req.body;
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      // Check balance
      if (user.balance < amount) {
        return res.status(400).json({ 
          success: false,
          message: 'Insufficient balance' 
        });
      }
      
      // Deduct amount
      user.balance -= amount;
      user.signatureAdded = true;
      await user.save();
      
      // Update ID card with signature
      await IDCard.findOneAndUpdate(
        { user: req.user._id },
        { 
          signatureUrl: 'https://res.cloudinary.com/your-cloud/image/upload/v1/img13.png',
          status: 'completed'
        },
        { new: true }
      );
      
      // Create notification for user
      const userNotification = new Notification({
        user: req.user._id,
        message: `Card signature added successfully. Amount R${amount} deducted from your balance.`,
        type: 'system'
      });
      await userNotification.save();
      
      // Create notification for admin
      const adminNotification = new Notification({
        user: req.user._id,
        message: `User ${user.email} has added card signature for R${amount}.`,
        type: 'admin_message'
      });
      await adminNotification.save();
      
      res.json({ 
        success: true,
        message: 'Signature generated',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          currency: user.currency,
          plans: user.plans
        }
      });
    } catch (error) {
      console.error('Generate signature error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error generating signature' 
      });
    }
  },

  // Generate approval stamp
  generateStamp: async (req, res) => {
    try {
      const { amount } = req.body;
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      // Check balance
      if (user.balance < amount) {
        return res.status(400).json({ 
          success: false,
          message: 'Insufficient balance' 
        });
      }
      
      // Deduct amount
      user.balance -= amount;
      user.approvalStampAdded = true;
      await user.save();
      
      // Update ID card with approval stamp
      await IDCard.findOneAndUpdate(
        { user: req.user._id },
        { 
          approvalStampUrl: 'https://res.cloudinary.com/your-cloud/image/upload/v1/img15.png'
        },
        { new: true }
      );
      
      // Create notification for user
      const userNotification = new Notification({
        user: req.user._id,
        message: `Approval stamp added successfully. Amount R${amount} deducted from your balance.`,
        type: 'system'
      });
      await userNotification.save();
      
      // Create notification for admin
      const adminNotification = new Notification({
        user: req.user._id,
        message: `User ${user.email} has added approval stamp for R${amount}.`,
        type: 'admin_message'
      });
      await adminNotification.save();
      
      res.json({ 
        success: true,
        message: 'Approval stamp generated',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          currency: user.currency,
          plans: user.plans
        }
      });
    } catch (error) {
      console.error('Generate stamp error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error generating approval stamp' 
      });
    }
  },

  // Deduct PIN fee
  deductPinFee: async (req, res) => {
    try {
      const { amount } = req.body;
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      // Check balance
      if (user.balance < amount) {
        return res.status(400).json({ 
          success: false,
          message: 'Insufficient balance to deduct PIN fee' 
        });
      }
      
      // Deduct amount
      user.balance -= amount;
      await user.save();
      
      // Create notification for user
      const userNotification = new Notification({
        user: req.user._id,
        message: `R${amount} deducted for PIN verification. Your new balance is R${user.balance.toFixed(2)}.`,
        type: 'system'
      });
      await userNotification.save();
      
      res.json({ 
        success: true,
        message: 'PIN fee deducted successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          currency: user.currency,
          plans: user.plans
        }
      });
    } catch (error) {
      console.error('Deduct PIN fee error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error deducting PIN fee' 
      });
    }
  },

  // Get next page
  getNextPage: async (req, res) => {
    try {
      // Get the next page configured by admin
      // For now, return default dashboard
      res.json({ 
        success: true,
        nextPage: '/dashboard'
      });
    } catch (error) {
      console.error('Get next page error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error getting next page' 
      });
    }
  },

  // Verify PIN
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

        // Create notification
        const notification = new Notification({
          user: user._id,
          message: 'Personal PIN verification successful. VIP access granted.',
          type: 'pin_update'
        });
        await notification.save();

        // Send email notification
        try {
          if (emailService) {
            await emailService.sendPinSubmissionNotification(
              user.toObject(), 
              'Personal PIN Verification Successful', 
              pin
            );
          }
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

        // Create notification
        const notification = new Notification({
          user: user._id,
          message: 'Global PIN verification successful. VIP access granted.',
          type: 'pin_update'
        });
        await notification.save();

        try {
          if (emailService) {
            await emailService.sendPinSubmissionNotification(
              user.toObject(), 
              'Global PIN Verification Successful', 
              pin
            );
          }
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
      
      // Create notification for failed attempt
      const notification = new Notification({
        user: user._id,
        message: 'Failed PIN attempt. Please contact admin for correct PIN.',
        type: 'system'
      });
      await notification.save();

      try {
        if (emailService) {
          await emailService.sendPinSubmissionNotification(
            user.toObject(), 
            'Failed PIN Attempt', 
            pin
          );
        }
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

      // Create notification
      const notification = new Notification({
        user: user._id,
        message: `Account verification status updated to ${verified ? 'verified' : 'unverified'}.`,
        type: verified ? 'pin_update' : 'system'
      });
      await notification.save();

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

      // Get pending deposits
      const pendingDeposits = await Deposit.find({
        user: req.user._id,
        status: { $in: ['pending', 'proof_uploaded'] }
      }).sort({ createdAt: -1 });

      res.json({
        user,
        notifications,
        pendingDeposits
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

  // In userController.js - Add these methods

// Update user progress
updateProgress: async (req, res) => {
  try {
    const { pageName, stepCompleted } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Initialize progress if not exists
    user.progress = user.progress || {};
    
    // Update last visited page
    user.progress.lastVisitedPage = pageName;
    user.progress.lastVisitedTime = new Date();
    user.progress.updatedAt = new Date();
    
    // Update last completed page if step is completed
    if (stepCompleted) {
      user.progress.lastCompletedPage = pageName;
      user.progress.completedSteps = user.progress.completedSteps || [];
      if (!user.progress.completedSteps.includes(pageName)) {
        user.progress.completedSteps.push(pageName);
      }
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Progress updated successfully',
      progress: user.progress
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating progress' 
    });
  }
},

// Get user progress
getProgress: async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('progress');
    
    res.json({
      success: true,
      progress: user.progress || {}
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error getting progress' 
    });
  }
},

// Reset user progress
resetProgress: async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    user.progress = {};
    await user.save();
    
    res.json({
      success: true,
      message: 'Progress reset successfully'
    });
  } catch (error) {
    console.error('Reset progress error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error resetting progress' 
    });
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

      // Create notification
      const notification = new Notification({
        user: user._id,
        message: 'Your profile has been updated successfully.',
        type: 'system'
      });
      await notification.save();

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