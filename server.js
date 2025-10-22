require('dotenv').config();
const express = require('express');
const { createLogger, format, transports } = require('winston');
const rateLimit = require('express-rate-limit');
const webhookRoutes = require('./routes/webhook');
const ErrorHandler = require('./utils/errorHandler');

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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