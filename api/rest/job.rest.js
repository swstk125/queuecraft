const express = require('express');
const router = express.Router();

// Define the routes for this router
router.get('/', (req, res) => {
  res.send('Job Page');
});

module.exports = router;