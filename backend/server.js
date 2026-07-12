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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { success: false, message: 'Too many requests, please try again later.' }
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

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
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
        minlength: 3
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
            return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
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

        if (!email || !password || !username) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered. Please sign in.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            username: username,
            email: email.toLowerCase(),
            passwordHash: passwordHash
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please verify your email.',
            token: token,
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

// POST /api/auth/signin
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Account not found. Please create an account.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
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
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user data.' });
    }
});

// ============================================================
// 8. USER APIs
// ============================================================

// PUT /api/user/profile
app.put('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { username, photo, theme, preferredSourceLanguage, preferredTargetLanguage, voiceSpeed, voicePitch, autoDetect, notificationSettings } = req.body;

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (username) user.username = username;
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

// PUT /api/user/change-password
app.put('/api/user/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        user.passwordHash = passwordHash;
        user.updatedAt = new Date();
        await user.save();

        res.json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Error changing password.' });
    }
});

// PUT /api/user/change-email
app.put('/api/user/change-email', authMiddleware, async (req, res) => {
    try {
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({ success: false, message: 'New email and password are required.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Password is incorrect.' });
        }

        // Check if email is taken
        const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
        if (existingUser && existingUser._id.toString() !== req.userId) {
            return res.status(400).json({ success: false, message: 'Email already in use.' });
        }

        user.email = newEmail.toLowerCase();
        user.updatedAt = new Date();
        await user.save();

        res.json({ success: true, message: 'Email updated successfully.' });

    } catch (error) {
        console.error('Change email error:', error);
        res.status(500).json({ success: false, message: 'Error changing email.' });
    }
});

// DELETE /api/user/delete
app.delete('/api/user/delete', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required to delete account.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Password is incorrect.' });
        }

        // Delete history
        await History.deleteMany({ userId: req.userId });

        // Delete user
        await User.findByIdAndDelete(req.userId);

        res.json({ success: true, message: 'Account deleted successfully.' });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, message: 'Error deleting account.' });
    }
});

// ============================================================
// 9. HISTORY APIs
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

        // Keep only last 100 entries
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
// 10. VERIFICATION APIs
// ============================================================

// POST /api/verify/send-code
app.post('/api/verify/send-code', async (req, res) => {
    try {
        const { email, action } = req.body;

        if (!email || !action) {
            return res.status(400).json({ success: false, message: 'Email and action are required.' });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete existing unused codes for this email and action
        await VerificationCode.deleteMany({
            email: email.toLowerCase(),
            action: action,
            isUsed: false
        });

        // Create new verification code
        const verification = new VerificationCode({
            email: email.toLowerCase(),
            code: code,
            action: action,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        await verification.save();

        // Send email
        const emailResult = await sendEmailViaBrevo(email, code, action);

        if (emailResult.success) {
            res.json({
                success: true,
                message: 'Verification code sent successfully.',
                code: code // For development only - remove in production
            });
        } else {
            // Code stored locally even if email fails
            res.json({
                success: true,
                message: 'Verification code created. Please check your email.',
                code: code,
                warning: 'Email sending had issues, but code is stored locally.'
            });
        }

    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ success: false, message: 'Error sending verification code.' });
    }
});

// POST /api/verify/check-code
app.post('/api/verify/check-code', async (req, res) => {
    try {
        const { email, code, action } = req.body;

        if (!email || !code || !action) {
            return res.status(400).json({ success: false, message: 'Email, code and action are required.' });
        }

        // Find verification record
        const verification = await VerificationCode.findOne({
            email: email.toLowerCase(),
            code: code,
            action: action,
            isUsed: false
        });

        if (!verification) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
        }

        // Check if expired
        if (new Date() > verification.expiresAt) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
        }

        // Check attempts
        if (verification.attempts >= 5) {
            await VerificationCode.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
        }

        // Mark as used
        verification.isUsed = true;
        await verification.save();

        res.json({ success: true, message: 'Code verified successfully.' });

    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ success: false, message: 'Error verifying code.' });
    }
});

// ============================================================
// 11. SETTINGS APIs
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
// 12. EMAIL SEND (For backward compatibility)
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
// 13. HEALTH CHECK
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
// 14. START SERVER
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
