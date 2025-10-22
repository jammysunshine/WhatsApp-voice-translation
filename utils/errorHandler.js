const { createLogger, format, transports } = require('winston');

// Create logger for this module
const logger = createLogger({
  level: 'error',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'error-handler' },
  transports: [
    new transports.File({
      filename: 'logs/error.log'
    })
  ]
});

class ErrorHandler {
  /**\n   * Handle application errors\n   * @param {Error} error - The error to handle\n   * @param {Object} context - Additional context about where the error occurred\n   */
  static handleError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      ...context
    };

    logger.error('Application error occurred', errorInfo);

    // Return a user-friendly error object
    return {
      success: false,
      error: error.message || 'An unknown error occurred',
      timestamp: new Date().toISOString()
    };
  }

  /**\n   * Create an error handling middleware for Express\n   * @returns {Function} - Express error handling middleware\n   */
  static middleware() {
    return (error, req, res, next) => {
      // Log the error
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      logger.error('Unhandled error in Express app', errorInfo);

      // Send error response
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });

      next();
    };
  }

  /**\n   * Wrap async route handlers to catch errors\n   * @param {Function} fn - Async route handler function\n   * @returns {Function} - Wrapped function with error handling\n   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**\n   * Validate API responses using centralized validation utility\n   * @param {*} data - The data to validate\n   * @param {string} dataType - Type of data being validated\n   * @returns {Object} - Validation result\n   */
  static validateResponse(data, dataType) {
    // Delegate to centralized validation utility
    const Validation = require('./validation');
    return Validation.validateResponse(data, dataType);
  }
}

module.exports = ErrorHandler;