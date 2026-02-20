// app.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Import error handling middleware
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Authentication routes
const adminAuthRoutes = require('./routes/adminAuth');
const vendorAuthRoutes = require('./routes/vendorAuth');
const userAuthRoutes = require('./routes/userAuth');

// API routes
const adminApiRoutes = require('./routes/adminApi');
const userApiRoutes = require('./routes/userApi');
const vendorApiRoutes = require('./routes/vendorApi');
const publicApiRoutes = require('./routes/publicApi');

// Note: Legacy routes have been removed to simplify the codebase.

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swaggerDef');

const app = express();

app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ ROLE-BASED AUTHENTICATION ENDPOINTS ============

// Admin Authentication
app.use('/api/admin/auth', adminAuthRoutes);

// Vendor Authentication  
app.use('/api/vendor/auth', vendorAuthRoutes);

// User Authentication
app.use('/api/user/auth', userAuthRoutes);

// ============ ROLE-BASED API ENDPOINTS ============

// Admin API - Complete system management (ADMIN role only)
app.use('/api/admin', adminApiRoutes);

// User API - Customer operations (USER role)
app.use('/api/user', userApiRoutes);

// Vendor API - Hotel owner/vendor operations (VENDOR/OWNER role)
app.use('/api/vendor', vendorApiRoutes);

// Public API - No authentication required
app.use('/api/public', publicApiRoutes);

// Payment webhooks
app.use('/api/payments', require('./routes/payments'));

// swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// basic health (moved to /api/health)
app.get('/api/health', (req, res) => res.json({ 
  message: 'OYO Backend API is running',
  version: '2.0.0',
  status: 'healthy'
}));

// ============ STATIC FILE SERVING ============

// Serve Admin Panel
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.get(/^\/admin\/.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Serve Vendor Panel
app.use('/vendor', express.static(path.join(__dirname, 'public/vendor')));
app.get(/^\/vendor\/.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/vendor/index.html'));
});

// Serve Main Website (Client) - Must be last to catch non-api routes
app.use(express.static(path.join(__dirname, 'public/client')));
app.get(/(.*)/, (req, res) => {
  // Don't intercept API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  const clientIndex = path.join(__dirname, 'public/client/index.html');
  // Check if file exists to avoid ENOENT if client is not built yet
  const fs = require('fs');
  if (fs.existsSync(clientIndex)) {
    res.sendFile(clientIndex);
  } else {
    res.json({ message: 'OYO Backend API is running. Frontend not deployed yet.' });
  }
});

// Handle 404 errors for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
