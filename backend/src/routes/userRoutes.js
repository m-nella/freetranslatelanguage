// ============================================================
// USER ROUTES
// ============================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// These will be implemented in the next steps
router.get('/profile', authMiddleware, (req, res) => {
    res.json({ message: 'Profile endpoint - coming soon' });
});

router.put('/profile', authMiddleware, (req, res) => {
    res.json({ message: 'Update profile endpoint - coming soon' });
});

module.exports = router;
