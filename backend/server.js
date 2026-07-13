// ============================================================
// FREE TRANSLATE LANGUAGE - COMPLETE BACKEND
// All APIs in ONE file - Simplified Structure
// ============================================================

// ============================================================
// 1. IMPORTS
// ============================================================
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const https = require('https');
require('dotenv').config();

const app = express();

// ============================================================
// 2. MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://m-nella.github.io',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
    keyGenerator: function(req) {
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    }
});
app.use('/api/', limiter);

// ============================================================
// 3. DATABASE CONNECTION
// ============================================================
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables!');
    process.exit(1);
}

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB Atlas connected successfully!');
}).catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// ============================================================
// 4. MODELS (Schemas)
// ============================================================

// User Schema
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        default: ''
    },
    theme: {
        type: String,
        default: 'dark'
    },
    preferredSourceLanguage: {
        type: String,
        default: 'rw'
    },
    preferredTargetLanguage: {
        type: String,
        default: 'en'
    },
    voiceSpeed: {
        type: Number,
        default: 1
    },
    voicePitch: {
        type: Number,
        default: 1
    },
    autoDetect: {
        type: Boolean,
        default: true
    },
    notificationSettings: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});

// History Schema
const HistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    original: {
        type: String,
        required: true
    },
    translated: {
        type: String,
        required: true
    },
    sourceLang: {
        type: String,
        required: true
    },
    targetLang: {
        type: String,
        required: true
    },
    favorite: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Verification Code Schema
const VerificationCodeSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    code: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['signup', 'signin', 'reset', 'delete', 'email', 'password']
    },
    expiresAt: {
        type: Date,
        required: true,
        default: function() {
            return new Date(Date.now() + 15 * 60 * 1000);
        }
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create models
const User = mongoose.model('User', UserSchema);
const History = mongoose.model('History', HistorySchema);
const VerificationCode = mongoose.model('VerificationCode', VerificationCodeSchema);

// ============================================================
// 5. HELPER FUNCTIONS
// ============================================================

// Generate JWT Token
function generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT Token
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Hash password
function hashPassword(password) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) {
                reject(err);
                return;
            }
            bcrypt.hash(password, salt, function(err, hash) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(hash);
            });
        });
    });
}

