const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const PaymentPage = require('./models/PaymentPage');
const UserSubscription = require('./models/UserSubscription');
const IDCard = require('./models/IDCard');
require('dotenv').config();

const connectDB = require('./config/db');
const paymentRoutes = require('./routes/payment'); // Add this here

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// ========== ROUTES - ORDER MATTERS! ==========
// Specific routes FIRST
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/countries', require('./routes/countries'));
app.use('/api/payment', paymentRoutes); // Add payment routes here

// Generic routes LAST (after specific ones)
app.use('/api', require('./routes/public')); // This should come AFTER specific routes
// ============================================

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API root test route
app.get('/api', (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const mongoState = states[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    message: 'API is working successfully',
    mongodb: mongoState,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err && err.stack ? err.stack : err);

  if (err && err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors || {}).map(e => e.message)
    });
  }

  if (err && err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  res.status(500).json({
    message: 'Something went wrong on our server. Please try again later.'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found. Please check the API endpoint.',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});