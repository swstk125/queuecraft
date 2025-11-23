const express = require('express');
const router = express.Router();
const metricsService = require('../../util/metricsService');
const logger = require('../../util/logger');

// GET /metrics - Get all system metrics
router.get('/', async (req, res) => {
  try {
    const traceId = req.traceId;
    
    logger.info('Metrics requested', { traceId, userId: req.authInfo?.userId });
    
    const metrics = await metricsService.getAllMetrics();
    
    res.status(200).json({
      success: true,
      ...metrics
    });
  } catch (error) {
    logger.error('Error fetching metrics', error, { traceId: req.traceId });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /metrics/reset - Reset all metrics (admin only, for testing)
router.post('/reset', async (req, res) => {
  try {
    const traceId = req.traceId;
    
    logger.warn('Metrics reset requested', { 
      traceId, 
      userId: req.authInfo?.userId 
    });
    
    const result = await metricsService.resetMetrics();
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error resetting metrics', error, { traceId: req.traceId });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

