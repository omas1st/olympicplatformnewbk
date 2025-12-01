// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../utils/emailService');

const authController = {
  // Register user
  register: async (req, res) => {
    try {
      console.log('Registration attempt:', req.body.email);
      const { name, email, whatsapp, country, sex, occupation, age, password } = req.body;

      // Convert email to lowercase and trim
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists (case-insensitive)
      const existingUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
      });
      
      if (existingUser) {
        console.log('Registration failed: User already exists');
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Create user with normalized email
      const user = new User({
        name,
        email: normalizedEmail, // Store in lowercase
        whatsapp,
        country,
        sex,
        occupation,
        age,
        password,
        role: 'user',
        lastLogin: new Date()
      });

      await user.save();
      console.log('User registered successfully:', user.email);

      // Send email notification to admin for new registration
      try {
        await emailService.sendNewUserNotification(user.toObject());
        console.log('New user registration email sent to admin');
      } catch (emailError) {
        console.error('Failed to send registration email:', emailError);
        // Continue even if email fails
      }

      // Generate token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.secret_key,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          balance: user.balance,
          currency: user.currency
        }
      });
    } catch (error) {
      console.error('Registration error details:', error);

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        console.log('Validation errors:', messages);
        return res.status(400).json({ 
          message: 'Validation error', 
          details: messages 
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      res.status(500).json({ 
        message: 'Server error during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Login user (handles both users and admin)
  login: async (req, res) => {
    try {
      console.log('Login attempt:', req.body.email);
      const { email, password } = req.body;

      // Normalize email (convert to lowercase and trim)
      const normalizedEmail = email.toLowerCase().trim();

      // Debug: Log what credentials are being checked
      console.log('Normalized email for login:', normalizedEmail);
      console.log('Checking against ADMIN_USERNAME:', process.env.ADMIN_USERNAME);
      console.log('Checking against ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
      console.log('Checking against ADMIN_PASSWORD (first 3 chars):', process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.substring(0, 3) + '...' : 'NOT SET');

      // Special check for admin credentials from environment variables FIRST
      // Also normalize admin email/username for comparison
      const adminUsername = process.env.ADMIN_USERNAME ? process.env.ADMIN_USERNAME.toLowerCase().trim() : '';
      const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : '';
      
      const adminUsernameMatch = (normalizedEmail === adminUsername);
      const adminEmailMatch = (normalizedEmail === adminEmail);
      const adminPasswordMatch = (password === process.env.ADMIN_PASSWORD);
      
      console.log('Admin match results:', {
        adminUsernameMatch,
        adminEmailMatch,
        adminPasswordMatch
      });

      // If using admin credentials
      if ((adminUsernameMatch || adminEmailMatch) && adminPasswordMatch) {
        console.log('Admin credentials detected - attempting admin login');
        
        // Find admin user with case-insensitive search
        const adminEmailToUse = adminEmail || adminUsername || 'admin@olympic.com';
        console.log('Looking for admin user with email (case-insensitive):', adminEmailToUse);
        
        let adminUser = await User.findOne({ 
          email: { $regex: new RegExp(`^${adminEmailToUse}$`, 'i') }
        });
        
        if (!adminUser) {
          console.log('Admin user not found in database. Creating one...');
          
          // Create admin user with normalized email
          adminUser = new User({
            name: 'Admin',
            email: adminEmailToUse,
            whatsapp: '+0000000000',
            country: 'International',
            sex: 'male',
            occupation: 'Administrator',
            age: 30,
            password: password, // This will be hashed by the pre-save hook
            role: 'admin',
            balance: 0,
            currency: 'USD',
            isVerified: true,
            lastLogin: new Date()
          });
          
          await adminUser.save();
          console.log('New admin user created');
        } else {
          console.log('Admin user found:', adminUser.email, 'Role:', adminUser.role);
          
          // Ensure user has admin role
          if (adminUser.role !== 'admin') {
            adminUser.role = 'admin';
            await adminUser.save();
            console.log('Updated user role to admin');
          }
          
          // Manually check password if it's the admin password from env
          const isPasswordMatch = await adminUser.comparePassword(password);
          console.log('Password match result:', isPasswordMatch);
          
          if (!isPasswordMatch) {
            // If password doesn't match, update it to the current admin password
            console.log('Updating admin password to current env password');
            adminUser.password = password;
            await adminUser.save();
          }
          
          // Update last login
          adminUser.lastLogin = new Date();
          await adminUser.save();
        }

        // Generate token with admin role
        const token = jwt.sign(
          { userId: adminUser._id, role: 'admin' },
          process.env.secret_key,
          { expiresIn: '24h' }
        );

        console.log('Admin login successful:', adminUser.email);
        return res.json({
          message: 'Admin login successful',
          token,
          user: {
            id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            role: 'admin',
            balance: adminUser.balance,
            currency: adminUser.currency,
            plans: adminUser.plans
          }
        });
      }

      // Normal user login flow with case-insensitive email search
      const user = await User.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
      });
      
      if (!user) {
        console.log('Login failed: User not found');
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.log('Login failed: Password mismatch');
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Send email notification to admin for user login
      try {
        await emailService.sendUserLoginNotification(user.toObject());
        console.log('User login email sent to admin');
      } catch (emailError) {
        console.error('Failed to send login email:', emailError);
        // Continue even if email fails
      }

      // Generate token with user role
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.secret_key,
        { expiresIn: '24h' }
      );

      console.log('Login successful:', user.email, 'Role:', user.role);
      res.json({
        message: 'Login successful',
        token,
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
      console.error('Login error details:', error);

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({ message: 'Validation error', details: messages });
      }

      res.status(500).json({ 
        message: 'Server error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Admin login (separate endpoint - optional)
  adminLogin: async (req, res) => {
    try {
      const { username, password } = req.body;

      console.log('Admin login attempt:', username);
      
      // Normalize username for case-insensitive comparison
      const normalizedUsername = username.toLowerCase().trim();
      const adminUsername = process.env.ADMIN_USERNAME ? process.env.ADMIN_USERNAME.toLowerCase().trim() : '';
      
      console.log('Checking against ADMIN_USERNAME (normalized):', adminUsername);
      console.log('Checking against ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '***' : 'NOT SET');

      // Check admin credentials with case-insensitive username comparison
      if (normalizedUsername !== adminUsername || password !== process.env.ADMIN_PASSWORD) {
        return res.status(400).json({ message: 'Invalid admin credentials' });
      }

      // Find admin user with case-insensitive search
      const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : adminUsername;
      let adminUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${adminEmail}$`, 'i') }
      });
      
      if (!adminUser) {
        console.log('Admin user not found, creating one...');
        
        // Create admin user
        adminUser = new User({
          name: 'Admin',
          email: adminEmail,
          whatsapp: '+0000000000',
          country: 'International',
          sex: 'male',
          occupation: 'Administrator',
          age: 30,
          password: password,
          role: 'admin',
          balance: 0,
          currency: 'USD',
          isVerified: true,
          lastLogin: new Date()
        });
        
        await adminUser.save();
      }

      // Ensure user has admin role
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
      }

      // Update last login
      adminUser.lastLogin = new Date();
      await adminUser.save();

      // Generate token
      const token = jwt.sign(
        { userId: adminUser._id, role: 'admin' },
        process.env.secret_key,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Admin login successful',
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: 'admin',
          balance: adminUser.balance,
          currency: adminUser.currency,
          plans: adminUser.plans
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({ message: 'Validation error', details: messages });
      }

      res.status(500).json({ message: 'Server error during admin login' });
    }
  },

  // Get current user
  getMe: async (req, res) => {
    try {
      res.json({
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          balance: req.user.balance,
          currency: req.user.currency,
          plans: req.user.plans
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Server error fetching user data' });
    }
  }
};

module.exports = authController;