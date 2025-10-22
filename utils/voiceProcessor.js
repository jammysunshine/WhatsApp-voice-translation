const GoogleSpeechToText = require('../lib/services/google/SpeechToText');
const TranslationProcessor = require('./translationProcessor');
const MediaHandler = require('./mediaHandler');
const ErrorHandler = require('./errorHandler');
const config = require('../lib/config');
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
  defaultMeta: { service: 'voice-processor' },
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
      filename: 'logs/voice-processor.log'
    })
  ]
});

class VoiceProcessor {
  constructor() {
    this.sttService = new GoogleSpeechToText();
    this.translationProcessor = new TranslationProcessor();
    this.mediaHandler = new MediaHandler();
  }

  /**
   * Process a voice note: convert to text and translate
   * @param {Buffer} audioBuffer - Audio data as buffer
   * @param {string} mimeType - MIME type of the audio
   * @returns {Promise<Object>} - Object with original text and translations
   */
  async processVoiceNote(audioBuffer, mimeType) {
    let processedFilePath = null;
    
    try {
      logger.info('Starting voice note processing', {
        mimeType,
        size: audioBuffer ? audioBuffer.length : 'undefined'
      });

      // Check if the audio file size exceeds the limit
      if (audioBuffer && audioBuffer.length > config.audio.maxFileSize) {
        throw new Error(`Audio file too large: ${audioBuffer.length} bytes. Maximum allowed: ${config.audio.maxFileSize} bytes`);
      }

      logger.info('Processing audio buffer with MediaHandler', { mimeType });
      // Process the audio buffer (save)
      processedFilePath = await this.mediaHandler.processAudioBuffer(audioBuffer, mimeType);
      logger.info('Audio buffer processed successfully', { processedFilePath });
      
      logger.info('Starting transcription with Google STT service');
      // Get the transcription from the processed audio file
      const transcribedText = await this.sttService.transcribeAudioFile(processedFilePath);
      logger.info('Audio transcribed successfully', {
        transcribedTextLength: transcribedText ? transcribedText.length : 0
      });
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('Unable to transcribe audio: No text detected');
      }
      
      logger.info('Starting translation processing');
      // Process the transcription through translation
      const result = await this.translationProcessor.processTranslation(transcribedText);
      logger.info('Translation processing completed', {
        originalTextLength: transcribedText.length,
        translationCount: Object.keys(result.translations).length
      });
      
      logger.info('Voice note processed successfully', {
        originalText: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : ''),
        languages: Object.keys(result.translations)
      });

      // Validate the result before returning
      const validationResult = ErrorHandler.validateResponse(result, 'object');
      if (!validationResult.isValid) {
        logger.error('Validation failed for voice processing result', {
          error: validationResult.error,
          result: result
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }

      return result;
    } catch (error) {
      logger.error('Error processing voice note', {
        mimeType,
        size: audioBuffer ? audioBuffer.length : 'undefined',
        error: error.message,
        stack: error.stack
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'VoiceProcessor',
        function: 'processVoiceNote',
        mimeType,
        size: audioBuffer ? audioBuffer.length : 'undefined'
      });
      
      throw error; // Re-throw the original error to maintain error flow
    } finally {
      // Clean up temporary files if they were created
      if (processedFilePath) {
        try {
          logger.info('Cleaning up temporary audio file', { processedFilePath });
          await this.mediaHandler.cleanupTempFile(processedFilePath);
          logger.info('Temporary file cleaned up successfully', { processedFilePath });
        } catch (cleanupError) {
          logger.error('Error cleaning up temporary file', {
            processedFilePath,
            error: cleanupError.message,
            stack: cleanupError.stack
          });
          // Don't throw here as it's not critical for the main process
        }
      }
    }
  }
}

module.exports = VoiceProcessor;