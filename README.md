# WhatsApp Translation Bot

A production-grade, enterprise-ready Node.js-based WhatsApp Business API integration that functions as an automated translation bot. The bot receives voice messages (voice notes) from WhatsApp users, converts them to text using Speech-to-Text services, translates the text to multiple target languages (English, Arabic, Hindi, Spanish), and responds with the translations via WhatsApp.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technical Architecture](#technical-architecture)
- [High-Level Design](#high-level-design)
- [Low-Level Design](#low-level-design)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Monitoring & Performance](#monitoring--performance)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Overview

The WhatsApp Translation Bot is a scalable, cloud-native application designed to provide real-time voice-to-text translation services via WhatsApp. Built with a microservices architecture approach, the system processes voice messages through multiple stages: webhook reception, media download, speech-to-text conversion, translation, and response delivery.

### Key Capabilities
- Real-time voice message processing with sub-second response times
- Multi-language support with automatic language detection
- Production-ready monitoring and logging
- Horizontal scalability for high-volume traffic
- Enterprise-grade security and error handling
- Comprehensive API rate limiting and resource management

## Features

- **WhatsApp Webhook Integration**: Secure and validated webhook handling for receiving messages
- **Voice Note Processing**: Advanced audio processing with size and format validation
- **Automatic Language Detection**: Multi-language identification using Google Cloud STT API
- **Multi-Language Translation**: Translation to English, Arabic, Hindi, Spanish with extensibility
- **WhatsApp Response**: Formatted responses optimized for WhatsApp's message structure
- **Media Handling**: Secure download, processing, and cleanup of media files
- **Structured Logging**: Comprehensive Winston-based logging with multiple transports
- **Comprehensive Error Handling**: Graceful error recovery with detailed logging
- **Performance Monitoring**: Built-in metrics collection and health monitoring
- **Resource Management**: Memory usage checks and automatic cleanup of temporary files
- **Environment Configuration**: Environment-specific settings for dev/prod/staging
- **Security Hardening**: Input validation, sanitization, and injection prevention
- **Rate Limiting**: Configurable and environment-specific rate limiting
- **Dependency Security**: Regular security audits and vulnerability management

## Technical Architecture

### System Architecture
```
WhatsApp User -> WhatsApp API -> Webhook -> Express Server -> Processing Pipeline ->
Audio Processing -> Speech-to-Text -> Translation -> Response Formatting -> WhatsApp API -> User
```

### Technology Stack
- **Runtime**: Node.js 18.x+
- **Framework**: Express.js
- **Cloud Services**: Google Cloud (Speech-to-Text, Translation APIs)
- **API Management**: WhatsApp Business API
- **Logging**: Winston with file and console transports
- **Testing**: Jest
- **Package Management**: npm
- **Media Processing**: FFmpeg

### Core Components

#### 1. Webhook Service (`routes/webhook.js`)
- Handles incoming WhatsApp webhook requests
- Implements security validation and sanitization
- Dispatches processing to voice processing service

#### 2. Voice Processing Service (`utils/voiceProcessor.js`)
- Orchestrates the entire voice processing pipeline
- Handles memory and resource management
- Coordinates STT and translation services

#### 3. WhatsApp Service (`lib/services/whatsapp.js`)
- Abstracts WhatsApp Business API interactions
- Handles media URL retrieval and download
- Manages message sending and formatting

#### 4. Google Services (`lib/services/google/`)
- Speech-to-Text service with auto-language detection
- Translation service with multi-language support

#### 5. Utilities (`utils/`)
- Media handling with cleanup mechanisms
- Response formatting for WhatsApp
- Error handling and validation

#### 6. Configuration (`lib/config.js`)
- Environment-specific configuration
- Centralized settings management
- Runtime validation

#### 7. Monitoring (`utils/monitoring.js`)
- Performance metrics collection
- Health check endpoints
- API response time tracking

## High-Level Design

### Processing Flow
1. **Webhook Reception**: WhatsApp sends voice note metadata via webhook
2. **Media Download**: System retrieves actual media file from WhatsApp servers
3. **Audio Processing**: Audio file is processed and validated
4. **Speech-to-Text**: Google Cloud STT converts voice to text
5. **Translation**: Text is translated to multiple target languages
6. **Response Formatting**: Results are formatted for WhatsApp delivery
7. **Reply Delivery**: Translations are sent back to user via WhatsApp API

### Scalability Architecture
- Horizontal scaling through environment-specific configuration
- Asynchronous processing to handle concurrent requests
- Resource management to prevent memory leaks
- Configurable job processing limits

### Data Flow
- Incoming: WhatsApp webhook → Validation → Processing pipeline
- Processing: Audio → STT → Translation → Formatting
- Outgoing: WhatsApp API response to user

## Low-Level Design

### Class Structure

#### WhatsAppService
```javascript
class WhatsAppService {
  constructor() // Initializes API clients
  sendMessage() // Sends text messages to users
  sendTranslatedResponse() // Formats and sends translations
  getMediaUrl() // Retrieves media URLs from WhatsApp
  downloadMedia() // Downloads media files
}
```

#### VoiceProcessor
```javascript
class VoiceProcessor {
  constructor() // Initializes processing services
  hasSufficientMemory() // Checks available memory
  processVoiceNote() // Main processing pipeline
}
```

#### GoogleSpeechToText
```javascript
class GoogleSpeechToText {
  constructor() // Initializes Google API client
  transcribeAudio() // Processes audio buffer
  transcribeAudioFile() // Processes audio file
}
```

#### GoogleTranslation
```javascript
class GoogleTranslation {
  constructor() // Initializes Google API client
  translateText() // Translates text to single language
  translateTextMultiple() // Translates text to multiple languages
}
```

#### TranslationProcessor
```javascript
class TranslationProcessor {
  translateToTargetLanguages() // Main translation method
  extractBaseLanguageCode() // Language code processing
  processTranslation() // Translation pipeline
}
```

### Error Handling Architecture
- Centralized ErrorHandler utility
- Validation-based error responses
- Graceful degradation for API failures
- Comprehensive logging for troubleshooting

### Security Implementation
- Input sanitization for all user data
- Parameter validation and type checking
- Rate limiting to prevent abuse
- Memory usage checks to prevent DoS

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows 10/11
- **Node.js**: Version 18.x or higher
- **Memory**: Minimum 1GB RAM (recommended 2GB+ for production)
- **Storage**: Minimum 500MB free space for temporary files
- **Network**: Stable internet connection for API calls

### External Dependencies
- **WhatsApp Business Account**: Valid account with API access
- **Google Cloud Account**: With billing enabled and required APIs activated
  - Cloud Speech-to-Text API
  - Cloud Translation API
- **FFmpeg**: For audio processing (install on system)

### API Requirements
- WhatsApp Business API access (not available to all users)
- Valid domain for webhook configuration
- SSL certificate for webhook endpoint

## Installation

### Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd whatsapp-translation-bot

# Install dependencies
npm install

# Install FFmpeg (if not already installed)
# On macOS: brew install ffmpeg
# On Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg
# On Windows: Download from https://ffmpeg.org/download.html
```

### Environment Configuration
```bash
# Create environment file from example
cp .env.example .env

# Edit environment variables
nano .env
```

### Environment Variables Required
```
# WhatsApp Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_API_VERSION=v18.0

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account.json
# OR
GOOGLE_CREDENTIALS='{"type": "service_account", ...}' # JSON as string

# Server Configuration
PORT=3000
NODE_ENV=development # or production

# Rate Limiting (Development)
DEV_RATE_LIMIT_WINDOW_MS=300000 # 5 minutes
DEV_RATE_LIMIT_MAX_REQUESTS=100

# Rate Limiting (Production)
PROD_RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
PROD_RATE_LIMIT_MAX_REQUESTS=1000

# Processing Configuration
DEV_MAX_CONCURRENT_JOBS=5
PROD_MAX_CONCURRENT_JOBS=10
DEV_JOB_TIMEOUT=30000
PROD_JOB_TIMEOUT=60000
```

### Google Cloud Setup
1. Create a Google Cloud project
2. Enable the Speech-to-Text and Translation APIs
3. Create a service account with required permissions
4. Download the JSON key file
5. Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path, or 
6. Set `GOOGLE_CREDENTIALS` with the JSON content as a string

## Configuration

### Environment-Specific Settings

#### Development Environment
```javascript
// NODE_ENV=development
{
  server: { port: 3000 },
  processing: { maxConcurrentJobs: 5, jobTimeout: 30000 },
  rateLimit: { windowMs: 300000, maxRequests: 100 }
}
```

#### Production Environment
```javascript
// NODE_ENV=production
{
  server: { port: 8080 },
  processing: { maxConcurrentJobs: 10, jobTimeout: 60000 },
  rateLimit: { windowMs: 900000, maxRequests: 1000 }
}
```

### Supported Languages
- **Primary**: English (en-US)
- **Alternative**: Spanish (es-ES), Hindi (hi-IN), Arabic (ar-SA)
- **Target Translation**: English, Arabic, Hindi, Spanish

### Audio Processing Configuration
- **Supported Formats**: audio/ogg, audio/ogg; codecs=opus, audio/wav, audio/mp4, audio/mpeg
- **Max File Size**: 16MB (WhatsApp limit)
- **Temp Directory**: ./temp

## Usage

### Development
```bash
# Start development server with auto-restart
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Production
```bash
# Start production server
npm start

# Or with PM2 for process management
pm2 start server.js --name whatsapp-translation-bot
```

### API Endpoints

#### Webhook Endpoints
```
GET  /webhook  # Webhook validation
POST /webhook  # Message processing
```

#### Monitoring Endpoints
```
GET  /                    # Health check
GET  /health             # Application health status
GET  /metrics            # Performance metrics
```

## API Endpoints

### Webhook Validation
```
GET /webhook
```
- **Purpose**: Validates webhook requests from WhatsApp
- **Parameters**: hub.mode, hub.verify_token, hub.challenge
- **Response**: challenge token if valid, 403/400 if invalid

### Message Processing
```
POST /webhook
```
- **Purpose**: Processes incoming WhatsApp messages
- **Content-Type**: application/json
- **Response**: 200 OK once processed

### Health Check
```
GET /
```
- **Purpose**: Basic health check
- **Response**: JSON with status and timestamp

### Health Status
```
GET /health
```
- **Purpose**: Detailed application health status
- **Response**: JSON with memory, system, and uptime details

### Performance Metrics
```
GET /metrics
```
- **Purpose**: Application performance metrics
- **Response**: JSON with collected metrics

## Monitoring & Performance

### Built-in Monitoring
The application includes a comprehensive monitoring system with:

- **API Response Times**: Track API endpoint performance
- **Processing Durations**: Monitor voice processing pipeline times
- **Memory Usage**: Monitor memory consumption
- **CPU Usage**: Track CPU utilization
- **Error Tracking**: Count and categorize errors
- **Health Checks**: Monitor application status

### Metrics Collection
- **Timers**: Processing duration tracking
- **Counters**: Request counts, error counts
- **Gauges**: Current memory and resource usage

### Health Check Endpoints
- `/health`: Overall system health
- `/metrics`: Detailed performance metrics

### Log Management
- **File-based**: Logs stored in `logs/` directory
- **Rotation**: Automatic log file management
- **Levels**: Error, Warning, Info, Debug

## Security

### Input Validation
- All webhook inputs are validated and sanitized
- Media IDs are checked for valid format
- Text content is limited to prevent abuse

### Authentication
- WhatsApp webhook verification using verify token
- Bearer token authentication for API calls
- Credentials stored in environment variables

### Rate Limiting
- Configurable rate limiting with different settings per environment
- IP-based request limiting
- Protection against API abuse

### Data Protection
- Temporary files are securely cleaned up
- Sensitive information is not logged
- Environment variables for all secrets

### API Security
- Proper Content-Type headers
- Input sanitization on all parameters
- Error messages don't expose system information

## Testing

### Unit Tests
- Test coverage for core functionality
- Mock Google API responses for testing
- Validate configuration loading
- Test error handling paths

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage Areas
- Monitoring service functionality
- Configuration validation
- Validation utilities
- Error handling mechanisms

## Deployment

### Platform Deployment

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login and deploy
heroku login
git push heroku main
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN apk add --no-cache ffmpeg

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```
NODE_ENV=production
PORT=8080
WHATSAPP_API_VERSION=v18.0
PROD_RATE_LIMIT_WINDOW_MS=900000
PROD_RATE_LIMIT_MAX_REQUESTS=1000
PROD_MAX_CONCURRENT_JOBS=10
PROD_JOB_TIMEOUT=60000
```

## Troubleshooting

### Common Issues

#### Media URL Retrieval Error
**Problem**: "Unknown path components" error
**Solution**: Ensure correct API endpoint format without phone number ID for media operations

#### Memory Issues
**Problem**: Application running out of memory with large files
**Solution**: The system now includes memory checks before processing large files

#### API Rate Limits
**Problem**: Exceeding Google API quotas
**Solution**: Configure appropriate rate limiting and monitor API usage

#### Webhook Validation Failure
**Problem**: "Forbidden: Invalid verification token"
**Solution**: Verify WHATSAPP_VERIFY_TOKEN matches the one configured in WhatsApp Business Manager

### Log Files
- `logs/error.log`: Error-level logs
- `logs/combined.log`: All application logs
- `logs/whatsapp-service.log`: WhatsApp-specific logs
- `logs/speech-to-text.log`: STT-specific logs
- `logs/translation.log`: Translation-specific logs
- `logs/voice-processor.log`: Voice processing logs
- `logs/validation.log`: Validation logs

### Debugging Steps
1. Check application logs in `logs/` directory
2. Verify all environment variables are properly set
3. Confirm Google Cloud credentials are valid
4. Test WhatsApp webhook configuration in WhatsApp Business Manager
5. Validate media file formats and sizes

### Performance Monitoring
- Monitor API response times via `/metrics`
- Check memory usage metrics
- Review processing duration metrics
- Track error rates over time

## FAQ

### General Questions

**Q: How many languages does the bot support?**
A: The bot currently supports translations to English, Arabic, Hindi, and Spanish. The system is designed to be extensible for additional languages.

**Q: What audio formats are supported?**
A: The application supports audio/ogg, audio/ogg; codecs=opus, audio/wav, audio/mp4, and audio/mpeg formats.

**Q: What is the maximum file size for voice notes?**
A: The maximum file size is 16MB, which is the WhatsApp limit. Files larger than this will be rejected.

### Technical Questions

**Q: How does automatic language detection work?**
A: The system uses Google Cloud Speech-to-Text API's alternative language codes feature to detect the language of incoming voice notes.

**Q: Can I customize the supported languages?**
A: Yes, you can modify the `supportedLanguages` configuration in `lib/config.js` to add or change target translation languages.

**Q: How are temporary files handled?**
A: The system automatically cleans up temporary audio files after processing, with special handling in error cases to ensure cleanup even if processing fails.

**Q: Is there rate limiting?**
A: Yes, the system implements configurable rate limiting using express-rate-limit, with different settings for development and production environments.

### Deployment Questions

**Q: How do I set up the webhook with WhatsApp?**
A: Configure your server URL in WhatsApp Business Manager with the `/webhook` path, and ensure your verify token matches the WHATSAPP_VERIFY_TOKEN environment variable.

**Q: What are the Google Cloud requirements?**
A: You need to enable the Cloud Speech-to-Text and Translation APIs in your Google Cloud project, and set up appropriate authentication credentials.

**Q: How do I handle production scaling?**
A: The system supports configurable concurrent jobs and processing timeouts. Set NODE_ENV=production for optimized values, and consider horizontal scaling behind a load balancer.

### Security Questions

**Q: How are secrets managed?**
A: All sensitive information is managed through environment variables. Credentials are never hardcoded in the application.

**Q: What happens if the translation service is unavailable?**
A: The system implements graceful degradation with comprehensive error handling. If translation fails, the user receives an appropriate error message instead of the bot crashing.

**Q: How is input validated?**
A: All inputs are validated and sanitized, with checks for valid formats, sizes, and characters to prevent injection and abuse.

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Run the full test suite (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards
- Follow ESLint configuration for code style
- Write comprehensive tests for new features
- Document new functions and classes
- Update README if necessary
- Follow security best practices

### Testing Requirements
- All new functionality must include unit tests
- Changes to existing functionality should not break existing tests
- Performance changes should include before/after metrics
- Security fixes should include regression tests

### Pull Request Guidelines
- Provide a clear description of the change
- Reference any related issues
- Include appropriate test coverage
- Update documentation as needed
- Ensure all tests pass before submitting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository. For security issues, please contact the maintainers directly.