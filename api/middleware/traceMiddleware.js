/**
 * Trace Middleware
 * Adds trace ID to every request for distributed tracing
 */

const logger = require('../../util/logger');

/**
 * Middleware to add trace ID to requests and log request/response
 */
function traceMiddleware() {
  return (req, res, next) => {
    // Generate or extract trace ID
    const traceId = req.headers['x-trace-id'] || logger.generateTraceId();
    
    // Attach trace ID to request
    req.traceId = traceId;
    
    // Add trace ID to response headers
    res.setHeader('X-Trace-Id', traceId);
    
    // Log incoming request
    const startTime = Date.now();
    logger.logRequest(req, traceId);
    
    // Capture response finish event
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      logger.logResponse(req, res, traceId, duration);
      originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = traceMiddleware;

