const { getRedisClient } = require('../db');

/**
 * Cache utility for Redis operations
 */
class CacheUtils {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        console.warn('⚠️  Redis client not available for cache GET');
        return null;
      }

      const value = await redis.get(key);
      if (value) {
        console.log(`🎯 Cache HIT: ${key}`);
        return JSON.parse(value);
      }
      
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 300) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        console.warn('⚠️  Redis client not available for cache SET');
        return false;
      }

      await redis.setEx(key, ttl, JSON.stringify(value));
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        console.warn('⚠️  Redis client not available for cache DEL');
        return false;
      }

      await redis.del(key);
      console.log(`🗑️  Cache DEL: ${key}`);
      return true;
    } catch (error) {
      console.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., "user:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        console.warn('⚠️  Redis client not available for cache DEL pattern');
        return 0;
      }

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`🗑️  Cache DEL pattern: ${pattern} (${keys.length} keys)`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error('Error deleting cache pattern:', error);
      return 0;
    }
  }

  /**
   * Increment a counter in cache
   * @param {string} key - Cache key
   * @returns {Promise<number>} New value after increment
   */
  async incr(key) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        console.warn('⚠️  Redis client not available for cache INCR');
        return 0;
      }

      const value = await redis.incr(key);
      console.log(`📈 Cache INCR: ${key} = ${value}`);
      return value;
    } catch (error) {
      console.error('Error incrementing cache:', error);
      return 0;
    }
  }

  /**
   * Decrement a counter in cache
   * @param {string} key - Cache key
   * @returns {Promise<number>} New value after decrement
   */
  async decr(key) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        console.warn('⚠️  Redis client not available for cache DECR');
        return 0;
      }

      const value = await redis.decr(key);
      console.log(`📉 Cache DECR: ${key} = ${value}`);
      return value;
    } catch (error) {
      console.error('Error decrementing cache:', error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return false;
      }

      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  /**
   * Generate cache key for user jobs
   * @param {string} userId - User ID
   * @param {Object} query - Query filters
   * @returns {string} Cache key
   */
  getUserJobsKey(userId, query = {}) {
    const queryStr = JSON.stringify(query);
    return `jobs:user:${userId}:${Buffer.from(queryStr).toString('base64')}`;
  }

  /**
   * Generate cache key for active job count
   * @param {string} userId - User ID
   * @returns {string} Cache key
   */
  getActiveJobCountKey(userId) {
    return `jobs:active:count:${userId}`;
  }

  /**
   * Generate cache key for user by email
   * @param {string} email - User email
   * @returns {string} Cache key
   */
  getUserByEmailKey(email) {
    return `user:email:${email}`;
  }

  /**
   * Generate cache key for job by ID
   * @param {string} jobId - Job ID
   * @returns {string} Cache key
   */
  getJobByIdKey(jobId) {
    return `job:id:${jobId}`;
  }
}

module.exports = new CacheUtils();

