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
  defaultMeta: { service: 'validation' },
  transports: [
    new transports.File({
      filename: 'logs/validation.log'
    })
  ]
});

/**
 * Centralized validation utilities
 */
class Validation {
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

      // Additional type-specific validations
      switch (dataType) {
        case 'object':
          if (typeof data !== 'object' || data === null) {
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
        case 'buffer':
          if (!Buffer.isBuffer(data)) {
            throw new Error(`${dataType} is not a Buffer`);
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

  /**
   * Validate environment variables
   * @param {string[]} requiredVars - Array of required environment variable names
   * @returns {Object} - Validation result
   */
  static validateEnvironment(requiredVars) {
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        isValid: false,
        missingVars
      };
    }

    return {
      isValid: true
    };
  }

  /**
   * Validate audio file size
   * @param {Buffer} audioBuffer - Audio data as buffer
   * @param {number} maxSize - Maximum allowed size in bytes
   * @returns {Object} - Validation result
   */
  static validateAudioSize(audioBuffer, maxSize) {
    try {
      if (!Buffer.isBuffer(audioBuffer)) {
        throw new Error('Audio data is not a Buffer');
      }

      if (audioBuffer.length > maxSize) {
        throw new Error(`Audio file too large: ${audioBuffer.length} bytes. Maximum allowed: ${maxSize} bytes`);
      }

      return {
        isValid: true
      };
    } catch (error) {
      logger.error('Audio size validation failed', {
        error: error.message,
        size: audioBuffer ? audioBuffer.length : 'unknown',
        maxSize
      });

      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate media type
   * @param {string} mimeType - MIME type to validate
   * @param {string[]} allowedTypes - Array of allowed MIME types
   * @returns {Object} - Validation result
   */
  static validateMediaType(mimeType, allowedTypes) {
    try {
      if (!mimeType || typeof mimeType !== 'string') {
        throw new Error(`Invalid media type: ${mimeType}`);
      }

      if (!allowedTypes.includes(mimeType)) {
        throw new Error(`Unsupported media type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      return {
        isValid: true
      };
    } catch (error) {
      logger.error('Media type validation failed', {
        mimeType,
        allowedTypes,
        error: error.message
      });

      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = Validation;