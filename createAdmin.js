// createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB (using updated connection options)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB for admin setup'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Import the User model
const User = require('./models/User');

const createAdminUser = async () => {
  try {
    console.log('Creating admin user...');
    
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || 'admin@olympic.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD is not set in environment variables');
      process.exit(1);
    }
    
    console.log(`Using email: ${adminEmail}`);
    
    // Check if admin user already exists
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (adminUser) {
      console.log('Admin user already exists. Updating...');
      
      // Update existing user to admin role
      adminUser.role = 'admin';
      adminUser.name = 'Admin';
      adminUser.whatsapp = '+0000000000';
      adminUser.country = 'International';
      adminUser.sex = 'male';
      adminUser.occupation = 'Administrator';
      adminUser.age = 30;
      adminUser.isVerified = true;
      
      // Update password
      const salt = await bcrypt.genSalt(10);
      adminUser.password = await bcrypt.hash(adminPassword, salt);
      
      await adminUser.save();
      console.log('Admin user updated successfully!');
    } else {
      console.log('Creating new admin user...');
      
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      adminUser = new User({
        name: 'Admin',
        email: adminEmail,
        whatsapp: '+0000000000',
        country: 'International',
        sex: 'male',
        occupation: 'Administrator',
        age: 30,
        password: hashedPassword,
        role: 'admin',
        balance: 0,
        currency: 'USD',
        isVerified: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully!');
    }
    
    console.log('\n✅ Admin user setup complete!');
    console.log('Admin user details:');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Name: ${adminUser.name}`);
    console.log(`Password: ${adminPassword} (from environment)`);
    console.log('\nYou can now login with:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    
    mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.name === 'ValidationError') {
      Object.keys(error.errors).forEach(field => {
        console.error(`  ${field}: ${error.errors[field].message}`);
      });
    }
    mongoose.connection.close();
    process.exit(1);
  }
};

createAdminUser();