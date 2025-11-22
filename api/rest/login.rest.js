const express = require('express');
const router = express.Router();
const LoginService = require('../service/LoginService');
// Middleware to parse JSON bodies
router.use(express.json());

router.post('/', async (req, res) => {
    const data = await LoginService.login(req.body);
    res.json(data);
});

module.exports = router;
