# WhatsApp Translation Bot

A Node.js-based WhatsApp Business API integration that functions as an automated translation bot. The bot receives voice messages (voice notes) from WhatsApp users, converts them to text using Speech-to-Text services, translates the text to multiple target languages (English, Arabic, Hindi, Spanish), and responds with the translations via WhatsApp.

## Features

- WhatsApp Webhook Integration: Receive messages (specifically voice notes) from WhatsApp via webhooks
- Voice Note Processing: Download and process incoming voice notes using STT services
- Automatic Language Detection: Identify the language of the incoming voice note
- Multi-Language Translation: Translate the transcribed text to English, Arabic, Hindi, and Spanish
- WhatsApp Response: Send back the translations formatted appropriately for WhatsApp
- Webhook Validation: Implement proper webhook validation to secure the endpoint
- Media Handling: Efficiently download, process, and clean up media files
- Structured Logging: Implementation of Winston for server-side logging
- Error Handling: Comprehensive error handling throughout the application

## Prerequisites

- Node.js 14.x or higher
- WhatsApp Business Account
- Google Cloud Account with Speech-to-Text and Translation APIs enabled
- FFmpeg installed on the system

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd whatsapp-translation-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Set up the required environment variables in `.env`:
   - `WHATSAPP_API_TOKEN`: Your WhatsApp API token
   - `WHATSAPP_PHONE_NUMBER_ID`: Your WhatsApp phone number ID
   - `WHATSAPP_VERIFY_TOKEN`: Your WhatsApp verify token
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your Google service account file
   - `GOOGLE_CLOUD_PROJECT_ID`: Your Google Cloud project ID
   - `PORT`: Port number for the server (default is 3000)

5. Set up Google Cloud credentials:
   - Create a service account in Google Cloud Console
   - Download the JSON credentials file
   - Update `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` file to point to this file

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. To run in development mode with auto-restart:
   ```bash
   npm run dev
   ```

3. Configure your WhatsApp webhook to point to your server's `/webhook` endpoint.

4. Send a voice note to your WhatsApp Business number to test the translation functionality.

## Architecture

The application consists of the following main components:

- `server.js`: Main Express.js application with webhook handling
- `lib/config.js`: Central configuration module for provider abstraction
- `lib/services/whatsapp.js`: WhatsApp Business API service abstraction
- `lib/services/google/SpeechToText.js`: Google Cloud Speech-to-Text service implementation
- `lib/services/google/Translation.js`: Google Cloud Translation API implementation
- `routes/webhook.js`: Webhook handling routes
- `utils/mediaHandler.js`: Media file download and processing utilities
- `utils/responseFormatter.js`: WhatsApp-specific response formatting utilities
- `utils/voiceProcessor.js`: Main processing module that coordinates STT and translation
- `utils/errorHandler.js`: Centralized error handling utilities

## Environment Variables

- `WHATSAPP_API_TOKEN`: WhatsApp API token
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp phone number ID
- `WHATSAPP_VERIFY_TOKEN`: WhatsApp verify token for webhook validation
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google service account JSON file
- `GOOGLE_CLOUD_PROJECT_ID`: Google Cloud project ID
- `PORT`: Server port (default: 3000)

## API Endpoints

- `GET /webhook`: Handles WhatsApp webhook validation
- `POST /webhook`: Receives and processes WhatsApp messages
- `GET /`: Health check endpoint

## Supported Languages

The bot currently translates to the following languages:
- English
- Arabic
- Hindi
- Spanish

## Error Handling

The application implements comprehensive error handling with Winston for logging. If any errors occur during processing, the application will:

1. Log detailed error information
2. Send an error message to the user via WhatsApp
3. Continue processing other messages

## Logging

The application uses Winston for structured logging. Log files are stored in the `logs/` directory:

- `error.log`: Error-level logs
- `combined.log`: All logs combined
- Service-specific logs in the `logs/` directory

## Security Considerations

- WhatsApp webhook validation ensures requests come from WhatsApp
- All sensitive configuration values are stored in environment variables
- Rate limiting is implemented to prevent API abuse
- Media file size is limited to prevent excessive resource usage

## Limitations

- Only processes voice note messages
- Audio files must be under 16MB
- Requires Google Cloud account with billing enabled
- Requires WhatsApp Business API access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.