const express = require('express');
const router = express.Router();

const UserService = require('../service/UserService');

// Define the routes for this router
router.get('/', (req, res) => {
  res.send('User Page');
});

router.post('/create', async (req, res) => {
  const { username, password, email } = req.body;
  const user = await UserService.createUser({username, password, email});
  res.json(user);
});

module.exports = router;