// ============================================================
// AUTH CONTROLLER
// ============================================================

const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const emailService = require('../utils/email');
const codeGenerator = require('../utils/codeGenerator');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ============================================================
// SIGN UP
// ============================================================
exports.signup = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered. Please sign in.'
            });
        }

        // Create user
        const user = new User({ email, password });
        await user.save();

        // Generate and send verification code
        const code = codeGenerator.generateCode();
        const expiresAt = codeGenerator.getExpiryTime();

        await VerificationCode.create({
            email,
            code,
            action: 'signup',
            expiresAt
        });

        await emailService.sendVerificationCode(email, code, 'signup');

        res.status(201).json({
            success: true,
            message: 'Account created! Verification code sent to your email.'
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Error creating account. Please try again.'
        });
    }
};

// ============================================================
// VERIFY CODE - FIXED
// ============================================================
exports.verifyCode = async (req, res) => {
    try {
        const { email, code, action } = req.body;

        console.log('🔍 Verifying code:', { email, code, action });

        // Find verification code
        const verification = await VerificationCode.findOne({
            email,
            code,
            action,
            isUsed: false
        });

        if (!verification) {
            console.log('❌ No verification found for:', { email, code, action });
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification code.'
            });
        }

        // Check if expired
        if (codeGenerator.isExpired(verification.expiresAt)) {
            console.log('❌ Code expired:', verification.expiresAt);
            return res.status(400).json({
                success: false,
                error: 'Code has expired. Please request a new one.'
            });
        }

        // Check attempts
        if (verification.attempts >= verification.maxAttempts) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({
                success: false,
                error: 'Too many failed attempts. Please request a new code.'
            });
        }

        // Mark as used
        verification.isUsed = true;
        await verification.save();

        console.log('✅ Code verified for:', email);

        // Handle different actions
        switch (action) {
            case 'signup':
                await User.findOneAndUpdate(
                    { email },
                    { isVerified: true }
                );
                const user = await User.findOne({ email });
                const token = generateToken(user._id);
                return res.json({
                    success: true,
                    message: 'Account verified successfully!',
                    token
                });

            case 'signin':
                const signinUser = await User.findOne({ email });
                const signinToken = generateToken(signinUser._id);
                return res.json({
                    success: true,
                    message: 'Sign in successful!',
                    token: signinToken
                });

            case 'reset':
                return res.json({
                    success: true,
                    message: 'Password reset verified!'
                });

            default:
                return res.json({
                    success: true,
                    message: 'Verification successful!'
                });
        }

    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({
            success: false,
            error: 'Error verifying code. Please try again.'
        });
    }
};

// ============================================================
// RESEND CODE
// ============================================================
exports.resendCode = async (req, res) => {
    try {
        const { email, action } = req.body;

        // Check for existing code
        const existing = await VerificationCode.findOne({
            email,
            action,
            isUsed: false
        });

        // Check cooldown
        if (existing && !codeGenerator.canResend(existing.createdAt, 1)) {
            return res.status(429).json({
                success: false,
                error: 'Please wait 1 minute before requesting a new code.'
            });
        }

        // Delete old codes
        await VerificationCode.deleteMany({ email, action, isUsed: false });

        // Generate new code
        const code = codeGenerator.generateCode();
        const expiresAt = codeGenerator.getExpiryTime();

        await VerificationCode.create({
            email,
            code,
            action,
            expiresAt
        });

        await emailService.sendVerificationCode(email, code, action);

        res.json({
            success: true,
            message: 'New verification code sent to your email.'
        });

    } catch (error) {
        console.error('Resend code error:', error);
        res.status(500).json({
            success: false,
            error: 'Error sending code. Please try again.'
        });
    }
};

// ============================================================
// SIGN IN
// ============================================================
exports.signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Account not found. Please create an account.'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Incorrect password. Please try again.'
            });
        }

        // Generate and send verification code
        const code = codeGenerator.generateCode();
        const expiresAt = codeGenerator.getExpiryTime();

        await VerificationCode.create({
            email,
            code,
            action: 'signin',
            expiresAt
        });

        await emailService.sendVerificationCode(email, code, 'signin');

        res.json({
            success: true,
            message: 'Verification code sent to your email.',
            requiresVerification: true
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({
            success: false,
            error: 'Error signing in. Please try again.'
        });
    }
};

// ============================================================
// GET CURRENT USER
// ============================================================
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.'
            });
        }
        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                username: user.email.split('@')[0],
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching user data.'
        });
    }
};
