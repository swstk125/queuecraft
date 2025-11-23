const express = require('express');
const router = express.Router();

const JobService = require("../service/JobService");
const rateLimitMiddleware = require("../middleware/rateLimitMiddleware");

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
      return res.status(429).json({
        success: false,
        error: error.message
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const data = await JobService.getJobs(req.authInfo, req.query);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;