const fs = require('fs');
const path = require('path');
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
  defaultMeta: { service: 'media-handler' },
  transports: [
    new transports.File({
      filename: 'logs/media-handler.log'
    })
  ]
});

class MediaHandler {
  constructor() {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(config.audio.tempDir)) {
      fs.mkdirSync(config.audio.tempDir, { recursive: true });
    }
  }

  /**
   * Save audio buffer to a temporary file
   * @param {Buffer} audioBuffer - Audio data as buffer
   * @param {string} extension - File extension (e.g. 'ogg', 'mp3')
   * @returns {Promise<string>} - Path to the saved temporary file
   */
  async saveAudioBuffer(audioBuffer, extension = 'ogg') {
    try {
      // Create a unique filename using timestamp and random number
      const fileName = `audio_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;
      const filePath = path.join(config.audio.tempDir, fileName);

      // Write the buffer to file
      await fs.promises.writeFile(filePath, audioBuffer);

      logger.info('Audio buffer saved to temporary file', { filePath });

      return filePath;
    } catch (error) {
      logger.error('Error saving audio buffer to file', {
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  /**
   * Clean up temporary files
   * @param {string} filePath - Path to the file to delete
   */
  async cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info('Temporary file cleaned up', { filePath });
      }
    } catch (error) {
      logger.error('Error cleaning up temporary file', {
        filePath,
        error: error.message
      });
      // Don't throw here as it's not critical for the main process
    }
  }

  /**
   * Process audio buffer through the entire pipeline: save and return path
   * Google Cloud Speech-to-Text can handle most audio formats directly
   * @param {Buffer} audioBuffer - Audio data as buffer
   * @param {string} originalMimeType - Original MIME type of the audio
   * @returns {Promise<string>} - Path to the processed audio file ready for STT
   */
  async processAudioBuffer(audioBuffer, originalMimeType) {
    try {
      // Determine the appropriate file extension based on MIME type
      let extension;
      switch (originalMimeType) {
        case 'audio/ogg':
        case 'audio/ogg; codecs=opus':
          extension = 'ogg';
          break;
        case 'audio/wav':
          extension = 'wav';
          break;
        case 'audio/mp4':
          extension = 'mp4';
          break;
        case 'audio/mpeg':
          extension = 'mp3';
          break;
        default:
          extension = 'ogg'; // Default
          logger.warn('Unknown MIME type, using default extension', { originalMimeType });
      }

      // Save the audio buffer to a temporary file
      const tempFilePath = await this.saveAudioBuffer(audioBuffer, extension);

      logger.info('Audio buffer processed successfully', {
        originalMimeType,
        tempFilePath
      });

      return tempFilePath;
    } catch (error) {
      logger.error('Error processing audio buffer', {
        originalMimeType,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }
}

module.exports = MediaHandler;