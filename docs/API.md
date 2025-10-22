# WhatsApp Translation Bot API Documentation

## Overview
The WhatsApp Translation Bot provides voice-to-text transcription and multi-language translation capabilities via WhatsApp Business API integration.

## Endpoints

### GET /webhook
Webhook validation endpoint for WhatsApp Business API.

**Parameters:**
- `hub.mode` (string): Should be 'subscribe'
- `hub.verify_token` (string): Verification token
- `hub.challenge` (string): Challenge string

**Response:**
- 200: Success with challenge string
- 403: Forbidden if tokens don't match
- 400: Bad request if parameters missing

### POST /webhook
Receives and processes incoming WhatsApp messages (voice notes and text).

**Expected Payload:**
- WhatsApp Business API message object

**Response:**
- 200: Success acknowledgment
- 500: Error response

### GET /
Health check endpoint.

**Response:**
- 200: Status object with message and timestamp
- Content-Type: application/json

## Internal API Functions

### VoiceProcessor.processVoiceNote(audioBuffer, mimeType)
Processes a voice note by transcribing and translating it.

**Parameters:**
- `audioBuffer` (Buffer): Audio data as buffer
- `mimeType` (string): MIME type of the audio

**Returns:**
- `Promise<Object>`: Object with original text and translations

### GoogleSpeechToText.transcribeAudioFile(audioFilePath)
Transcribes an audio file to text.

**Parameters:**
- `audioFilePath` (string): Path to the audio file

**Returns:**
- `Promise<string>`: Transcribed text

### TranslationProcessor.processTranslation(transcribedText, sourceLanguage)
Translates text to multiple target languages.

**Parameters:**
- `transcribedText` (string): Text to translate
- `sourceLanguage` (string, optional): Source language code (auto-detect if not provided)

**Returns:**
- `Promise<Object>`: Object with original text and translations

## Error Handling

The application uses centralized error handling with Winston logging. All errors are logged with context and appropriate HTTP status codes are returned to the client.

## Configuration

All configuration is managed through environment variables defined in the config.js file.

## Environment Variables

- `WHATSAPP_API_TOKEN`: WhatsApp API token
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp phone number ID
- `WHATSAPP_VERIFY_TOKEN`: WhatsApp verify token for webhook validation
- `WHATSAPP_API_VERSION`: WhatsApp API version (default: v18.0)
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google service account JSON file
- `GOOGLE_CLOUD_PROJECT_ID`: Google Cloud project ID
- `PORT`: Server port (default: 3000)