const speech = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
const config = require('../../../lib/config');
const ErrorHandler = require('../../../utils/errorHandler');
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
  defaultMeta: { service: 'google-speech-to-text' },
  transports: [
    new transports.File({
      filename: 'logs/speech-to-text.log'
    })
  ]
});

class GoogleSpeechToText {
  constructor() {
    // Initialize the Google Cloud Speech client
    try {
      // Check if credentials are provided as environment variable
      if (config.google.credentials) {
        this.client = new speech.SpeechClient({
          projectId: config.google.projectId,
          credentials: config.google.credentials
        });
        console.log('Google Speech-to-Text client initialized with provided credentials');
      } else if (config.google.credentialsPath) {
        // Use credentials file path if provided
        process.env.GOOGLE_APPLICATION_CREDENTIALS = config.google.credentialsPath;
        this.client = new speech.SpeechClient({
          projectId: config.google.projectId
        });
        console.log('Google Speech-to-Text client initialized with credentials file path');
      } else {
        // Default initialization (expects credentials to be configured through other means)
        this.client = new speech.SpeechClient({
          projectId: config.google.projectId
        });
        console.log('Google Speech-to-Text client initialized with default configuration');
      }
    } catch (error) {
      console.error('Failed to initialize Google Speech-to-Text client:', error.message);
      throw error;
    }
  }

  /**
   * Convert audio buffer to text using Google Cloud Speech-to-Text API
   * @param {Buffer} audioBuffer - Audio data as a buffer
   * @param {string} audioMimeType - MIME type of the audio (e.g. 'audio/ogg', 'audio/mp3')
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudio(audioBuffer, audioMimeType = 'audio/ogg') {
    try {
      // Prepare the audio content for the API request
      const audio = {
        content: audioBuffer.toString('base64'),
      };

      // Prepare the recognition configuration based on the audio format
      let encoding;
      switch (audioMimeType) {
        case 'audio/ogg':
        case 'audio/ogg; codecs=opus':
          encoding = 'OGG_OPUS';
          break;
        case 'audio/wav':
          encoding = 'LINEAR16';
          break;
        case 'audio/mp4':
        case 'audio/mpeg':
          encoding = 'MP3';
          break;
        default:
          encoding = 'OGG_OPUS'; // Default encoding for WhatsApp voice notes
          logger.warn('Unknown audio MIME type, using default OGG_OPUS encoding', { audioMimeType });
      }

      // Create a fresh config object to avoid any potential inheritance issues
      const configObj = Object.assign({}, {
        encoding: encoding,
        // For OGG_OPUS, don't specify sample rate as it's included in the file
        // Only specify sample rate for other encodings that might need it
        ...(encoding !== 'OGG_OPUS' && { sampleRateHertz: 16000 }),
        // Explicitly omit languageCode for automatic detection
        // According to Google documentation, omitting languageCode enables automatic detection
        enableAutomaticPunctuation: true, // Enable punctuation for better readability
      });

      const request = {
        audio: audio,
        config: configObj,
      };

      // Deep log the request for debugging to catch any inherited properties
      logger.info('Sending request to Google Speech-to-Text API', {
        configKeys: Object.keys(configObj),
        configValues: JSON.stringify(configObj),
        encoding: encoding,
        audioMimeType: audioMimeType,
        hasAudioContent: !!audio.content
      });

      // Perform the transcription
      const [response] = await this.client.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      logger.info('Audio transcribed successfully', {
        resultCount: response.results ? response.results.length : 0,
        transcription: transcription.substring(0, 100) + (transcription.length > 100 ? '...' : '') // Log first 100 chars
      });

      return transcription;
    } catch (error) {
      logger.error('Error during speech-to-text conversion', {
        error: error.message,
        stack: error.stack
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'GoogleSpeechToText',
        function: 'transcribeAudio',
        audioMimeType
      });
      
      throw new Error(handledError.error);
    }
  }

  /**
   * Convert audio file to text using Google Cloud Speech-to-Text API
   * @param {string} audioFilePath - Path to the audio file
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudioFile(audioFilePath) {
    try {
      logger.info('Starting audio file transcription', { audioFilePath });
      
      // Validate that the file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file does not exist: ${audioFilePath}`);
      }

      // Read the audio file
      const audioBuffer = fs.readFileSync(audioFilePath);

      // Determine the MIME type from the file extension
      const ext = path.extname(audioFilePath).toLowerCase();
      let mimeType = 'audio/ogg'; // Default
      switch (ext) {
        case '.wav':
          mimeType = 'audio/wav';
          break;
        case '.mp3':
          mimeType = 'audio/mpeg';
          break;
        case '.mp4':
          mimeType = 'audio/mp4';
          break;
        case '.ogg':
          mimeType = 'audio/ogg';
          break;
      }

      // Perform transcription
      const result = await this.transcribeAudio(audioBuffer, mimeType);
      
      // Validate the result
      const validationResult = ErrorHandler.validateResponse(result, 'string');
      if (!validationResult.isValid) {
        logger.error('Validation failed for transcription result', {
          error: validationResult.error,
          result: result
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Error during speech-to-text conversion from file', {
        audioFilePath,
        error: error.message,
        stack: error.stack
      });
      
      // Use the centralized error handler
      const handledError = ErrorHandler.handleError(error, {
        module: 'GoogleSpeechToText',
        function: 'transcribeAudioFile',
        audioFilePath
      });
      
      throw new Error(handledError.error);
    }
  }
}

module.exports = GoogleSpeechToText;