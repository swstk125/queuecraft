const express = require('express');
const router = express.Router();

const JobService = require("../service/JobService");
const rateLimitMiddleware = require("../middleware/rateLimitMiddleware");
const logger = require("../../util/logger");

// Apply rate limiting: max 10 job creation attempts per minute per user
router.use(rateLimitMiddleware());

// POST /job/create - Create a new job with rate limiting
router.post('/create', async (req, res) => {
  try {
    const data = await JobService.createJobs(req.authInfo, req.body);
    res.status(201).json(data);
  } catch (error) {
    // Handle rate limit errors
    if (error.statusCode === 429) {
      logger.warn('Rate limit error', {
        traceId: req.traceId,
        userId: req.authInfo?.userId,
        endpoint: '/job/create'
      });
      return res.status(429).json({
        success: false,
        error: error.message,
        traceId: req.traceId
      });
    }
    
    // Handle other errors
    logger.error('Job creation failed', error, {
      traceId: req.traceId,
      userId: req.authInfo?.userId
    });
    res.status(500).json({
      success: false,
      error: error.message,
      traceId: req.traceId
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const data = await JobService.getJobs(req.authInfo, req.query);
    res.status(200).json(data);
  } catch (error) {
    logger.error('Failed to fetch jobs', error, {
      traceId: req.traceId,
      userId: req.authInfo?.userId,
      query: req.query
    });
    res.status(500).json({
      success: false,
      error: error.message,
      traceId: req.traceId
    });
  }
});

module.exports = router;