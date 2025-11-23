/**
 * Prometheus Exporter
 * Converts Redis-based metrics to Prometheus text format
 */

const metricsService = require('./metricsService');

class PrometheusExporter {
  constructor() {
    this.serviceName = 'queuecraft';
  }

  /**
   * Format a metric in Prometheus text format
   * @param {string} name - Metric name
   * @param {string} type - Metric type (counter, gauge)
   * @param {string} help - Help text
   * @param {number} value - Metric value
   * @param {Object} labels - Optional labels
   * @returns {string} Prometheus formatted metric
   */
  formatMetric(name, type, help, value, labels = {}) {
    const metricName = `${this.serviceName}_${name}`;
    let output = `# HELP ${metricName} ${help}\n`;
    output += `# TYPE ${metricName} ${type}\n`;
    
    // Add labels if present
    if (Object.keys(labels).length > 0) {
      const labelStr = Object.entries(labels)
        .map(([key, val]) => `${key}="${val}"`)
        .join(',');
      output += `${metricName}{${labelStr}} ${value}\n`;
    } else {
      output += `${metricName} ${value}\n`;
    }
    
    return output;
  }

  /**
   * Export all metrics in Prometheus format
   * @returns {Promise<string>} Prometheus formatted metrics
   */
  async exportMetrics() {
    try {
      const metrics = await metricsService.getAllMetrics();
      const metricsData = metrics.metrics || {};
      
      let output = '';
      
      // Job counters
      output += this.formatMetric(
        'jobs_total',
        'counter',
        'Total number of jobs submitted',
        metricsData['jobs:total'] || 0
      );
      
      output += this.formatMetric(
        'jobs_submitted_total',
        'counter',
        'Total number of jobs submitted (cumulative)',
        metricsData['jobs:submitted'] || 0
      );
      
      output += this.formatMetric(
        'jobs_completed_total',
        'counter',
        'Total number of jobs completed',
        metricsData['jobs:completed'] || 0
      );
      
      output += this.formatMetric(
        'jobs_failed_total',
        'counter',
        'Total number of jobs failed',
        metricsData['jobs:failed'] || 0
      );
      
      output += this.formatMetric(
        'jobs_retries_total',
        'counter',
        'Total number of job retry attempts',
        metricsData['jobs:retries'] || 0
      );
      
      // Job gauges (current state)
      output += this.formatMetric(
        'jobs_pending',
        'gauge',
        'Current number of pending jobs',
        metricsData['jobs:pending'] || 0
      );
      
      output += this.formatMetric(
        'jobs_running',
        'gauge',
        'Current number of running jobs',
        metricsData['jobs:running'] || 0
      );
      
      output += this.formatMetric(
        'jobs_active',
        'gauge',
        'Current number of active jobs (pending + running)',
        metricsData['jobs:active'] || 0
      );
      
      output += this.formatMetric(
        'jobs_dlq',
        'gauge',
        'Current number of jobs in Dead Letter Queue',
        metricsData['jobs:dlq'] || 0
      );
      
      // Success/Failure rates
      output += this.formatMetric(
        'jobs_success_rate',
        'gauge',
        'Job success rate percentage',
        parseFloat(metricsData['jobs:success_rate']) || 0
      );
      
      output += this.formatMetric(
        'jobs_failure_rate',
        'gauge',
        'Job failure rate percentage',
        parseFloat(metricsData['jobs:failure_rate']) || 0
      );
      
      // Rate limiting
      output += this.formatMetric(
        'rate_limit_hits_total',
        'counter',
        'Total number of rate limit violations',
        metricsData['rate_limit:hits'] || 0
      );
      
      // Add timestamp
      output += `# Generated at ${new Date().toISOString()}\n`;
      
      return output;
    } catch (error) {
      console.error('Error exporting Prometheus metrics:', error);
      return '# Error exporting metrics\n';
    }
  }

  /**
   * Export metrics with custom labels
   * @param {Object} customLabels - Custom labels to add to all metrics
   * @returns {Promise<string>} Prometheus formatted metrics
   */
  async exportMetricsWithLabels(customLabels = {}) {
    try {
      const metrics = await metricsService.getAllMetrics();
      const metricsData = metrics.metrics || {};
      
      let output = '';
      
      // Add service info
      output += this.formatMetric(
        'service_info',
        'gauge',
        'Service information',
        1,
        {
          service: this.serviceName,
          version: '1.0.0',
          ...customLabels
        }
      );
      
      // Job metrics with labels
      const jobMetrics = [
        { name: 'jobs_total', type: 'counter', help: 'Total jobs submitted', key: 'jobs:total' },
        { name: 'jobs_pending', type: 'gauge', help: 'Pending jobs', key: 'jobs:pending' },
        { name: 'jobs_running', type: 'gauge', help: 'Running jobs', key: 'jobs:running' },
        { name: 'jobs_completed_total', type: 'counter', help: 'Completed jobs', key: 'jobs:completed' },
        { name: 'jobs_failed_total', type: 'counter', help: 'Failed jobs', key: 'jobs:failed' },
        { name: 'jobs_dlq', type: 'gauge', help: 'Jobs in DLQ', key: 'jobs:dlq' },
        { name: 'jobs_retries_total', type: 'counter', help: 'Retry attempts', key: 'jobs:retries' },
      ];
      
      for (const metric of jobMetrics) {
        output += this.formatMetric(
          metric.name,
          metric.type,
          metric.help,
          metricsData[metric.key] || 0,
          customLabels
        );
      }
      
      output += `# Generated at ${new Date().toISOString()}\n`;
      
      return output;
    } catch (error) {
      console.error('Error exporting Prometheus metrics with labels:', error);
      return '# Error exporting metrics\n';
    }
  }
}

// Export singleton instance
module.exports = new PrometheusExporter();

