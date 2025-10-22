const express = require('express');
const config = require('../lib/config');
const WhatsAppService = require('../lib/services/whatsapp');
const VoiceProcessor = require('../utils/voiceProcessor');
const ErrorHandler = require('../utils/errorHandler');
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

  // Parse the query params
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

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
      res.sendStatus(403);
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
  
  // Check if this is an entry in the body
  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages
    ) {
      // Get the webhook event
      const webhookEvent = body.entry[0].changes[0].value;
      const message = webhookEvent.messages[0];
      
      logger.info('Received message from WhatsApp', {
        from: message.from,
        type: message.type,
        timestamp: message.timestamp
      });
      
      // Process the message
      await handleWhatsAppMessage(message, webhookEvent);
      
      // Return a 200 status to acknowledge the event
      res.sendStatus(200);
    } else {
      // If webhookEvent is not a message, return a 200 status
      res.sendStatus(200);
    }
  } else {
    // If body.object is not present, return a 200 status
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
    
    // Check if the message is a voice note
    if (message.type === 'audio') {
      logger.info('Processing voice note received from WhatsApp', {
        from: message.from,
        messageId: message.id,
        timestamp: message.timestamp
      });
      
      // Get the media ID and MIME type from the message
      const { id: mediaId, mime_type: mimeType } = message.audio;
      logger.info('Media details from WhatsApp message', {
        mediaId,
        mimeType
      });
      
      // Process the voice note
      await processVoiceNote(message.from, mediaId, mimeType);
      
    } else if (message.type === 'text') {
      logger.info('Received text message from WhatsApp', {
        from: message.from,
        text: message.text.body,
        timestamp: message.timestamp
      });
      
      // For text messages, we could implement translation functionality
      // For now, just acknowledge receipt
      await whatsappService.sendMessage(message.from, "Thanks for your message! For voice translations, please send a voice note.");
    } else {
      logger.info('Received unsupported message type', {
        from: message.from,
        type: message.type,
        timestamp: message.timestamp
      });
      
      logger.info(`Received unsupported message type: ${message.type}`);
    }
  } catch (error) {
    logger.error('Error processing WhatsApp message', {
      error: error.message,
      stack: error.stack,
      from: message.from,
      messageId: message.id,
      messageType: message.type
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