const axios = require('axios');
const config = require('../../lib/config');
const ResponseFormatter = require('../../utils/responseFormatter');
const ErrorHandler = require('../../utils/errorHandler');
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
  defaultMeta: { service: 'whatsapp-service' },
  transports: [
    new transports.File({
      filename: 'logs/whatsapp-service.log'
    })
  ]
});

class WhatsAppService {
  constructor() {
    this.token = config.whatsapp.apiToken;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.apiUrl = config.whatsapp.apiUrl;
    
    // Set up axios instance with default headers
    this.client = axios.create({
      baseURL: `${this.apiUrl}/${this.phoneNumberId}`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Send a text message to a WhatsApp user
   * @param {string} recipientId - The WhatsApp ID of the recipient
   * @param {string} message - The text message to send
   * @returns {Promise<Object>} - Response from WhatsApp API
   */
  async sendMessage(recipientId, message) {
    try {
      // Validate inputs
      if (!recipientId || typeof recipientId !== 'string') {
        throw new Error('Recipient ID is required and must be a string');
      }
      
      if (!message || typeof message !== 'string') {
        throw new Error('Message is required and must be a string');
      }

      const response = await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        to: recipientId,
        type: 'text',
        text: {
          body: message
        }
      });

      logger.info('Message sent successfully', {
        recipientId,
        messageId: response.data.messages?.[0]?.id || 'unknown'
      });

      return response.data;
    } catch (error) {
      logger.error('Error sending message', {
        recipientId,
        error: error.response ? error.response.data : error.message
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'WhatsAppService',
        function: 'sendMessage',
        recipientId
      });
      
      throw new Error(handledError.error);
    }
  }

  /**
   * Send a translated response to a WhatsApp user with multiple language options
   * @param {string} recipientId - The WhatsApp ID of the recipient
   * @param {Object} translations - Object containing translations in different languages
   * @param {string} originalText - The original transcribed text
   * @returns {Promise<Object>} - Response from WhatsApp API
   */
  async sendTranslatedResponse(recipientId, translations, originalText = null) {
    try {
      // Validate inputs
      if (!recipientId || typeof recipientId !== 'string') {
        throw new Error('Recipient ID is required and must be a string');
      }
      
      if (!translations || typeof translations !== 'object') {
        throw new Error('Translations are required and must be an object');
      }

      // Format the response using the response formatter
      const messageBody = ResponseFormatter.formatTranslatedResponse(translations, originalText);

      const response = await this.sendMessage(recipientId, messageBody);

      return response;
    } catch (error) {
      logger.error('Error sending translated response', {
        recipientId,
        error: error.message
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'WhatsAppService',
        function: 'sendTranslatedResponse',
        recipientId
      });
      
      throw new Error(handledError.error);
    }
  }

  /**
   * Get media URL from WhatsApp servers
   * @param {string} mediaId - The ID of the media file
   * @returns {Promise<string>} - URL to download the media
   */
  async getMediaUrl(mediaId) {
    try {
      // Validate input
      if (!mediaId || typeof mediaId !== 'string') {
        throw new Error('Media ID is required and must be a string');
      }

      const response = await this.client.get(`/media/${mediaId}`);
      
      logger.info('Media URL retrieved', {
        mediaId,
        url: response.data.url
      });

      // Validate the response
      const validationResult = ErrorHandler.validateResponse(response.data, 'object');
      if (!validationResult.isValid) {
        logger.error('Validation failed for media URL response', {
          error: validationResult.error,
          response: response.data
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      return response.data.url;
    } catch (error) {
      logger.error('Error retrieving media URL', {
        mediaId,
        error: error.response ? error.response.data : error.message
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'WhatsAppService',
        function: 'getMediaUrl',
        mediaId
      });
      
      throw new Error(handledError.error);
    }
  }

  /**
   * Download media file from WhatsApp servers
   * @param {string} mediaUrl - The URL of the media file
   * @returns {Promise<Buffer>} - Buffer containing the media file
   */
  async downloadMedia(mediaUrl) {
    try {
      // Validate input
      if (!mediaUrl || typeof mediaUrl !== 'string') {
        throw new Error('Media URL is required and must be a string');
      }

      // We need to make a GET request to the media URL with the access token in the header
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        responseType: 'arraybuffer' // Important: receive data as buffer
      });

      logger.info('Media downloaded successfully', {
        mediaUrl,
        size: response.data.length
      });

      // Validate the response
      const validationResult = ErrorHandler.validateResponse(response.data, 'object');
      if (!validationResult.isValid) {
        logger.error('Validation failed for media download response', {
          error: validationResult.error,
          response: response.data
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Error downloading media', {
        mediaUrl,
        error: error.message
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'WhatsAppService',
        function: 'downloadMedia',
        mediaUrl
      });
      
      throw new Error(handledError.error);
    }
  }
}

module.exports = WhatsAppService;