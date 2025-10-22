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
  /**
   * Handle application errors
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context about where the error occurred
   */
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

  /**
   * Create an error handling middleware for Express
   * @returns {Function} - Express error handling middleware
   */
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

  /**
   * Wrap async route handlers to catch errors
   * @param {Function} fn - Async route handler function
   * @returns {Function} - Wrapped function with error handling
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Validate API responses
   * @param {*} data - The data to validate
   * @param {string} dataType - Type of data being validated
   * @returns {Object} - Validation result
   */
  static validateResponse(data, dataType) {
    try {
      // Basic validation checks
      if (data === undefined || data === null) {
        throw new Error(`${dataType} is undefined or null`);
      }

      // Additional type-specific validations can be added here
      switch (dataType) {
        case 'object':
          if (typeof data !== 'object') {
            throw new Error(`${dataType} is not an object`);
          }
          break;
        case 'array':
          if (!Array.isArray(data)) {
            throw new Error(`${dataType} is not an array`);
          }
          break;
        case 'string':
          if (typeof data !== 'string') {
            throw new Error(`${dataType} is not a string`);
          }
          break;
        case 'number':
          if (typeof data !== 'number' || isNaN(data)) {
            throw new Error(`${dataType} is not a valid number`);
          }
          break;
        // Add more types as needed
      }

      return {
        isValid: true,
        data: data
      };
    } catch (error) {
      logger.error('Response validation failed', {
        dataType,
        error: error.message
      });

      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = ErrorHandler;