// Compare password
function comparePassword(password, hash) {
    return new Promise(function(resolve, reject) {
        if (!password || !hash) {
            reject(new Error('Password and hash are required'));
            return;
        }
        bcrypt.compare(password, hash, function(err, result) {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
}

// Generate username from email - SHORT and CLEAN
function generateUsernameFromEmail(email) {
    if (!email) return 'user';
    var localPart = email.split('@')[0];
    var clean = localPart.replace(/[^a-zA-Z0-9]/g, '');
    if (!clean) return 'user';
    if (clean.length > 8) {
        clean = clean.substring(0, 8);
    }
    if (clean.length < 3) {
        var random = Math.random().toString(36).substring(2, 5);
        clean = clean + random;
    }
    return clean.toLowerCase();
}

// Send Email via Brevo API
function sendEmailViaBrevo(email, code, action) {
    return new Promise((resolve, reject) => {
        const subjectMap = {
            signup: 'Verify Your Email - Free Translate Language',
            signin: 'Your Sign In Code - Free Translate Language',
            reset: 'Reset Your Password - Free Translate Language',
            delete: 'Delete Account Verification - Free Translate Language',
            email: 'Change Email Verification - Free Translate Language',
            password: 'Change Password Verification - Free Translate Language'
        };

        const actionEmoji = {
            signup: '🎉',
            signin: '🔐',
            reset: '🔑',
            delete: '⚠️',
            email: '📧',
            password: '🔒'
        };

        const actionDescription = {
            signup: 'To complete your registration, please verify your email address.',
            signin: 'To securely sign in, please verify your identity.',
            reset: 'To reset your password, please verify your identity.',
            delete: 'To delete your account, please confirm this action.',
            email: 'To change your email, please verify this request.',
            password: 'To change your password, please verify this request.'
        };

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Code - Free Translate Language</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding: 30px 0 20px; border-bottom: 3px solid #4CAF50; }
                    .header h1 { margin: 0; color: #1a1a1a; font-size: 28px; }
                    .header .emoji { font-size: 40px; display: block; margin-bottom: 10px; }
                    .content { padding: 30px 20px; }
                    .content p { margin: 15px 0; color: #555; }
                    .code-container { text-align: center; padding: 25px; margin: 25px 0; background: #f0f7ff; border-radius: 10px; border: 2px dashed #4CAF50; }
                    .code { font-size: 42px; font-weight: bold; color: #2e7d32; letter-spacing: 8px; font-family: 'Courier New', monospace; background: #fff; padding: 15px 30px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .code-label { font-size: 14px; color: #888; margin-bottom: 10px; }
                    .security-note { background: #fff3e0; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0; font-size: 14px; color: #666; }
                    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #999; font-size: 12px; }
                    .footer a { color: #4CAF50; text-decoration: none; }
                    @media only screen and (max-width: 480px) {
                        .container { padding: 10px; }
                        .code { font-size: 32px; letter-spacing: 5px; padding: 10px 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <span class="emoji">${actionEmoji[action] || '📧'}</span>
                        <h1>Free Translate Language</h1>
                        <p style="color: #666; margin: 5px 0 0;">Break language barriers instantly</p>
                    </div>
                    <div class="content">
                        <p><strong>Hello,</strong></p>
                        <p>${actionDescription[action] || 'Please verify your identity using the code below.'}</p>
                        <div class="code-container">
                            <div class="code-label">Your verification code</div>
                            <div class="code">${code}</div>
                        </div>
                        <p style="text-align: center; color: #666;">This code will expire in <strong>15 minutes</strong></p>
                        <div class="security-note">
                            <strong>🔒 Security Note:</strong> If you didn't request this code, please ignore this email. Never share this code with anyone.
                        </div>
                        <p style="text-align: center; color: #888; font-size: 14px;">
                            Need help? Contact us at <a href="mailto:mutuyimanaornella00@gmail.com">mutuyimanaornella00@gmail.com</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2026 Free Translate Language | Built by Ornella Mutuyimana</p>
                        <p><a href="https://m-nella.github.io/freetranslatelanguage/">Visit Free Translate Language</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const postData = JSON.stringify({
            sender: {
                name: process.env.BREVO_SENDER_NAME || 'Free Translate Language',
                email: process.env.BREVO_SENDER_EMAIL || 'mutuyimanaornella00@gmail.com'
            },
            to: [{
                email: email,
                name: email.split('@')[0]
            }],
            subject: subjectMap[action] || 'Verification Code - Free Translate Language',
            htmlContent: htmlContent
        });

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (response.statusCode === 201 || response.statusCode === 200) {
                        resolve({ success: true, messageId: parsed.messageId });
                    } else {
                        resolve({ success: false, error: parsed.message || 'Email sending failed' });
                    }
                } catch (e) {
                    resolve({ success: false, error: 'Invalid response from email service' });
                }
            });
        });

        request.on('error', (error) => {
            resolve({ success: false, error: error.message });
        });

        request.write(postData);
        request.end();
    });
}

// ============================================================
// 6. AUTH MIDDLEWARE
// ============================================================
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.userId = decoded.userId;
    next();
}

// ============================================================
// 7. AUTH APIs
// ============================================================

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered. Please sign in.' });
        }

        let finalUsername = username;
        if (!finalUsername || finalUsername.length < 2) {
            finalUsername = generateUsernameFromEmail(email);
        }

        const passwordHash = await hashPassword(password);

        const user = new User({
            username: finalUsername,
            email: email.toLowerCase(),
            passwordHash: passwordHash,
            isVerified: false
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please verify your email to sign in.',
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Error creating account. Please try again.' });
    }
});

// POST /api/auth/signin - FIXED: ALWAYS require verification for unverified users
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found. Please create an account.' });
        }

        if (!user.passwordHash) {
            console.error('❌ User has no passwordHash:', user.email);
            return res.status(500).json({ success: false, message: 'Account data corrupted. Please contact support.' });
        }

        // Verify password first
        try {
            const isMatch = await comparePassword(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
            }
        } catch (compareError) {
            console.error('❌ Password comparison error:', compareError);
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }

        // CRITICAL: If user is not verified, they MUST verify before signing in
        if (!user.isVerified) {
            user.lastLogin = new Date();
            await user.save();
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before signing in.',
                requiresVerification: true,
                email: user.email,
                data: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Signed in successfully.',
            token: token,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ success: false, message: 'Error signing in. Please try again.' });
    }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try {
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging out.' });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                photo: user.photo,
                theme: user.theme,
                preferredSourceLanguage: user.preferredSourceLanguage,
                preferredTargetLanguage: user.preferredTargetLanguage,
                voiceSpeed: user.voiceSpeed,
                voicePitch: user.voicePitch,
                autoDetect: user.autoDetect,
                notificationSettings: user.notificationSettings,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user data.' });
    }
});

