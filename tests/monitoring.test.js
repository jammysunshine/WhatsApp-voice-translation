const monitoringService = require('../utils/monitoring');

describe('MonitoringService', () => {
  beforeEach(() => {
    // Clear all metrics before each test
    monitoringService.metrics.clear();
    monitoringService.timers.clear();
  });

  test('should record a metric', () => {
    monitoringService.recordMetric('test_metric', 10, { tag: 'value' });
    
    const summary = monitoringService.getMetricSummary('test_metric');
    expect(summary).not.toBeNull();
    expect(summary.name).toBe('test_metric');
    expect(summary.count).toBe(1);
    expect(summary.average).toBe(10);
  });

  test('should start and end a timer', () => {
    monitoringService.startTimer('test_timer');
    const duration = monitoringService.endTimer('test_timer', { operation: 'test' });
    
    expect(duration).toBeGreaterThanOrEqual(0);
    
    const summary = monitoringService.getMetricSummary('test_timer_duration_ms');
    expect(summary).not.toBeNull();
  });

  test('should return health status', () => {
    const healthStatus = monitoringService.getHealthStatus();
    
    expect(healthStatus).toHaveProperty('status');
    expect(healthStatus).toHaveProperty('timestamp');
    expect(healthStatus).toHaveProperty('uptime');
    expect(healthStatus).toHaveProperty('memory');
    expect(healthStatus).toHaveProperty('system');
  });

  test('should record error', () => {
    monitoringService.recordError('test_module', 'test_operation', 'TestError');
    
    const summary = monitoringService.getMetricSummary('error_count');
    expect(summary).not.toBeNull();
    expect(summary.count).toBe(1);
  });
});