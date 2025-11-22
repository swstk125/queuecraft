const express = require('express');
const router = express.Router();

const JobService = require("../service/JobService");

// Define the routes for this router
router.post('/create', async (req, res) => {
  const data = await JobService.createJobs(req.authInfo, req.body);
  res.json(data);
});

module.exports = router;