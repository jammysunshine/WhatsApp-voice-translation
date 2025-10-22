/**
 * WhatsApp Translation Bot - Main Server
 * 
 * This is the main entry point for the WhatsApp translation bot application.
 * The bot receives voice messages, converts them to text using Speech-to-Text services,
 * translates the text to multiple languages, and responds via WhatsApp.
 * 
 * @module server
 */

require('dotenv').config();
const express = require('express');
const { createLogger, format, transports } = require('winston');
const rateLimit = require('express-rate-limit');
const config = require('./lib/config');
const webhookRoutes = require('./routes/webhook');
const ErrorHandler = require('./utils/errorHandler');
const monitoringService = require('./utils/monitoring');

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'whatsapp-translation-bot' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

const app = express();

// Trust proxy settings for cloud deployments
// Trust first proxy which is what Railway uses
app.set('trust proxy', 1);

// Rate limiting - configurable via configuration
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes default
  max: config.rateLimit.maxRequests, // 100 requests per window default
  message: config.rateLimit.message, // Configurable rate limit message
  // Trust first proxy
  trustProxy: 1
});

app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'WhatsApp Translation Bot is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = monitoringService.getHealthStatus();
  res.status(200).json(healthStatus);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = monitoringService.getAllMetrics();
  res.status(200).json({
    metrics,
    timestamp: new Date().toISOString()
  });
});

// Webhook routes
app.use(webhookRoutes);

// Error handling middleware - this should be after all routes
app.use(ErrorHandler.middleware());

// Export app for Railway
module.exports = app;

// Only start server if run directly (not imported by Railway)
if (require.main === module) {
  const PORT = parseInt(process.env.PORT) || 3000;

  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    
    // Start periodic monitoring of memory and CPU usage
    setInterval(() => {
      monitoringService.recordMemoryUsage();
      monitoringService.recordCpuUsage();
    }, 30000); // Record every 30 seconds
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Process terminated');
    });
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Process terminated');
    });
  });
}