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
  defaultMeta: { service: 'monitoring' },
  transports: [
    new transports.File({
      filename: 'logs/monitoring.log'
    })
  ]
});

class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
  }

  /**
   * Start timing a specific operation
   * @param {string} operationId - Unique identifier for the operation
   */
  startTimer(operationId) {
    this.timers.set(operationId, process.hrtime.bigint());
    logger.debug('Timer started', { operationId });
  }

  /**
   * End timing and record the duration for a specific operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} tags - Additional tags for the metric
   * @returns {number} - Duration in milliseconds
   */
  endTimer(operationId, tags = {}) {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      logger.warn('Timer not found', { operationId });
      return 0;
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds
    this.timers.delete(operationId);

    // Record the timing metric
    this.recordMetric(`${operationId}_duration_ms`, duration, tags);

    logger.debug('Timer ended', {
      operationId,
      duration: `${Math.round(duration)}ms`,
      ...tags
    });

    return duration;
  }

  /**
   * Record a metric with optional tags
   * @param {string} name - Name of the metric
   * @param {number} value - Value of the metric
   * @param {Object} tags - Additional tags for the metric
   */
  recordMetric(name, value, tags = {}) {
    const timestamp = Date.now();
    const metric = {
      name,
      value,
      tags,
      timestamp
    };

    // Store metric in memory map
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(metric);

    // Log the metric
    logger.info('Metric recorded', metric);

    // Keep only last 1000 entries per metric to prevent excessive memory usage
    if (this.metrics.get(name).length > 1000) {
      this.metrics.get(name).shift(); // Remove oldest entry
    }
  }

  /**
   * Get metrics summary for a specific metric name
   * @param {string} name - Name of the metric
   * @returns {Object} - Summary with count, average, min, max
   */
  getMetricSummary(name) {
    const metrics = this.metrics.get(name) || [];
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      name,
      count,
      average: avg,
      min,
      max,
      lastUpdated: metrics[metrics.length - 1].timestamp
    };
  }

  /**
   * Get all recorded metrics summaries
   * @returns {Array} - Array of metric summaries
   */
  getAllMetrics() {
    const summaries = [];
    for (const [name] of this.metrics) {
      summaries.push(this.getMetricSummary(name));
    }
    return summaries;
  }

  /**
   * Record API response time
   * @param {string} endpoint - API endpoint
   * @param {number} responseTime - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   */
  recordApiResponseTime(endpoint, responseTime, statusCode) {
    this.recordMetric('api_response_time_ms', responseTime, {
      endpoint,
      statusCode
    });
  }

  /**
   * Record processing duration 
   * @param {string} operation - Processing operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} tags - Additional tags
   */
  recordProcessingTime(operation, duration, tags = {}) {
    this.recordMetric(`${operation}_processing_time_ms`, duration, tags);
  }

  /**
   * Record error occurrence
   * @param {string} module - Module where error occurred
   * @param {string} operation - Operation where error occurred
   * @param {string} errorType - Type of error
   */
  recordError(module, operation, errorType) {
    this.recordMetric('error_count', 1, {
      module,
      operation,
      errorType
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const os = require('os');
    
    this.recordMetric('memory_rss_bytes', memoryUsage.rss);
    this.recordMetric('memory_heap_total_bytes', memoryUsage.heapTotal);
    this.recordMetric('memory_heap_used_bytes', memoryUsage.heapUsed);
    this.recordMetric('memory_external_bytes', memoryUsage.external);
    this.recordMetric('memory_array_buffers_bytes', memoryUsage.arrayBuffers);
    this.recordMetric('system_free_memory_bytes', os.freemem());
    this.recordMetric('system_total_memory_bytes', os.totalmem());
    this.recordMetric('system_memory_usage_percent', (os.totalmem() - os.freemem()) / os.totalmem() * 100);
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage() {
    const os = require('os');
    const cpus = os.cpus();
    const avgCpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + (total - idle) / total * 100;
    }, 0) / cpus.length;
    
    this.recordMetric('cpu_usage_percent', avgCpuUsage);
  }

  /**
   * Get health check data
   * @returns {Object} - Health check information
   */
  getHealthStatus() {
    const memoryUsage = process.memoryUsage();
    const os = require('os');
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      system: {
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        memoryUsagePercent: (os.totalmem() - os.freemem()) / os.totalmem() * 100,
        loadAverage: os.loadavg()
      }
    };
  }
}

// Create a singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;