const express = require('express');
const router = express.Router();
const { createJwtToken } = require('../../util/jwtUtils');

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * POST /login
 * Authenticate user and return JWT token
 * Body: { username: string, password: string }
 */
router.post('/', (req, res) => {
    try {
        const { username, password } = req.body;

        // Simple authentication - replace with actual authentication logic
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // TODO: Replace with actual database authentication
        // For now, simple demo authentication
        if (username === 'admin' && password === 'admin123') {
            const token = createJwtToken({ userId: '1', username: username });
            return res.status(200).json({
                success: true,
                message: 'Login successful',
                token: token
            });
        }

        res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * GET /login
 * Login page info
 */
router.get('/', (req, res) => {
    res.json({
        message: 'Login endpoint',
        instructions: 'POST to this endpoint with { username, password } to get JWT token'
    });
});

module.exports = router;
