// ============================================================
// AUTH ROUTES
// ============================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Auth endpoints
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.post('/verify', authController.verifyCode);
router.post('/resend', authController.resendCode);
router.get('/me', authMiddleware, authController.getCurrentUser);

// ============================================================
// SEND CODE - NEW ROUTE
// ============================================================
const VerificationCode = require('../models/VerificationCode');
const emailService = require('../utils/email');
const codeGenerator = require('../utils/codeGenerator');

router.post('/send-code', async (req, res) => {
    try {
        const { email, code, action } = req.body;
        
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: 'Email and code are required'
            });
        }

        // Save code to database
        const expiresAt = codeGenerator.getExpiryTime();
        await VerificationCode.create({
            email,
            code,
            action,
            expiresAt
        });

        // Send email
        const result = await emailService.sendVerificationCode(email, code, action);
        
        if (result.success) {
            console.log('✅ Verification code sent to:', email);
            return res.json({
                success: true,
                message: 'Verification code sent successfully'
            });
        } else {
            console.error('❌ Email sending failed:', result.error);
            // Still return success because code is stored
            return res.json({
                success: true,
                message: 'Verification code stored. If you didn\'t receive it, check SPAM.',
                warning: result.error
            });
        }
    } catch (error) {
        console.error('Send code error:', error);
        return res.status(500).json({
            success: false,
            error: 'Error sending verification code'
        });
    }
});

module.exports = router;
