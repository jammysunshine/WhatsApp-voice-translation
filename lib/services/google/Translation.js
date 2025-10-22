const { Translate } = require('@google-cloud/translate').v2;
const config = require('../../../lib/config');
const ErrorHandler = require('../../../utils/errorHandler');
const monitoringService = require('../../../utils/monitoring');
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
  defaultMeta: { service: 'google-translation' },
  transports: [
    new transports.File({
      filename: 'logs/translation.log'
    })
  ]
});

class GoogleTranslation {
  constructor() {
    // Initialize the Google Cloud Translation client
    try {
      // Check if credentials are provided as environment variable
      if (config.google.credentials) {
        this.translate = new Translate({
          projectId: config.google.projectId,
          credentials: config.google.credentials
        });
        console.log('Google Translation client initialized with provided credentials');
      } else if (config.google.credentialsPath) {
        // Use credentials file path if provided
        process.env.GOOGLE_APPLICATION_CREDENTIALS = config.google.credentialsPath;
        this.translate = new Translate({
          projectId: config.google.projectId
        });
        console.log('Google Translation client initialized with credentials file path');
      } else {
        // Default initialization (expects credentials to be configured through other means)
        this.translate = new Translate({
          projectId: config.google.projectId
        });
        logger.info('Google Translation client initialized with default configuration');
      }
    } catch (error) {
      logger.error('Failed to initialize Google Translation client:', { error: error.message });
      throw error;
    }
  }

  /**
   * Translate text to a specific language
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code (e.g. 'en', 'es', 'fr')
   * @param {string} sourceLanguage - Source language code (optional, auto-detect if not provided)
   * @returns {Promise<string>} - Translated text
   */
  async translateText(text, targetLanguage, sourceLanguage = null) {
    monitoringService.startTimer('google_translation_api_call', { 
      targetLanguage, 
      sourceLanguage 
    });
    
    try {
      // Validate inputs
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text to translate is required and must be a non-empty string');
      }
      
      if (!targetLanguage || typeof targetLanguage !== 'string') {
        throw new Error('Target language is required and must be a string');
      }

      const options = {
        to: targetLanguage,
      };

      if (sourceLanguage) {
        options.from = sourceLanguage;
      }

      const [translation] = await this.translate.translate(text, options);

      logger.info('Text translated successfully', {
        targetLanguage,
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        translatedText: translation.substring(0, 50) + (translation.length > 50 ? '...' : '')
      });

      // Validate the result
      const validationResult = ErrorHandler.validateResponse(translation, 'string');
      if (!validationResult.isValid) {
        logger.error('Validation failed for translation result', {
          error: validationResult.error,
          result: translation
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      // Record successful API call
      monitoringService.recordMetric('google_translation_api_success', 1, { 
        targetLanguage, 
        sourceLanguage 
      });
      monitoringService.endTimer('google_translation_api_call', { 
        targetLanguage, 
        sourceLanguage, 
        success: true 
      });

      return translation;
    } catch (error) {
      logger.error('Error during text translation', {
        targetLanguage,
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        error: error.message,
        stack: error.stack
      });
      
      // Record error in monitoring
      monitoringService.recordError('google_translation', 'translateText', error.constructor.name);
      monitoringService.endTimer('google_translation_api_call', { 
        targetLanguage, 
        sourceLanguage, 
        success: false 
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'GoogleTranslation',
        function: 'translateText',
        targetLanguage,
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });
      
      throw new Error(handledError.error);
    }
  }

  /**
   * Translate text to multiple languages
   * @param {string} text - Text to translate
   * @param {Array<string>} targetLanguages - Array of target language codes
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<Object>} - Object with language codes as keys and translations as values
   */
  async translateTextMultiple(text, targetLanguages, sourceLanguage = null) {
    monitoringService.startTimer('google_translation_multiple', { 
      targetLanguageCount: targetLanguages.length,
      sourceLanguage 
    });
    
    try {
      // Validate inputs
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text to translate is required and must be a non-empty string');
      }
      
      if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
        throw new Error('Target languages must be a non-empty array');
      }

      const translations = {};
      
      // Create an array of promises for all translation requests
      const translationPromises = targetLanguages.map(lang => 
        this.translateText(text, lang, sourceLanguage)
          .then(translation => ({ lang, translation }))
          .catch(error => {
            logger.error(`Failed to translate to ${lang}`, {
              error: error.message
            });
            return { lang, translation: `Translation to ${lang} failed: ${error.message}` };
          })
      );
      
      // Execute all translation requests in parallel
      const results = await Promise.all(translationPromises);
      
      // Build the translations object from results
      results.forEach(result => {
        translations[result.lang] = result.translation;
      });

      logger.info('Text translated to multiple languages successfully', {
        targetLanguages,
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });

      // Validate the result
      const validationResult = ErrorHandler.validateResponse(translations, 'object');
      if (!validationResult.isValid) {
        logger.error('Validation failed for multiple translation result', {
          error: validationResult.error,
          result: translations
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      // Record successful multiple translation
      monitoringService.endTimer('google_translation_multiple', { 
        targetLanguageCount: targetLanguages.length,
        sourceLanguage,
        success: true 
      });

      return translations;
    } catch (error) {
      logger.error('Error during multiple text translations', {
        targetLanguages,
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        error: error.message,
        stack: error.stack
      });
      
      // Record error in monitoring
      monitoringService.recordError('google_translation', 'translateTextMultiple', error.constructor.name);
      monitoringService.endTimer('google_translation_multiple', { 
        targetLanguageCount: targetLanguages.length,
        sourceLanguage,
        success: false 
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'GoogleTranslation',
        function: 'translateTextMultiple',
        targetLanguages,
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });
      
      throw new Error(handledError.error);
    }
  }
}

module.exports = GoogleTranslation;