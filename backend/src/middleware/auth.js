// ============================================================
// AUTH MIDDLEWARE - JWT VERIFICATION
// ============================================================

const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. Please sign in.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token. Please sign in again.'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Session expired. Please sign in again.'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Authentication error. Please try again.'
        });
    }
};
