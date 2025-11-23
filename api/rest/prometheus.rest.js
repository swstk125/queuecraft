const express = require('express');
const router = express.Router();
const prometheusExporter = require('../../util/prometheusExporter');
const logger = require('../../util/logger');

/**
 * GET /prometheus/metrics - Prometheus metrics endpoint
 * Note: This endpoint is public (no JWT auth) to allow Prometheus scraper access
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get custom labels from query params if provided
    const customLabels = {};
    if (req.query.environment) {
      customLabels.environment = req.query.environment;
    }
    if (req.query.instance) {
      customLabels.instance = req.query.instance;
    }
    
    // Export metrics in Prometheus format
    const metricsText = Object.keys(customLabels).length > 0
      ? await prometheusExporter.exportMetricsWithLabels(customLabels)
      : await prometheusExporter.exportMetrics();
    
    // Log the scrape (but not with full structured logging to avoid noise)
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Prometheus metrics scraped', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Set content type to text/plain for Prometheus
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(metricsText);
  } catch (error) {
    logger.error('Error exporting Prometheus metrics', error);
    res.status(500).send('# Error exporting metrics\n');
  }
});

/**
 * GET /prometheus/health - Health check endpoint for Prometheus
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queuecraft'
  });
});

module.exports = router;

