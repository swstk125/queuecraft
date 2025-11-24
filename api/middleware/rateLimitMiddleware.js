/**
 * Simple rate limiting middleware
 * Allows only 10 job creation attempts per user per minute
 */

const config = require('../../config');

// In-memory store for tracking job creation timestamps per user
// Format: { userId: [timestamp1, timestamp2, ...] }
const requestTimestamps = new Map();

/**
 * Clean up old timestamps outside the rate limit window
 */
function cleanupOldTimestamps(timestamps, now) {
  const windowStart = now - config.get('rateLimit.window');
  return timestamps.filter(timestamp => timestamp > windowStart);
}

/**
 * Rate limiting middleware
 */
function rateLimitMiddleware() {
  return (req, res, next) => {
    // Only apply to POST /create
    if (req.method !== 'POST' || req.path !== '/create') {
      return next();
    }

    // Check if user is authenticated
    if (!req.authInfo || !req.authInfo.userId) {
      return next(); // Let auth middleware handle this
    }

    const userId = req.authInfo.userId;
    const now = Date.now();

    // Get user's request timestamps
    let timestamps = requestTimestamps.get(userId) || [];
    
    // Clean up old timestamps
    timestamps = cleanupOldTimestamps(timestamps, now);

    // Check if rate limit exceeded
    const maxRequests = config.get('rateLimit.maxRequestsPerWindow');
    const rateLimitWindow = config.get('rateLimit.window');
    
    if (timestamps.length >= maxRequests) {
      const oldestTimestamp = timestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + rateLimitWindow - now) / 1000);

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} job creation attempts per minute. Try again in ${retryAfter} seconds.`,
        retryAfter
      });
    }

    // Add current timestamp
    timestamps.push(now);
    requestTimestamps.set(userId, timestamps);

    next();
  };
}

// Cleanup old entries periodically to prevent memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of requestTimestamps.entries()) {
    const cleaned = cleanupOldTimestamps(timestamps, now);
    if (cleaned.length === 0) {
      requestTimestamps.delete(userId);
    } else {
      requestTimestamps.set(userId, cleaned);
    }
  }
}, config.get('rateLimit.cleanupInterval'));

// Don't keep the process alive just for this cleanup
cleanupInterval.unref();

module.exports = rateLimitMiddleware;

