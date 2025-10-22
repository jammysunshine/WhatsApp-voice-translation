const express = require('express');
const config = require('../lib/config');
const WhatsAppService = require('../lib/services/whatsapp');
const VoiceProcessor = require('../utils/voiceProcessor');
const ErrorHandler = require('../utils/errorHandler');
const monitoringService = require('../utils/monitoring');
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
  defaultMeta: { service: 'whatsapp-webhook' },
  transports: [
    new transports.File({
      filename: 'logs/webhook.log'
    })
  ]
});

const router = express.Router();
const whatsappService = new WhatsAppService();
const voiceProcessor = new VoiceProcessor();

// Webhook verification endpoint
router.get('/webhook', ErrorHandler.asyncWrapper(async (req, res) => {
  const VERIFY_TOKEN = config.whatsapp.verifyToken;

  // Parse and sanitize the query params
  const mode = req.query['hub.mode'] ? String(req.query['hub.mode']).trim() : null;
  const token = req.query['hub.verify_token'] ? String(req.query['hub.verify_token']).trim() : null;
  const challenge = req.query['hub.challenge'] ? String(req.query['hub.challenge']).trim() : null;

  // Input validation
  if (typeof mode !== 'string' || typeof token !== 'string' || typeof challenge !== 'string') {
    logger.error('Invalid parameters received for webhook verification');
    return res.status(400).send('Invalid parameters');
  }

  // Sanitize inputs to prevent injection attacks
  if (!/^[a-zA-Z]+$/.test(mode) || token.length > 100 || challenge.length > 100) {
    logger.error('Invalid parameter format received for webhook verification', { mode, tokenLength: token.length, challengeLength: challenge.length });
    return res.status(400).send('Invalid parameters');
  }

  // Check if a token and mode is in the query string
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      logger.info('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      logger.error('Forbidden: Verify tokens do not match', { 
        receivedToken: token, 
        expectedToken: VERIFY_TOKEN 
      });
      res.status(403).send('Forbidden: Invalid verification token');
    }
  } else {
    // If no mode or token in query string, respond with 400 Bad Request
    logger.error('Bad Request: Missing mode or token in query string');
    res.status(400).send('Missing mode or token in query string');
  }
}));

// Webhook message receiving endpoint
router.post('/webhook', ErrorHandler.asyncWrapper(async (req, res) => {
  const body = req.body;
  const startTime = Date.now();
  
  // Record the API request
  monitoringService.startTimer('webhook_request');
  
  // Basic validation of webhook payload structure
  if (!body || typeof body !== 'object') {
    logger.error('Invalid webhook payload: body is not an object');
    // Record the error
    monitoringService.recordError('webhook', 'validation', 'invalid_payload');
    return res.status(400).send('Invalid payload');
  }
  
  // Check if this is an entry in the body
  if (body.object) {
    if (
      body.entry && 
      Array.isArray(body.entry) && 
      body.entry.length > 0 &&
      body.entry[0].changes &&
      Array.isArray(body.entry[0].changes) &&
      body.entry[0].changes.length > 0 &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value &&
      body.entry[0].changes[0].value.messages &&
      Array.isArray(body.entry[0].changes[0].value.messages) &&
      body.entry[0].changes[0].value.messages.length > 0
    ) {
      // Get the webhook event
      const webhookEvent = body.entry[0].changes[0].value;
      const message = webhookEvent.messages[0];
      
      // Validate message structure
      if (!message || typeof message !== 'object' || !message.from || !message.type) {
        logger.error('Invalid message structure in webhook payload', { message });
        // Record the error
        monitoringService.recordError('webhook', 'validation', 'invalid_message_structure');
        return res.status(400).send('Invalid message structure');
      }
      
      // Sanitize input values
      const sanitizedFrom = String(message.from).trim();
      const sanitizedType = String(message.type).trim();
      
      // Validate allowed message types
      if (!['text', 'audio', 'image', 'video', 'document', 'location'].includes(sanitizedType)) {
        logger.warn('Unsupported message type received', { type: sanitizedType });
        // Record the unsupported message type
        monitoringService.recordMetric('unsupported_message_type_count', 1, { type: sanitizedType });
        return res.status(200).send('Message type not supported');
      }
      
      logger.info('Received message from WhatsApp', {
        from: sanitizedFrom,
        type: sanitizedType,
        timestamp: message.timestamp
      });
      
      // Process the message
      await handleWhatsAppMessage(message, webhookEvent);
      
      // Record the response time
      const responseTime = Date.now() - startTime;
      monitoringService.recordApiResponseTime('/webhook', responseTime, 200);
      monitoringService.endTimer('webhook_request');
      
      // Return a 200 status to acknowledge the event
      res.sendStatus(200);
    } else {
      // If webhookEvent is not a message, return a 200 status
      const responseTime = Date.now() - startTime;
      monitoringService.recordApiResponseTime('/webhook', responseTime, 200);
      monitoringService.endTimer('webhook_request');
      res.sendStatus(200);
    }
  } else {
    // If body.object is not present, return a 200 status
    const responseTime = Date.now() - startTime;
    monitoringService.recordApiResponseTime('/webhook', responseTime, 200);
    monitoringService.endTimer('webhook_request');
    res.sendStatus(200);
  }
}));

