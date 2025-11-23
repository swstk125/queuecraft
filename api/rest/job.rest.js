const express = require('express');
const router = express.Router();

const JobService = require("../service/JobService");

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

module.exports = router;