// ============================================================
// 8. CHECK EMAIL EXISTS
// ============================================================
app.post('/api/auth/check-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Email not registered. Please create an account.' });
        }

        res.json({ success: true, message: 'Email found.', exists: true });

    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ success: false, message: 'Error checking email. Please try again.' });
    }
});

// ============================================================
// 9. USER APIs - ALL REQUIRE VERIFICATION CODE
// ============================================================

// PUT /api/user/profile
app.put('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { photo, theme, preferredSourceLanguage, preferredTargetLanguage, voiceSpeed, voicePitch, autoDetect, notificationSettings } = req.body;

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (photo !== undefined) user.photo = photo;
        if (theme) user.theme = theme;
        if (preferredSourceLanguage) user.preferredSourceLanguage = preferredSourceLanguage;
        if (preferredTargetLanguage) user.preferredTargetLanguage = preferredTargetLanguage;
        if (voiceSpeed !== undefined) user.voiceSpeed = voiceSpeed;
        if (voicePitch !== undefined) user.voicePitch = voicePitch;
        if (autoDetect !== undefined) user.autoDetect = autoDetect;
        if (notificationSettings) user.notificationSettings = notificationSettings;

        user.updatedAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                photo: user.photo,
                theme: user.theme,
                preferredSourceLanguage: user.preferredSourceLanguage,
                preferredTargetLanguage: user.preferredTargetLanguage,
                voiceSpeed: user.voiceSpeed,
                voicePitch: user.voicePitch,
                autoDetect: user.autoDetect,
                notificationSettings: user.notificationSettings
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile.' });
    }
});

// PUT /api/user/change-password - REQUIRES VERIFICATION CODE
app.put('/api/user/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword, verificationCode } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required.' });
        }

        if (!verificationCode) {
            return res.status(400).json({ success: false, message: 'Verification code is required to change password.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check verification code
        const verification = await VerificationCode.findOne({
            email: user.email,
            code: verificationCode,
            action: 'password',
            isUsed: false
        });

        if (!verification) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
        }

        if (new Date() > verification.expiresAt) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
        }

        const isMatch = await comparePassword(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        // Mark code as used
        verification.isUsed = true;
        await verification.save();

        const passwordHash = await hashPassword(newPassword);
        user.passwordHash = passwordHash;
        user.updatedAt = new Date();
        await user.save();

        res.json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Error changing password.' });
    }
});

