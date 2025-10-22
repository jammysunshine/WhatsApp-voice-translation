const speech = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
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
        logger.info('Google Speech-to-Text client initialized with default configuration');
      }
    } catch (error) {
      logger.error('Failed to initialize Google Speech-to-Text client:', { error: error.message });
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
    monitoringService.startTimer('google_stt_api_call', { mimeType: audioMimeType });
    
    try {
      // Prepare the audio content for the API request
      const audio = {
        content: audioBuffer.toString('base64'),
      };

      // Prepare the recognition configuration based on the audio format
      let encoding;
      let sampleRate;
      switch (audioMimeType) {
        case 'audio/ogg':
        case 'audio/ogg; codecs=opus':
          encoding = 'OGG_OPUS';
          // For OGG_OPUS from WhatsApp, use a standard sample rate that's supported
          sampleRate = 16000; // WhatsApp typically uses 16kHz for voice notes
          break;
        case 'audio/wav':
          encoding = 'LINEAR16';
          sampleRate = 16000; // Standard rate for voice processing
          break;
        case 'audio/mp4':
        case 'audio/mpeg':
          encoding = 'MP3';
          sampleRate = 16000; // Standard rate for voice processing
          break;
        default:
          encoding = 'OGG_OPUS'; // Default encoding for WhatsApp voice notes
          sampleRate = 16000; // Standard rate for voice processing
          logger.warn('Unknown audio MIME type, using default OGG_OPUS encoding', { audioMimeType });
      }

      // Create a fresh config object to avoid any potential inheritance issues
      const configObj = Object.assign({}, {
        encoding: encoding,
        sampleRateHertz: sampleRate, // Specify sample rate for all encodings to prevent errors
        // Use automatic language identification by providing a list of possible languages
        // from the configuration
        languageCode: config.autoLanguageDetection.primaryLanguage,
        alternativeLanguageCodes: config.autoLanguageDetection.alternativeLanguages,
        enableAutomaticPunctuation: true, // Enable punctuation for better readability
        enableAutomaticLanguageDetection: true, // Enable automatic language detection
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
      
      // Extract transcription and detected language
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      
      // Extract the detected language from the first result (if available)
      const detectedLanguage = response.results && response.results[0] && response.results[0].languageCode 
        ? response.results[0].languageCode 
        : config.autoLanguageDetection.primaryLanguage;

      logger.info('Audio transcribed successfully', {
        resultCount: response.results ? response.results.length : 0,
        transcription: transcription.substring(0, 100) + (transcription.length > 100 ? '...' : ''), // Log first 100 chars
        detectedLanguage: detectedLanguage
      });

      // Record successful API call metrics
      monitoringService.recordMetric('google_stt_api_success', 1, { mimeType: audioMimeType });
      monitoringService.endTimer('google_stt_api_call', { mimeType: audioMimeType, success: true });

      return {
        text: transcription,
        language: detectedLanguage
      };
    } catch (error) {
      logger.error('Error during speech-to-text conversion', {
        error: error.message,
        stack: error.stack
      });
      
      // Record error in monitoring
      monitoringService.recordError('google_stt', 'transcribeAudio', error.constructor.name);
      monitoringService.endTimer('google_stt_api_call', { mimeType: audioMimeType, success: false });
      
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
    monitoringService.startTimer('transcribe_audio_file', { filePath: audioFilePath });
    
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
      
      // Validate the result - handle both string (old format) and object (new format)
      let transcriptionText;
      if (typeof result === 'string') {
        transcriptionText = result;
      } else if (typeof result === 'object' && result.text) {
        transcriptionText = result.text;
      } else {
        logger.error('Unexpected transcription result format', {
          result: result
        });
        
        throw new Error('Validation failed: Invalid transcription result format');
      }
      
      // Validate that the transcription is a string
      const validationResult = ErrorHandler.validateResponse(transcriptionText, 'string');
      if (!validationResult.isValid) {
        logger.error('Validation failed for transcription result', {
          error: validationResult.error,
          result: result
        });
        
        throw new Error(`Validation failed: ${validationResult.error}`);
      }
      
      // Record successful transcription
      monitoringService.endTimer('transcribe_audio_file', { filePath: audioFilePath, success: true });
      
      return typeof result === 'string' ? result : result.text;
    } catch (error) {
      logger.error('Error during speech-to-text conversion from file', {
        audioFilePath,
        error: error.message,
        stack: error.stack
      });
      
      // Record error in monitoring
      monitoringService.recordError('google_stt', 'transcribeAudioFile', error.constructor.name);
      monitoringService.endTimer('transcribe_audio_file', { filePath: audioFilePath, success: false });
      
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