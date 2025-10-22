require('dotenv').config();

// Configuration module to handle environment variables and service instantiation
const config = {
  // WhatsApp Configuration
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    apiUrl: 'https://graph.facebook.com/v18.0',
  },
  
  // Google Cloud Configuration
  google: {
    credentials: process.env.GOOGLE_CREDENTIALS ? (() => {
      try {
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
      } catch (error) {
        console.error('Error parsing Google credentials:', error.message);
        return null;
      }
    })() : null,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
  },
  
  // Supported languages for translation
  supportedLanguages: {
    english: 'en',
    arabic: 'ar',
    hindi: 'hi',
    spanish: 'es'
  },
  
  // Language codes for automatic language detection
  // Format: ISO 639-1 language code with ISO 3166-1 country code
  autoLanguageDetection: {
    primaryLanguage: 'en-US', // Primary language for STT
    alternativeLanguages: [
      'es-ES', // Spanish
      'hi-IN', // Hindi
      'ar-SA'  // Arabic
    ]
  },
  
  // Audio processing settings
  audio: {
    supportedFormats: ['audio/ogg', 'audio/ogg; codecs=opus', 'audio/wav', 'audio/mp4', 'audio/mpeg'],
    tempDir: './temp',
    maxFileSize: 16000000, // 16MB in bytes, WhatsApp's limit
  },
  
  // Processing settings
  processing: {
    maxConcurrentJobs: 5,
    jobTimeout: 30000, // 30 seconds
  }
};

module.exports = config;