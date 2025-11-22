const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY || "secret";

module.exports = () => {
    return ( req, res, next ) => {
        // Allow /login and /sync endpoints without authentication
        console.log(req.baseUrl);
        if(req.baseUrl === "/login" || req.baseUrl === "/sync") {
            return next();
        }
        const token = req.headers.authorization || req.headers.Authorization;
        if(!token)
            return res.status(401).json({message : "Authorisation Denied", data : req.headers});

        try {
            // Remove "Bearer " prefix if present
            const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
            const decoded = jwt.verify(tokenValue, secretKey);
            req.authInfo = {
                userId: decoded.userId,
                email: decoded.email
            };
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token'});
        }
    }
}