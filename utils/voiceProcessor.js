const GoogleSpeechToText = require('../lib/services/google/SpeechToText');
const TranslationProcessor = require('./translationProcessor');
const MediaHandler = require('./mediaHandler');
const ErrorHandler = require('./errorHandler');
const monitoringService = require('./monitoring');
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
   * Check available memory before processing large audio files
   * @returns {boolean} - Whether there is sufficient memory for processing
   */
  hasSufficientMemory() {
    const used = process.memoryUsage();
    const total = require('os').totalmem();
    const free = require('os').freemem();
    const heapUsed = used.heapUsed / 1024 / 1024; // Convert to MB
    const heapTotal = used.heapTotal / 1024 / 1024; // Convert to MB
    const percentUsed = (heapUsed / heapTotal) * 100;

    logger.info('Memory usage check', {
      heapUsed: `${Math.round(heapUsed)}MB`,
      heapTotal: `${Math.round(heapTotal)}MB`,
      percentUsed: `${Math.round(percentUsed)}%`,
      freeSystemMemory: `${Math.round(free / 1024 / 1024)}MB`,
      totalSystemMemory: `${Math.round(total / 1024 / 1024)}MB`
    });

    // Return false if heap usage is over 80% to prevent memory issues
    return percentUsed < 80;
  }

  /**
   * Process a voice note: convert to text and translate
   * @param {Buffer} audioBuffer - Audio data as buffer
   * @param {string} mimeType - MIME type of the audio
   * @returns {Promise<Object>} - Object with original text and translations
   */
  async processVoiceNote(audioBuffer, mimeType) {
    let processedFilePath = null;
    
    // Start monitoring the process
    monitoringService.startTimer('voice_processing');
    monitoringService.recordMetric('voice_processing_attempts', 1, { mimeType });
    
    try {
      logger.info('Starting voice note processing', {
        mimeType,
        size: audioBuffer ? audioBuffer.length : 'undefined'
      });

      // Memory check before processing large files
      if (audioBuffer && audioBuffer.length > config.audio.maxFileSize / 2) { // More than half the max size
        monitoringService.startTimer('memory_check');
        if (!this.hasSufficientMemory()) {
          monitoringService.endTimer('memory_check');
          throw new Error('Insufficient memory available for processing this audio file');
        }
        monitoringService.endTimer('memory_check');
      }

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
      monitoringService.startTimer('stt_processing');
      const transcriptionResult = await this.sttService.transcribeAudioFile(processedFilePath);
      monitoringService.endTimer('stt_processing');
      
      // Handle both old and new return formats
      let transcribedText, detectedLanguage;
      if (typeof transcriptionResult === 'string') {
        // Old format - just the text
        transcribedText = transcriptionResult;
        detectedLanguage = null; // Unknown language
      } else if (typeof transcriptionResult === 'object' && transcriptionResult.text) {
        // New format - object with text and language
        transcribedText = transcriptionResult.text;
        detectedLanguage = transcriptionResult.language;
      } else {
        throw new Error('Unexpected transcription result format');
      }
      
      logger.info('Audio transcribed successfully', {
        transcribedTextLength: transcribedText ? transcribedText.length : 0,
        detectedLanguage: detectedLanguage
      });
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('Unable to transcribe audio: No text detected');
      }
      
      logger.info('Starting translation processing');
      // Process the transcription through translation
      // Pass the detected language if available
      monitoringService.startTimer('translation_processing');
      const result = await this.translationProcessor.processTranslation(transcribedText, detectedLanguage);
      monitoringService.endTimer('translation_processing');
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
      
      // Record the error in monitoring
      monitoringService.recordError('voice_processor', 'processVoiceNote', error.constructor.name);
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'VoiceProcessor',
        function: 'processVoiceNote',
        mimeType,
        size: audioBuffer ? audioBuffer.length : 'undefined'
      });
      
      throw error; // Re-throw the original error to maintain error flow
    } finally {
      // Record processing duration
      monitoringService.endTimer('voice_processing', { mimeType });
      
      // Record memory usage
      monitoringService.recordMemoryUsage();
      
      // Enhanced cleanup in finally block to ensure resources are always freed
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
          // Don't re-throw cleanup errors as they're not critical to the main operation
        }
      } else {
        logger.warn('No processed file path found for cleanup', {
          mimeType,
          size: audioBuffer ? audioBuffer.length : 'undefined'
        });
      }
    }
  }
}

module.exports = VoiceProcessor;