// PUT /api/user/change-email - REQUIRES VERIFICATION CODE
app.put('/api/user/change-email', authMiddleware, async (req, res) => {
    try {
        const { newEmail, password, verificationCode } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({ success: false, message: 'New email and password are required.' });
        }

        if (!verificationCode) {
            return res.status(400).json({ success: false, message: 'Verification code is required to change email.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check verification code for the NEW email
        const verification = await VerificationCode.findOne({
            email: newEmail.toLowerCase(),
            code: verificationCode,
            action: 'email',
            isUsed: false
        });

        if (!verification) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code for new email.' });
        }

        if (new Date() > verification.expiresAt) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
        }

        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Password is incorrect.' });
        }

        const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
        if (existingUser && existingUser._id.toString() !== req.userId) {
            return res.status(400).json({ success: false, message: 'Email already in use.' });
        }

        // Mark code as used
        verification.isUsed = true;
        await verification.save();

        user.email = newEmail.toLowerCase();
        user.username = generateUsernameFromEmail(newEmail);
        user.updatedAt = new Date();
        user.isVerified = false; // Require re-verification
        await user.save();

        res.json({ 
            success: true, 
            message: 'Email updated successfully. Please verify your new email.',
            data: {
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Change email error:', error);
        res.status(500).json({ success: false, message: 'Error changing email.' });
    }
});

// DELETE /api/user/delete - REQUIRES VERIFICATION CODE
app.delete('/api/user/delete', authMiddleware, async (req, res) => {
    try {
        const { password, verificationCode } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required to delete account.' });
        }

        if (!verificationCode) {
            return res.status(400).json({ success: false, message: 'Verification code is required to delete account.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check verification code
        const verification = await VerificationCode.findOne({
            email: user.email,
            code: verificationCode,
            action: 'delete',
            isUsed: false
        });

        if (!verification) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
        }

        if (new Date() > verification.expiresAt) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
        }

        try {
            const isMatch = await comparePassword(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Password is incorrect.' });
            }
        } catch (compareError) {
            console.error('❌ Password comparison error during deletion:', compareError);
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }

        // Mark code as used
        verification.isUsed = true;
        await verification.save();

        await History.deleteMany({ userId: req.userId });
        await VerificationCode.deleteMany({ email: user.email });
        await User.findByIdAndDelete(req.userId);

        res.json({ 
            success: true, 
            message: 'Account deleted successfully.',
            deleted: true
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, message: 'Error deleting account. Please try again.' });
    }
});

// ============================================================
// 10. HISTORY APIs
// ============================================================

// GET /api/history
app.get('/api/history', authMiddleware, async (req, res) => {
    try {
        const history = await History.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: 'Error fetching history.' });
    }
});

// POST /api/history
app.post('/api/history', authMiddleware, async (req, res) => {
    try {
        const { original, translated, sourceLang, targetLang, favorite } = req.body;

        if (!original || !translated || !sourceLang || !targetLang) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const historyEntry = new History({
            userId: req.userId,
            original: original,
            translated: translated,
            sourceLang: sourceLang,
            targetLang: targetLang,
            favorite: favorite || false
        });

        await historyEntry.save();

        const count = await History.countDocuments({ userId: req.userId });
        if (count > 100) {
            const toDelete = await History.find({ userId: req.userId })
                .sort({ createdAt: 1 })
                .limit(count - 100);
            const ids = toDelete.map(doc => doc._id);
            await History.deleteMany({ _id: { $in: ids } });
        }

        res.status(201).json({
            success: true,
            message: 'History saved.',
            data: historyEntry
        });

    } catch (error) {
        console.error('Save history error:', error);
        res.status(500).json({ success: false, message: 'Error saving history.' });
    }
});

// DELETE /api/history/:id
app.delete('/api/history/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await History.findOneAndDelete({
            _id: id,
            userId: req.userId
        });

        if (!result) {
            return res.status(404).json({ success: false, message: 'History item not found.' });
        }

        res.json({ success: true, message: 'History item deleted.' });

    } catch (error) {
        console.error('Delete history error:', error);
        res.status(500).json({ success: false, message: 'Error deleting history item.' });
    }
});

// DELETE /api/history/clear
app.delete('/api/history/clear', authMiddleware, async (req, res) => {
    try {
        await History.deleteMany({ userId: req.userId });

        res.json({ success: true, message: 'All history cleared.' });

    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({ success: false, message: 'Error clearing history.' });
    }
});

// ============================================================
// 11. VERIFICATION APIs
// ============================================================

// POST /api/verify/send-code
app.post('/api/verify/send-code', async (req, res) => {
    try {
        const { email, action } = req.body;

        if (!email || !action) {
            return res.status(400).json({ success: false, message: 'Email and action are required.' });
        }

        // For 'reset' action, check if email exists in database
        if (action === 'reset') {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Email not registered. Please create an account.' 
                });
            }
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await VerificationCode.deleteMany({
            email: email.toLowerCase(),
            action: action,
            isUsed: false
        });

        const verification = new VerificationCode({
            email: email.toLowerCase(),
            code: code,
            action: action,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        await verification.save();

        const emailResult = await sendEmailViaBrevo(email, code, action);

        if (emailResult.success) {
            res.json({
                success: true,
                message: 'Verification code sent successfully.',
                code: code
            });
        } else {
            res.json({
                success: true,
                message: 'Verification code created. Please check your email.',
                code: code,
                warning: 'Email sending had issues, but code is stored locally.'
            });
        }

    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ success: false, message: 'Error sending verification code. Please try again.' });
    }
});

