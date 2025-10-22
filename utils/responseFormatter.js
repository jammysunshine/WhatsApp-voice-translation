const { createLogger, format, transports } = require('winston');

// Create logger for this module
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
  defaultMeta: { service: 'response-formatter' },
  transports: [
    new transports.File({
      filename: 'logs/response-formatter.log'
    })
  ]
});

class ResponseFormatter {
  /**
   * Format a translated response for WhatsApp
   * @param {Object} translations - Object containing translations in different languages
   * @param {string} originalText - The original transcribed text
   * @returns {string} - Formatted message string for WhatsApp
   */
  static formatTranslatedResponse(translations, originalText = null) {
    try {
      // Create a formatted message with all translations
      let messageBody = '*Translated Message:*\n\n';
      
      if (originalText) {
        messageBody += `*Original:* ${originalText}\n\n`;
      }
      
      // Add each translation to the message
      Object.keys(translations).forEach(lang => {
        const langName = lang.charAt(0).toUpperCase() + lang.slice(1); // Capitalize first letter
        messageBody += `*${langName}:* ${translations[lang]}\n\n`;
      });
      
      // Add a footer
      messageBody += '_Powered by WhatsApp Translation Bot_';
      
      logger.info('Response formatted successfully', {
        originalText: originalText ? originalText.substring(0, 50) + (originalText.length > 50 ? '...' : '') : null,
        languages: Object.keys(translations)
      });

      return messageBody;
    } catch (error) {
      logger.error('Error formatting response', {
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  /**
   * Format a simple text response for WhatsApp
   * @param {string} text - The text to format
   * @returns {string} - Formatted message string for WhatsApp
   */
  static formatSimpleResponse(text) {
    try {
      // For now, just return the text as is
      // In the future, we might want to add more formatting
      const formattedText = text;
      
      logger.info('Simple response formatted successfully', {
        text: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });

      return formattedText;
    } catch (error) {
      logger.error('Error formatting simple response', {
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
}

module.exports = ResponseFormatter;