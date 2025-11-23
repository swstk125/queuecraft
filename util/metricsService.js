/**
 * Metrics Service
 * Tracks job statistics and system metrics
 */

const cache = require('./cacheUtils');

class MetricsService {
  constructor() {
    this.METRICS_KEY_PREFIX = 'metrics:';
    this.METRICS_TTL = 86400; // 24 hours
  }

  /**
   * Get metric key
   * @param {string} metricName - Name of the metric
   * @returns {string} Redis key for metric
   */
  getMetricKey(metricName) {
    return `${this.METRICS_KEY_PREFIX}${metricName}`;
  }

  /**
   * Increment a counter metric
   * @param {string} metricName - Name of the metric
   * @param {number} value - Value to increment by (default: 1)
   */
  async incrementCounter(metricName, value = 1) {
    try {
      const key = this.getMetricKey(metricName);
      const currentValue = await cache.get(key) || 0;
      const newValue = parseInt(currentValue) + value;
      await cache.set(key, newValue, this.METRICS_TTL);
      return newValue;
    } catch (error) {
      console.error(`Error incrementing metric ${metricName}:`, error);
      return null;
    }
  }

  /**
   * Decrement a counter metric
   * @param {string} metricName - Name of the metric
   * @param {number} value - Value to decrement by (default: 1)
   */
  async decrementCounter(metricName, value = 1) {
    try {
      const key = this.getMetricKey(metricName);
      const currentValue = await cache.get(key) || 0;
      const newValue = Math.max(0, parseInt(currentValue) - value);
      await cache.set(key, newValue, this.METRICS_TTL);
      return newValue;
    } catch (error) {
      console.error(`Error decrementing metric ${metricName}:`, error);
      return null;
    }
  }

  /**
   * Get a metric value
   * @param {string} metricName - Name of the metric
   * @returns {Promise<number>} Metric value
   */
  async getMetric(metricName) {
    try {
      const key = this.getMetricKey(metricName);
      const value = await cache.get(key);
      return value ? parseInt(value) : 0;
    } catch (error) {
      console.error(`Error getting metric ${metricName}:`, error);
      return 0;
    }
  }

  /**
   * Set a gauge metric
   * @param {string} metricName - Name of the metric
   * @param {number} value - Value to set
   */
  async setGauge(metricName, value) {
    try {
      const key = this.getMetricKey(metricName);
      await cache.set(key, value, this.METRICS_TTL);
      return value;
    } catch (error) {
      console.error(`Error setting gauge ${metricName}:`, error);
      return null;
    }
  }

  /**
   * Record job submission
   */
  async recordJobSubmitted() {
    await this.incrementCounter('jobs:total');
    await this.incrementCounter('jobs:submitted');
    await this.incrementCounter('jobs:pending');
  }

  /**
   * Record job start
   */
  async recordJobStarted() {
    await this.decrementCounter('jobs:pending');
    await this.incrementCounter('jobs:running');
  }

  /**
   * Record job completion
   */
  async recordJobCompleted() {
    await this.decrementCounter('jobs:running');
    await this.incrementCounter('jobs:completed');
  }

  /**
   * Record job failure
   */
  async recordJobFailed() {
    await this.decrementCounter('jobs:running');
    await this.incrementCounter('jobs:failed');
  }

  /**
   * Record job retry
   */
  async recordJobRetry() {
    await this.incrementCounter('jobs:retries');
    await this.incrementCounter('jobs:pending');
  }

  /**
   * Record job moved to DLQ
   */
  async recordJobDLQ() {
    await this.decrementCounter('jobs:pending');
    await this.incrementCounter('jobs:dlq');
    await this.incrementCounter('jobs:failed');
  }

  /**
   * Record rate limit hit
   */
  async recordRateLimitHit() {
    await this.incrementCounter('rate_limit:hits');
  }

  /**
   * Get all metrics
   * @returns {Promise<Object>} All metrics
   */
  async getAllMetrics() {
    try {
      const metricNames = [
        'jobs:total',
        'jobs:submitted',
        'jobs:pending',
        'jobs:running',
        'jobs:completed',
        'jobs:failed',
        'jobs:retries',
        'jobs:dlq',
        'rate_limit:hits'
      ];

      const metrics = {};
      for (const name of metricNames) {
        metrics[name] = await this.getMetric(name);
      }

      // Calculate derived metrics
      metrics['jobs:active'] = metrics['jobs:pending'] + metrics['jobs:running'];
      metrics['jobs:success_rate'] = metrics['jobs:total'] > 0
        ? ((metrics['jobs:completed'] / metrics['jobs:total']) * 100).toFixed(2)
        : '0.00';
      metrics['jobs:failure_rate'] = metrics['jobs:total'] > 0
        ? ((metrics['jobs:failed'] / metrics['jobs:total']) * 100).toFixed(2)
        : '0.00';

      return {
        timestamp: new Date().toISOString(),
        metrics
      };
    } catch (error) {
      console.error('Error getting all metrics:', error);
      return {
        timestamp: new Date().toISOString(),
        metrics: {},
        error: 'Failed to fetch metrics'
      };
    }
  }

  /**
   * Reset all metrics (useful for testing)
   */
  async resetMetrics() {
    try {
      const pattern = `${this.METRICS_KEY_PREFIX}*`;
      await cache.delPattern(pattern);
      return { success: true, message: 'All metrics reset' };
    } catch (error) {
      console.error('Error resetting metrics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record processing time for a job
   * @param {string} jobId - Job ID
   * @param {number} durationMs - Processing duration in milliseconds
   */
  async recordJobProcessingTime(jobId, durationMs) {
    try {
      // Store individual job processing times
      const key = `${this.METRICS_KEY_PREFIX}processing_time:${jobId}`;
      await cache.set(key, durationMs, 3600); // Keep for 1 hour

      // Update average processing time
      const avgKey = this.getMetricKey('avg_processing_time');
      const countKey = this.getMetricKey('processing_time_count');
      
      const currentAvg = await cache.get(avgKey) || 0;
      const count = await cache.get(countKey) || 0;
      
      const newCount = parseInt(count) + 1;
      const newAvg = ((parseFloat(currentAvg) * parseInt(count)) + durationMs) / newCount;
      
      await cache.set(avgKey, newAvg.toFixed(2), this.METRICS_TTL);
      await cache.set(countKey, newCount, this.METRICS_TTL);
      
      return newAvg;
    } catch (error) {
      console.error('Error recording processing time:', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new MetricsService();

