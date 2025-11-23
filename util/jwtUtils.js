const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Create JWT token
 * @param {Object} payload - Data to encode in token (e.g., { userId: '123', username: 'admin' })
 * @param {string} expiresIn - Token expiration time (default: '24h')
 * @returns {string} - JWT token
 */
function createJwtToken(payload, expiresIn = '24h') {
    const secretKey = config.get('jwt.secret');
    return jwt.sign(payload, secretKey, {
        expiresIn: expiresIn
    });
}

module.exports = {
    createJwtToken
};

