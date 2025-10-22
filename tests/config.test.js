const config = require('../lib/config');

describe('Config', () => {
  test('should have required configuration properties', () => {
    expect(config).toHaveProperty('whatsapp');
    expect(config).toHaveProperty('google');
    expect(config).toHaveProperty('server');
    expect(config).toHaveProperty('supportedLanguages');
    expect(config).toHaveProperty('autoLanguageDetection');
    expect(config).toHaveProperty('audio');
    expect(config).toHaveProperty('processing');
    expect(config).toHaveProperty('rateLimit');
  });

  test('should have correct WhatsApp configuration structure', () => {
    expect(config.whatsapp).toHaveProperty('apiToken');
    expect(config.whatsapp).toHaveProperty('phoneNumberId');
    expect(config.whatsapp).toHaveProperty('verifyToken');
    expect(config.whatsapp).toHaveProperty('apiVersion');
    expect(config.whatsapp).toHaveProperty('apiUrl');
  });

  test('should have correct Google configuration structure', () => {
    expect(config.google).toHaveProperty('projectId');
    expect(config.google).toHaveProperty('credentials');
    // credentialsPath might be null if not set in env
  });

  test('should have correct audio configuration structure', () => {
    expect(config.audio).toHaveProperty('supportedFormats');
    expect(config.audio).toHaveProperty('tempDir');
    expect(config.audio).toHaveProperty('maxFileSize');
    expect(Array.isArray(config.audio.supportedFormats)).toBe(true);
    expect(typeof config.audio.maxFileSize).toBe('number');
  });

  test('should have rate limiting configuration', () => {
    expect(config.rateLimit).toHaveProperty('windowMs');
    expect(config.rateLimit).toHaveProperty('maxRequests');
    expect(config.rateLimit).toHaveProperty('message');
  });
});