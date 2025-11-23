/**
 * Structured Logger with Trace IDs
 * Provides consistent logging across the application with job IDs and trace context
 */

const { randomUUID } = require('crypto');

class Logger {
  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'queuecraft';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Generate a trace ID for request tracking
   * @returns {string} UUID trace ID
   */
  generateTraceId() {
    return randomUUID();
  }

  /**
   * Format log entry with structured data
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @returns {Object} Formatted log entry
   */
  formatLog(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      environment: this.environment,
      message,
      ...context,
      pid: process.pid
    };
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} context - Additional context (jobId, traceId, userId, etc.)
   */
  info(message, context = {}) {
    const log = this.formatLog('info', message, context);
    console.log(JSON.stringify(log));
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|Object} error - Error object or context
   * @param {Object} context - Additional context
   */
  error(message, error = {}, context = {}) {
    const errorContext = {
      ...context,
      error: {
        message: error.message || error,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode
      }
    };
    const log = this.formatLog('error', message, errorContext);
    console.error(JSON.stringify(log));
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    const log = this.formatLog('warn', message, context);
    console.warn(JSON.stringify(log));
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    if (this.environment === 'development') {
      const log = this.formatLog('debug', message, context);
      console.debug(JSON.stringify(log));
    }
  }

  /**
   * Log job event with job ID
   * @param {string} event - Event type (submit, start, finish, fail)
   * @param {Object} job - Job object
   * @param {Object} additionalContext - Additional context
   */
  logJobEvent(event, job, additionalContext = {}) {
    const context = {
      event,
      jobId: job._id || job.id,
      jobName: job.name,
      jobStatus: job.status,
      ownerId: job.ownerId,
      retryCount: job.retryCount || 0,
      ...additionalContext
    };

    switch (event) {
      case 'submit':
        this.info('Job submitted', context);
        break;
      case 'start':
        this.info('Job started', context);
        break;
      case 'finish':
        this.info('Job finished', context);
        break;
      case 'fail':
        this.error('Job failed', { message: additionalContext.reason || 'Unknown failure' }, context);
        break;
      case 'retry':
        this.warn('Job retry scheduled', context);
        break;
      case 'dlq':
        this.error('Job moved to DLQ', { message: 'Max retries exceeded' }, context);
        break;
      default:
        this.info(`Job event: ${event}`, context);
    }
  }

  /**
   * Log API request
   * @param {Object} req - Express request object
   * @param {string} traceId - Trace ID for request tracking
   */
  logRequest(req, traceId) {
    this.info('API Request', {
      traceId,
      method: req.method,
      path: req.path,
      userId: req.authInfo?.userId,
      ip: req.ip || req.connection?.remoteAddress
    });
  }

  /**
   * Log API response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} traceId - Trace ID for request tracking
   * @param {number} duration - Request duration in ms
   */
  logResponse(req, res, traceId, duration) {
    this.info('API Response', {
      traceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.authInfo?.userId
    });
  }
}

// Export singleton instance
module.exports = new Logger();

