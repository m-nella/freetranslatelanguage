// ============================================================
// AUTH ROUTES
// ============================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/verify', authController.verifyCode);
router.post('/resend', authController.resendCode);
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
