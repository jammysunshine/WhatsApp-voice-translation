# WhatsApp Translation Bot - Project Prompt

## Project Goal

Create a Node.js-based WhatsApp Business API integration that functions as an automated translation bot. The bot will receive voice messages (voice notes) from WhatsApp users, convert them to text using Speech-to-Text (STT) services, translate the text to multiple target languages (English, Arabic, Hindi, Spanish), and respond with the translations via WhatsApp.

## Core Features

1. **WhatsApp Webhook Integration**: Receive messages (specifically voice notes) from WhatsApp via webhooks
2. **Voice Note Processing**: Download and process incoming voice notes using STT services
3. **Automatic Language Detection**: Identify the language of the incoming voice note
4. **Multi-Language Translation**: Translate the transcribed text to English, Arabic, Hindi, and Spanish
5. **WhatsApp Response**: Send back the translations formatted appropriately for WhatsApp
6. **Webhook Validation**: Implement proper webhook validation to secure the endpoint
7. **Media Handling**: Efficiently download, process, and clean up media files

## Architectural Decisions

### Backend (Node.js/Express Server)
* **Framework**: Express.js for creating the webhook endpoint
* **Security**: All WhatsApp Business API keys and tokens stored securely in environment variables
* **Service Structure**:
    * `/webhook` (GET/POST) - Handles WhatsApp webhook validation and message processing
    * `/api/translate` (POST) - Processes voice notes and returns translations
* **Configuration**: Implement a configuration module (e.g., `lib/config.js`) to abstract service instantiation and allow for easy switching of providers via environment variables. This module will be imported into all relevant services.
* **WhatsApp Integration**: Use WhatsApp Business API for sending/receiving messages
* **STT Integration**: Integrate with Google Cloud Speech-to-Text API for voice-to-text conversion
* **Translation**: Integrate with Google Cloud Translation API for language translation

### WhatsApp Business API Integration
* **Webhook Setup**: Configure webhooks to receive incoming messages from WhatsApp
* **Message Processing**: Parse different message types (voice notes, text, etc.) and handle them appropriately
* **Media Download**: Download voice note files from WhatsApp's media servers
* **Response Formatting**: Format responses according to WhatsApp's message format specifications

### Cloud Services
* **STT**: Google Cloud Speech-to-Text API for voice-to-text conversion
* **Translation**: Google Cloud Translation API for language translation
* **File Storage**: Temporary file storage for processing downloaded voice notes (with appropriate cleanup)

## Technology Stack

* **Backend**: Node.js, Express.js
* **WhatsApp Integration**: WhatsApp Business API (Cloud API)
* **STT Service**: @google-cloud/speech (Google Cloud Speech-to-Text API)
* **Translation Service**: @google-cloud/translate (Google Cloud Translation API)
* **Media Processing**: ffmpeg-static for audio format conversion if needed
* **Environment Management**: dotenv for environment variable handling
* **Logging**: Winston for structured server logging
* **Deployment Target**: Vercel, Heroku, or similar Node.js hosting platform

## Deliverables

* `server.js` or `app.js` - Main Express.js application with webhook handling
* `lib/config.js` - Central configuration module for provider abstraction
* `lib/services/whatsapp.js` - WhatsApp Business API service abstraction
* `lib/services/google/SpeechToText.js` - Google Cloud Speech-to-Text service implementation
* `lib/services/google/Translation.js` - Google Cloud Translation API implementation
* `routes/webhook.js` - Webhook handling routes
* `utils/mediaHandler.js` - Media file download and processing utilities
* `utils/responseFormatter.js` - WhatsApp-specific response formatting utilities
* `package.json` and `package-lock.json` - With all necessary Node.js dependencies
* `.env.example` - Example file for environment variables
* `.gitignore` - A file specifically configured to track only source code
* `README.md` - Comprehensive documentation with setup and usage instructions

## Constraints & Guidelines

* **Security**: WhatsApp webhook validation must be implemented to verify incoming requests are from WhatsApp
* **Media Handling**: Properly download and cleanup media files to avoid storage issues
* **Environment Variables**: All API keys and sensitive configuration must be stored in environment variables
* **Error Handling**: Implement comprehensive error handling for network issues, API errors, etc.
* **Rate Limiting**: Implement appropriate rate limiting to prevent API abuse and control costs
* **Audio Format Support**: Handle various audio formats that may be sent via WhatsApp
* **Message Size**: Consider WhatsApp's message size limits when sending responses
* **Message Threading**: Ensure responses are sent to the correct conversation thread
* **Privacy Compliance**: Handle user data in compliance with privacy regulations
* **Asynchronous Processing**: Voice note processing should be handled asynchronously to prevent webhook timeout issues

## WhatsApp Business API Specific Requirements

1. **Webhook Verification**: Implement proper GET verification for webhook setup
2. **Message Parsing**: Parse incoming message structure according to WhatsApp Business API format
3. **Media URLs**: Handle media URLs provided by WhatsApp to download voice notes
4. **Response Structure**: Format responses according to WhatsApp message format specifications
5. **Message Acknowledgment**: Properly acknowledge receipt of messages to prevent reprocessing

## Expected User Flow

1. User sends a voice note to the WhatsApp Business API number
2. WhatsApp sends a webhook notification to the `/webhook` endpoint
3. Application downloads the voice note from WhatsApp's media servers
4. Application converts the voice note to text using STT
5. Application translates the text to multiple target languages
6. Application sends back the translated text as a message reply to the user
7. Optional: Application may respond with the original transcription as well

## Error Handling Requirements

* Network errors when downloading media
* STT service errors or timeouts
* Translation API errors or rate limiting
* WhatsApp API errors when sending responses
* Invalid or corrupted media files
* Unsupported audio formats
* Webhook validation failures
* Missing or invalid environment variables

## Performance Considerations

* Audio processing should be performed asynchronously to prevent webhook timeouts
* Implement proper queuing mechanism if processing multiple messages simultaneously
* Cache frequently used API responses where applicable
* Optimize media file storage and cleanup to manage disk space
* Monitor API usage to manage costs