// POST /api/verify/check-code
app.post('/api/verify/check-code', async (req, res) => {
    try {
        const { email, code, action } = req.body;

        if (!email || !code || !action) {
            return res.status(400).json({ success: false, message: 'Email, code and action are required.' });
        }

        const verification = await VerificationCode.findOne({
            email: email.toLowerCase(),
            code: code,
            action: action,
            isUsed: false
        });

        if (!verification) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
        }

        if (new Date() > verification.expiresAt) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
        }

        if (verification.attempts >= 5) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
        }

        verification.isUsed = true;
        await verification.save();

        let token = null;

        // Mark user as verified for signup or signin action
        if (action === 'signup' || action === 'signin') {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (user) {
                user.isVerified = true;
                await user.save();
                // Generate token only for signin (not signup)
                if (action === 'signin') {
                    token = generateToken(user._id);
                }
            }
        }

        res.json({ 
            success: true, 
            message: 'Code verified successfully.',
            token: token,
            requiresSignIn: action === 'signup'
        });

    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ success: false, message: 'Error verifying code. Please try again.' });
    }
});

// ============================================================
// 12. SETTINGS APIs
// ============================================================

// GET /api/settings
app.get('/api/settings', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('theme preferredSourceLanguage preferredTargetLanguage voiceSpeed voicePitch autoDetect notificationSettings');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({
            success: true,
            data: {
                theme: user.theme,
                preferredSourceLanguage: user.preferredSourceLanguage,
                preferredTargetLanguage: user.preferredTargetLanguage,
                voiceSpeed: user.voiceSpeed,
                voicePitch: user.voicePitch,
                autoDetect: user.autoDetect,
                notificationSettings: user.notificationSettings
            }
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching settings.' });
    }
});

// PUT /api/settings
app.put('/api/settings', authMiddleware, async (req, res) => {
    try {
        const { theme, preferredSourceLanguage, preferredTargetLanguage, voiceSpeed, voicePitch, autoDetect, notificationSettings } = req.body;

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (theme) user.theme = theme;
        if (preferredSourceLanguage) user.preferredSourceLanguage = preferredSourceLanguage;
        if (preferredTargetLanguage) user.preferredTargetLanguage = preferredTargetLanguage;
        if (voiceSpeed !== undefined) user.voiceSpeed = voiceSpeed;
        if (voicePitch !== undefined) user.voicePitch = voicePitch;
        if (autoDetect !== undefined) user.autoDetect = autoDetect;
        if (notificationSettings) user.notificationSettings = notificationSettings;

        user.updatedAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Settings updated successfully.',
            data: {
                theme: user.theme,
                preferredSourceLanguage: user.preferredSourceLanguage,
                preferredTargetLanguage: user.preferredTargetLanguage,
                voiceSpeed: user.voiceSpeed,
                voicePitch: user.voicePitch,
                autoDetect: user.autoDetect,
                notificationSettings: user.notificationSettings
            }
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Error updating settings.' });
    }
});

// ============================================================
// 13. EMAIL SEND (For backward compatibility)
// ============================================================
app.post('/api/email/send', async (req, res) => {
    try {
        const { email, code, action } = req.body;

        if (!email || !code || !action) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const result = await sendEmailViaBrevo(email, code, action);

        if (result.success) {
            res.json({ success: true, message: 'Email sent successfully.' });
        } else {
            res.status(500).json({ success: false, message: result.error || 'Failed to send email.' });
        }

    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ success: false, message: 'Error sending email.' });
    }
});

// ============================================================
// 14. HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'FreeTranslateLanguage API',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/', (req, res) => {
    res.json({
        service: 'FreeTranslateLanguage API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth/*',
            user: '/api/user/*',
            history: '/api/history/*',
            settings: '/api/settings',
            verify: '/api/verify/*',
            health: '/health'
        },
        website: 'https://m-nella.github.io/freetranslatelanguage/'
    });
});

// ============================================================
// 15. START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 FreeTranslateLanguage API Server Started');
    console.log('='.repeat(50));
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Email: ${process.env.BREVO_SENDER_EMAIL || 'Not configured'}`);
    console.log(`🗄️  MongoDB: ${MONGODB_URI ? 'Connected' : 'Not connected'}`);
    console.log('='.repeat(50));
});
