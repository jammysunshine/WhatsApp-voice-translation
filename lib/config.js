require('dotenv').config();

// Determine the environment
const ENVIRONMENT = process.env.NODE_ENV || 'development';

/**
 * Validate that required environment variables are present
 */
function validateConfig() {
  const requiredVars = [
    'WHATSAPP_API_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_VERIFY_TOKEN',
    'GOOGLE_CLOUD_PROJECT_ID'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  // Also validate that either GOOGLE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS is provided
  if (!process.env.GOOGLE_CREDENTIALS && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Either GOOGLE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS environment variable must be provided for Google services');
    process.exit(1);
  }
}

// Validate configuration at startup
validateConfig();

// Configuration module to handle environment variables and service instantiation
const config = {
  environment: ENVIRONMENT,
  
  // WhatsApp Configuration
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0', // Configurable API version
    apiUrl: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v18.0'}`, // Dynamic API URL
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
    port: process.env.PORT || (ENVIRONMENT === 'production' ? 8080 : 3000),
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
  
  // Processing settings (environment-specific adjustments)
  processing: {
    maxConcurrentJobs: ENVIRONMENT === 'production' ? 
      parseInt(process.env.PROD_MAX_CONCURRENT_JOBS) || 10 : 
      parseInt(process.env.DEV_MAX_CONCURRENT_JOBS) || 5,
    jobTimeout: ENVIRONMENT === 'production' ? 
      parseInt(process.env.PROD_JOB_TIMEOUT) || 60000 : // 60 seconds for prod
      parseInt(process.env.DEV_JOB_TIMEOUT) || 30000,   // 30 seconds for dev
  },
  
  // Rate limiting settings (environment-specific)
  rateLimit: {
    windowMs: ENVIRONMENT === 'production' ? 
      parseInt(process.env.PROD_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000 : // 15 minutes for prod
      parseInt(process.env.DEV_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000,   // 5 minutes for dev
    maxRequests: ENVIRONMENT === 'production' ? 
      parseInt(process.env.PROD_RATE_LIMIT_MAX_REQUESTS) || 1000 :        // 1000 requests for prod
      parseInt(process.env.DEV_RATE_LIMIT_MAX_REQUESTS) || 100,          // 100 requests for dev
    message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP, please try again later.'
  }
};

module.exports = config;