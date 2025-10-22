const GoogleTranslation = require('../lib/services/google/Translation');
const config = require('../lib/config');
const ErrorHandler = require('../utils/errorHandler');
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
  defaultMeta: { service: 'translation-processor' },
  transports: [
    new transports.Console({ // Changed to Console to ensure logs appear in Railway
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      )
    }),
    new transports.File({
      filename: 'logs/translation-processor.log'
    })
  ]
});

class TranslationProcessor {
  constructor() {
    this.translationService = new GoogleTranslation();
  }

  /**
   * Translate text to the configured target languages
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code (optional, auto-detect if not provided)
   * @returns {Promise<Object>} - Object with language names as keys and translations as values
   */
  async translateToTargetLanguages(text, sourceLanguage = null) {
    try {
      // Validate inputs
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text to translate is required and must be a non-empty string');
      }
      
      // Get target languages from config
      const targetLanguages = config.supportedLanguages;
      
      // Extract language codes for the API
      const targetLanguageCodes = Object.values(targetLanguages);
      
      // Perform translations
      const translations = await this.translationService.translateTextMultiple(
        text,
        targetLanguageCodes,
        sourceLanguage
      );
      
      // Map the language codes back to readable names
      const namedTranslations = {};
      for (const [langName, langCode] of Object.entries(targetLanguages)) {
        // Google Translate API returns translations using the language code as key
        // So we need to map from language code back to language name
        namedTranslations[langName] = translations[langCode] || translations[langName];
      }
      
      logger.info('Text translated to target languages successfully', {
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        targetLanguages: Object.keys(namedTranslations)
      });

      // Validate the result
      const validationResult = ErrorHandler.validateResponse(namedTranslations, 'object');
      if (!validationResult.isValid) {
        logger.error('Validation failed for named translations result', {
          error: validationResult.error,
          result: namedTranslations
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      return namedTranslations;
    } catch (error) {
      logger.error('Error translating text to target languages', {
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        error: error.message,
        stack: error.stack
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'TranslationProcessor',
        function: 'translateToTargetLanguages',
        sourceText: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });
      
      throw new Error(handledError.error);
    }
  }

  /**
   * Process text through translation pipeline
   * @param {string} transcribedText - Text from speech-to-text conversion
   * @param {string} sourceLanguage - Source language code (optional)
   * @returns {Promise<Object>} - Object with original text and translations
   */
  async processTranslation(transcribedText, sourceLanguage = null) {
    try {
      // Validate inputs
      if (!transcribedText || typeof transcribedText !== 'string' || transcribedText.trim().length === 0) {
        throw new Error('Transcribed text is required and must be a non-empty string');
      }
      
      logger.info('Starting translation process', {
        transcribedText: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : '')
      });
      
      // Perform translations to target languages
      const translations = await this.translateToTargetLanguages(transcribedText, sourceLanguage);
      
      // Return object with original text and all translations
      const result = {
        originalText: transcribedText,
        translations: translations,
        processedAt: new Date().toISOString()
      };
      
      logger.info('Translation process completed successfully', {
        originalText: transcribedText.substring(0, 50) + (transcribedText.length > 50 ? '...' : ''),
        targetLanguages: Object.keys(translations)
      });

      // Validate the result
      const validationResult = ErrorHandler.validateResponse(result, 'object');
      if (!validationResult.isValid) {
        logger.error('Validation failed for translation processing result', {
          error: validationResult.error,
          result: result
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Error in translation processing pipeline', {
        transcribedText: transcribedText.substring(0, 50) + (transcribedText.length > 50 ? '...' : ''),
        error: error.message,
        stack: error.stack
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'TranslationProcessor',
        function: 'processTranslation',
        transcribedText: transcribedText.substring(0, 50) + (transcribedText.length > 50 ? '...' : '')
      });
      
      throw new Error(handledError.error);
    }
  }
}

module.exports = TranslationProcessor;