const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database configuration and models
const { testConnection } = require('./config/database');
const models = require('./models');

// Import custom middleware and routes
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import route handlers (create placeholder files for missing routes)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const apartmentRoutes = require('./routes/apartments') || ((req, res) => res.status(501).json({ error: 'Not implemented' }));
const notificationRoutes = require('./routes/notifications');
const approvalRoutes = require('./routes/approvals');
const parkingRoutes = require('./routes/parking');
const auditRoutes = require('./routes/audit') || ((req, res) => res.status(501).json({ error: 'Not implemented' }));
const pstRoutes = require('./routes/pst');

// Import WebSocket server
const WebSocketServer = require('./websocket/webSocketServer');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/apartments', apartmentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/parking', parkingRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/pst', pstRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
if (require.main === module) {
  // Test database connection
  testConnection().then(() => {
    // Sync database (in development only)
    if (process.env.NODE_ENV === 'development') {
      return models.sequelize.sync({ alter: false });
    }
  }).then(() => {
    const server = app.listen(PORT, () => {
      logger.info(`DD Diamond Park API Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        database: 'connected'
      });
    });

    // Initialize WebSocket server
    const webSocketServer = new WebSocketServer(server);

    // Set WebSocket server in notification service
    const notificationService = require('./services/notificationService');
    notificationService.setWebSocketServer(webSocketServer);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        webSocketServer.shutdown();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        webSocketServer.shutdown();
        process.exit(0);
      });
    });
  }).catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;