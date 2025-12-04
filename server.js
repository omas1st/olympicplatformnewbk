const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Make sure this matches your actual file: ./config/db.js
const connectDB = require('./config/db');

const app = express();

// SIMPLE CORS configuration - This is the key fix
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-frontend-domain.vercel.app', // Replace with your actual frontend domain
      process.env.FRONTEND_URL || ''
    ];
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests manually for all routes
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-frontend-domain.vercel.app',
      process.env.FRONTEND_URL || ''
    ];
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api', require('./routes/public'));
app.use('/api/countries', require('./routes/countries'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test specific endpoint
app.get('/api/test-pin-route', (req, res) => {
  res.status(200).json({
    message: 'PIN route test successful',
    endpoint: '/api/user/verify-pin is available',
    timestamp: new Date().toISOString()
  });
});

// API root test route — shows whether MongoDB is connected
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
    routes: {
      auth: '/api/auth',
      admin: '/api/admin',
      user: '/api/user',
      public: '/api/public',
      health: '/health'
    },
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

  // CORS error
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS Error: Request blocked. Origin not allowed.',
      origin: req.headers.origin
    });
  }

  res.status(500).json({
    message: 'Something went wrong on our server. Please try again later.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 Error:', {
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl
  });
  
  res.status(404).json({
    message: 'Route not found. Please check the API endpoint.',
    requestedPath: req.path,
    availableRoutes: {
      userRoutes: '/api/user/*',
      authRoutes: '/api/auth/*',
      adminRoutes: '/api/admin/*',
      healthCheck: '/health'
    },
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Test: http://localhost:${PORT}/api/test-pin-route`);
  console.log(`CORS configured for: ${process.env.FRONTEND_URL || 'localhost:3000'}`);
});