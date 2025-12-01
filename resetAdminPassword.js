// resetAdminPassword.js
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const User = require('./models/User');

const resetAdminPassword = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'omas7th@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || '@Stephen1st';
    
    console.log('Resetting admin password...');
    console.log('Admin email:', adminEmail);
    console.log('New password:', adminPassword);
    
    // Find the admin user
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log('Admin user not found. Creating...');
      adminUser = new User({
        name: 'Admin',
        email: adminEmail,
        whatsapp: '+0000000000',
        country: 'International',
        sex: 'male',
        occupation: 'Administrator',
        age: 30,
        password: adminPassword,
        role: 'admin',
        balance: 0,
        currency: 'USD',
        isVerified: true
      });
    } else {
      console.log('Admin user found. Updating password...');
      // Set the password directly - it will be hashed by pre-save hook
      adminUser.password = adminPassword;
      adminUser.role = 'admin';
    }
    
    await adminUser.save();
    console.log('✅ Admin password reset successfully!');
    console.log('You can now login with:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

resetAdminPassword();