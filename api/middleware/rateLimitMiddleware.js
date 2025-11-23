/**
 * Simple rate limiting middleware
 * Allows only 10 job creation attempts per user per minute
 */

// In-memory store for tracking job creation timestamps per user
// Format: { userId: [timestamp1, timestamp2, ...] }
const requestTimestamps = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Clean up old timestamps outside the rate limit window
 */
function cleanupOldTimestamps(timestamps, now) {
  const windowStart = now - RATE_LIMIT_WINDOW;
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
    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestTimestamp = timestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + RATE_LIMIT_WINDOW - now) / 1000);

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${MAX_REQUESTS_PER_WINDOW} job creation attempts per minute. Try again in ${retryAfter} seconds.`,
        retryAfter
      });
    }

    // Add current timestamp
    timestamps.push(now);
    requestTimestamps.set(userId, timestamps);

    next();
  };
}

// Cleanup old entries every 5 minutes to prevent memory leaks
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
}, 5 * 60 * 1000);

// Don't keep the process alive just for this cleanup
cleanupInterval.unref();

module.exports = rateLimitMiddleware;

