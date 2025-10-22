const Validation = require('../utils/validation');

describe('Validation', () => {
  test('should validate string correctly', () => {
    const result = Validation.validateResponse('test string', 'string');
    expect(result.isValid).toBe(true);
    expect(result.data).toBe('test string');
  });

  test('should reject non-string when expecting string', () => {
    const result = Validation.validateResponse(123, 'string');
    expect(result.isValid).toBe(false);
  });

  test('should validate object correctly', () => {
    const testObj = { key: 'value' };
    const result = Validation.validateResponse(testObj, 'object');
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual(testObj);
  });

  test('should reject null object when expecting object', () => {
    const result = Validation.validateResponse(null, 'object');
    expect(result.isValid).toBe(false);
  });

  test('should validate array correctly', () => {
    const testArray = [1, 2, 3];
    const result = Validation.validateResponse(testArray, 'array');
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual(testArray);
  });

  test('should validate number correctly', () => {
    const result = Validation.validateResponse(42, 'number');
    expect(result.isValid).toBe(true);
    expect(result.data).toBe(42);
  });

  test('should reject NaN when expecting number', () => {
    const result = Validation.validateResponse(NaN, 'number');
    expect(result.isValid).toBe(false);
  });

  test('should validate buffer correctly', () => {
    const buffer = Buffer.from('test');
    const result = Validation.validateResponse(buffer, 'buffer');
    expect(result.isValid).toBe(true);
  });

  test('should validate audio size', () => {
    const buffer = Buffer.from('test audio');
    const result = Validation.validateAudioSize(buffer, 1000);
    expect(result.isValid).toBe(true);
  });

  test('should reject large audio file', () => {
    const buffer = Buffer.alloc(1001); // 1001 bytes
    const result = Validation.validateAudioSize(buffer, 1000); // max is 1000 bytes
    expect(result.isValid).toBe(false);
  });

  test('should validate media type', () => {
    const result = Validation.validateMediaType('audio/ogg', ['audio/ogg', 'audio/mp3']);
    expect(result.isValid).toBe(true);
  });

  test('should reject unsupported media type', () => {
    const result = Validation.validateMediaType('audio/flac', ['audio/ogg', 'audio/mp3']);
    expect(result.isValid).toBe(false);
  });
});