// Function to handle incoming WhatsApp messages
async function handleWhatsAppMessage(message, webhookEvent) {
  try {
    logger.info('Processing message', {
      from: message.from,
      type: message.type,
      timestamp: message.timestamp
    });
    
    // Sanitize and validate input
    const recipientId = String(message.from).trim();
    const messageType = String(message.type).trim();
    
    // Input sanitization and validation
    if (!recipientId || recipientId.length > 50) {
      throw new Error(`Invalid recipient ID: ${recipientId}`);
    }
    
    // Check if the message is a voice note
    if (messageType === 'audio') {
      logger.info('Processing voice note received from WhatsApp', {
        from: recipientId,
        messageId: message.id,
        timestamp: message.timestamp
      });
      
      // Validate audio object structure
      if (!message.audio || typeof message.audio !== 'object') {
        logger.error('Invalid audio message structure', { audio: message.audio });
        throw new Error('Invalid audio message structure');
      }
      
      // Get the media ID and MIME type from the message
      // Log the full audio object to understand its structure
      logger.info('Full audio object from message', { audioObject: message.audio });
      
      const mediaId = message.audio.id || message.audio.media_id;
      const mimeType = message.audio.mime_type || message.audio.mimetype || 'audio/ogg';
      
      // Sanitize and validate mediaId
      const sanitizedMediaId = mediaId ? String(mediaId).trim() : null;
      const sanitizedMimeType = mimeType ? String(mimeType).trim() : 'audio/ogg';
      
      logger.info('Media details extracted', {
        mediaId: sanitizedMediaId,
        mimeType: sanitizedMimeType
      });
      
      // Validate that we have a media ID
      if (!sanitizedMediaId || sanitizedMediaId.length === 0) {
        logger.error('No media ID found in audio message', { audio: message.audio });
        throw new Error('No media ID found in audio message');
      }
      
      // Validate media ID format (should be alphanumeric)
      if (!/^[a-zA-Z0-9_]+$/.test(sanitizedMediaId)) {
        logger.error('Invalid media ID format', { mediaId: sanitizedMediaId });
        throw new Error('Invalid media ID format');
      }
      
      // Process the voice note
      await processVoiceNote(recipientId, sanitizedMediaId, sanitizedMimeType);
      
    } else if (messageType === 'text') {
      logger.info('Received text message from WhatsApp', {
        from: recipientId,
        text: message.text?.body,
        timestamp: message.timestamp
      });
      
      // Sanitize text if present
      const textBody = message.text?.body ? String(message.text.body).trim() : '';
      if (textBody.length > 4096) { // WhatsApp message length limit
        logger.warn('Text message exceeds length limit', { length: textBody.length });
        await whatsappService.sendMessage(recipientId, "Message is too long to process.");
        return;
      }
      
      // For text messages, we could implement translation functionality
      // For now, just acknowledge receipt
      await whatsappService.sendMessage(recipientId, "Thanks for your message! For voice translations, please send a voice note.");
    } else {
      logger.info('Received unsupported message type', {
        from: recipientId,
        type: messageType,
        timestamp: message.timestamp
      });
      
      logger.info(`Received unsupported message type: ${messageType}`);
    }
  } catch (error) {
    logger.error('Error processing WhatsApp message', {
      error: error.message,
      stack: error.stack,
      from: message?.from,
      messageId: message?.id,
      messageType: message?.type
    });
    
    // Rethrow the error so it can be caught by the global error handler
    throw error;
  }
}

// Function to process a voice note
async function processVoiceNote(recipientId, mediaId, mimeType = 'audio/ogg') {
  try {
    logger.info('Starting voice note processing workflow', {
      recipientId,
      mediaId,
      mimeType
    });
    
    // Send a quick acknowledgment to the user
    await whatsappService.sendMessage(recipientId, "Received your voice note! Processing and translating now...");
    
    logger.info('Fetching media URL from WhatsApp', { mediaId });
    // Get the media URL from WhatsApp
    const mediaUrl = await whatsappService.getMediaUrl(mediaId);
    
    logger.info('Downloading media file from WhatsApp', { mediaUrl });
    // Download the media file
    const audioBuffer = await whatsappService.downloadMedia(mediaUrl);
    logger.info('Media file downloaded successfully', {
      size: audioBuffer ? audioBuffer.length : 'undefined',
      type: audioBuffer ? typeof audioBuffer : 'undefined'
    });
    
    logger.info('Processing voice note with VoiceProcessor', { mimeType });
    // Process the voice note (transcribe and translate)
    const result = await voiceProcessor.processVoiceNote(audioBuffer, mimeType);
    logger.info('Voice processing completed successfully', {
      originalTextLength: result.originalText ? result.originalText.length : 0,
      translationCount: result.translations ? Object.keys(result.translations).length : 0
    });
    
    logger.info('Sending translated response back to user');
    // Send the translated response back to the user
    await whatsappService.sendTranslatedResponse(recipientId, result.translations, result.originalText);
    
    logger.info('Voice note processing completed successfully', {
      recipientId,
      mediaId
    });
  } catch (error) {
    logger.error('Error in voice note processing workflow', {
      recipientId,
      mediaId,
      mimeType,
      error: error.message,
      stack: error.stack
    });
    
    // Send an error message to the user
    try {
      await whatsappService.sendMessage(recipientId, "Sorry, there was an error processing your voice note. Please try again.");
    } catch (sendError) {
      logger.error('Error sending error message to user', {
        recipientId,
        error: sendError.message,
        stack: sendError.stack
      });
    }
    
    // Rethrow the error so it can be caught by the global error handler
    throw error;
  }
}

module.exports = router;