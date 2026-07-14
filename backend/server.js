// ============================================================
// FREE TRANSLATE LANGUAGE - SECURE BACKEND
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
// SECURITY MIDDLEWARE
// ============================================================

// Helmet - Adds security headers
app.use(helmet());

// Trust proxy - Required for Render
app.set('trust proxy', 1);

// ============================================================
// CORS - SECURE: Only allow your frontend domain
// ============================================================
const allowedOrigins = [
    'https://freetranslatelanguage.onrender.com',
    'http://localhost:5000',
    'http://localhost:3000'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// RATE LIMITING - Prevent brute force attacks
// ============================================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { success: false, message: 'Too many requests, please try again later.' },
    keyGenerator: function(req) {
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
});
app.use('/api/', limiter);

// ============================================================
// DATABASE CONNECTION
// ============================================================
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found!');
    process.exit(1);
}

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB connected!');
}).catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// ============================================================
// MODELS
// ============================================================

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 20 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    photo: { type: String, default: '' },
    theme: { type: String, default: 'dark' },
    preferredSourceLanguage: { type: String, default: 'rw' },
    preferredTargetLanguage: { type: String, default: 'en' },
    voiceSpeed: { type: Number, default: 1 },
    voicePitch: { type: Number, default: 1 },
    autoDetect: { type: Boolean, default: true },
    notificationSettings: { email: { type: Boolean, default: true }, push: { type: Boolean, default: true } },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: null },
    isVerified: { type: Boolean, default: false }
});

const HistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    original: { type: String, required: true },
    translated: { type: String, required: true },
    sourceLang: { type: String, required: true },
    targetLang: { type: String, required: true },
    favorite: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const VerificationCodeSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    action: { type: String, required: true, enum: ['signup', 'signin', 'reset', 'delete', 'email', 'password'] },
    expiresAt: { type: Date, required: true, default: function() { return new Date(Date.now() + 15 * 60 * 1000); } },
    isUsed: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const History = mongoose.model('History', HistorySchema);
const VerificationCode = mongoose.model('VerificationCode', VerificationCodeSchema);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
    try { return jwt.verify(token, process.env.JWT_SECRET); } catch (error) { return null; }
}

function getTokenFromRequest(req) {
    if (req.cookies && req.cookies.authToken) {
        return req.cookies.authToken;
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
}

function setTokenCookie(res, token) {
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: true, // Always secure in production
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
    });
}

function clearTokenCookie(res) {
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/'
    });
}

function hashPassword(password) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) { reject(err); return; }
            bcrypt.hash(password, salt, function(err, hash) {
                if (err) { reject(err); return; }
                resolve(hash);
            });
        });
    });
}

function comparePassword(password, hash) {
    return new Promise(function(resolve, reject) {
        if (!password || !hash) { reject(new Error('Password and hash are required')); return; }
        const trimmedPassword = typeof password === 'string' ? password.trim() : password;
        bcrypt.compare(trimmedPassword, hash, function(err, result) {
            if (err) { reject(err); return; }
            resolve(result);
        });
    });
}

function generateUsernameFromEmail(email) {
    if (!email) return 'user';
    var localPart = email.split('@')[0];
    var clean = localPart.replace(/[^a-zA-Z0-9]/g, '');
    if (!clean) return 'user';
    if (clean.length > 8) { clean = clean.substring(0, 8); }
    if (clean.length < 3) { var random = Math.random().toString(36).substring(2, 5); clean = clean + random; }
    return clean.toLowerCase();
}

function normalizeEmail(email) {
    if (!email) return '';
    return email.trim().toLowerCase();
}

function sendEmailViaBrevo(email, code, action) {
    return new Promise((resolve) => {
        const subjectMap = {
            signup: 'Verify Your Email - Free Translate Language',
            signin: 'Your Sign In Code - Free Translate Language',
            reset: 'Reset Your Password - Free Translate Language',
            delete: 'Delete Account Verification - Free Translate Language',
            email: 'Change Email Verification - Free Translate Language',
            password: 'Change Password Verification - Free Translate Language'
        };

        const actionDescription = {
            signup: 'To complete your registration, please verify your email address.',
            signin: 'To securely sign in, please verify your identity.',
            reset: 'To reset your password, please verify your identity.',
            delete: 'To delete your account, please confirm this action.',
            email: 'To change your email, please verify this request.',
            password: 'To change your password, please verify this request.'
        };

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code - Free Translate Language</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #4CAF50; }
        .header h1 { color: #1a1a1a; font-size: 28px; }
        .content { padding: 20px; }
        .code-container { text-align: center; padding: 25px; margin: 20px 0; background: #f0f7ff; border-radius: 10px; border: 2px dashed #4CAF50; }
        .code { font-size: 42px; font-weight: bold; color: #2e7d32; letter-spacing: 8px; font-family: 'Courier New', monospace; background: #fff; padding: 15px 30px; border-radius: 8px; display: inline-block; }
        .security-note { background: #fff3e0; padding: 12px 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0; font-size: 14px; color: #666; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        .footer a { color: #4CAF50; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Free Translate Language</h1>
            <p style="color: #666;">Break language barriers instantly</p>
        </div>
        <div class="content">
            <p><strong>Hello,</strong></p>
            <p>${actionDescription[action] || 'Please verify your identity using the code below.'}</p>
            <div class="code-container">
                <div style="font-size:14px;color:#888;margin-bottom:10px;">Your verification code</div>
                <div class="code">${code}</div>
            </div>
            <p style="text-align:center;color:#666;">This code will expire in <strong>15 minutes</strong></p>
            <div class="security-note">
                <strong>🔒 Security Note:</strong> If you didn't request this code, please ignore this email. Never share this code with anyone.
            </div>
        </div>
        <div class="footer">
            <p>© 2026 Free Translate Language | Built by Ornella Mutuyimana</p>
        </div>
    </div>
</body>
</html>`;

        const postData = JSON.stringify({
            sender: { name: process.env.BREVO_SENDER_NAME || 'Free Translate Language', email: process.env.BREVO_SENDER_EMAIL || 'mutuyimanaornella00@gmail.com' },
            to: [{ email: email, name: email.split('@')[0] }],
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
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: parsed.message || 'Email sending failed' });
                    }
                } catch (e) {
                    resolve({ success: false, error: 'Invalid response from email service' });
                }
            });
        });

        request.on('error', (error) => { resolve({ success: false, error: error.message }); });
        request.write(postData);
        request.end();
    });
}

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
function authMiddleware(req, res, next) {
    const token = getTokenFromRequest(req);
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
// AUTH APIs - (Same as before, keep all endpoints)
// ============================================================

app.post('/api/auth/signup', async (req, res) => {
    try {
        let { email, password, username } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        email = normalizeEmail(email);
        password = typeof password === 'string' ? password.trim() : password;
        
        const existingUser = await User.findOne({ email: email });
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
            email: email,
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

app.post('/api/auth/signin', async (req, res) => {
    try {
        let { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        email = normalizeEmail(email);
        password = typeof password === 'string' ? password.trim() : password;
        
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found. Please create an account.' });
        }
        if (!user.passwordHash) {
            return res.status(500).json({ success: false, message: 'Account data corrupted. Please contact support.' });
        }
        
        try {
            const isMatch = await comparePassword(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
            }
        } catch (compareError) {
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }
        
        user.lastLogin = new Date();
        await user.save();
        
        return res.status(403).json({
            success: false,
            message: 'Please verify your identity to sign in.',
            requiresVerification: true,
            email: user.email,
            data: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ success: false, message: 'Error signing in. Please try again.' });
    }
});

app.post('/api/auth/verify-password', authMiddleware, async (req, res) => {
    try {
        let { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required.' });
        }
        password = typeof password === 'string' ? password.trim() : password;
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (!user.passwordHash) {
            return res.status(500).json({ success: false, message: 'Account data corrupted. Please contact support.' });
        }
        
        try {
            const isMatch = await comparePassword(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
            }
        } catch (compareError) {
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }
        
        res.json({ success: true, message: 'Password verified successfully.' });
    } catch (error) {
        console.error('Verify password error:', error);
        res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
    }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try {
        clearTokenCookie(res);
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging out.' });
    }
});

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

app.post('/api/auth/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
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
// USER APIs
// ============================================================

app.put('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { photo, theme, preferredSourceLanguage, preferredTargetLanguage, voiceSpeed, voicePitch, autoDetect, notificationSettings } = req.body;
        const user = await User.findById(req.userId);
        if (!user) { return res.status(404).json({ success: false, message: 'User not found.' }); }
        
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

app.put('/api/user/change-password', authMiddleware, async (req, res) => {
    try {
        let { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required.' });
        }
        
        currentPassword = typeof currentPassword === 'string' ? currentPassword.trim() : currentPassword;
        newPassword = typeof newPassword === 'string' ? newPassword.trim() : newPassword;
        
        const user = await User.findById(req.userId);
        if (!user) { return res.status(404).json({ success: false, message: 'User not found.' }); }
        
        try {
            const isMatch = await comparePassword(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
            }
        } catch (compareError) {
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }
        
        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: 'New password must be different from current password.' });
        }
        
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

app.put('/api/user/change-email', authMiddleware, async (req, res) => {
    try {
        let { newEmail, password } = req.body;
        
        if (!newEmail || !password) {
            return res.status(400).json({ success: false, message: 'New email and password are required.' });
        }
        
        newEmail = normalizeEmail(newEmail);
        password = typeof password === 'string' ? password.trim() : password;
        
        const user = await User.findById(req.userId);
        if (!user) { return res.status(404).json({ success: false, message: 'User not found.' }); }
        
        if (newEmail === user.email) {
            return res.status(400).json({ success: false, message: 'New email must be different from current email.' });
        }
        
        try {
            const isMatch = await comparePassword(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Password is incorrect.' });
            }
        } catch (compareError) {
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }
        
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== req.userId) {
            return res.status(400).json({ success: false, message: 'Email already in use.' });
        }
        
        user.email = newEmail;
        user.username = generateUsernameFromEmail(newEmail);
        user.updatedAt = new Date();
        user.isVerified = false;
        await user.save();
        
        res.json({
            success: true,
            message: 'Email updated successfully. Please verify your new email.',
            data: { email: user.email, username: user.username }
        });
    } catch (error) {
        console.error('Change email error:', error);
        res.status(500).json({ success: false, message: 'Error changing email.' });
    }
});

app.delete('/api/user/delete', authMiddleware, async (req, res) => {
    try {
        let { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required to delete account.' });
        }
        
        password = typeof password === 'string' ? password.trim() : password;
        
        const user = await User.findById(req.userId);
        if (!user) { return res.status(404).json({ success: false, message: 'User not found.' }); }
        
        try {
            const isMatch = await comparePassword(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Password is incorrect.' });
            }
        } catch (compareError) {
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }
        
        await History.deleteMany({ userId: req.userId });
        await VerificationCode.deleteMany({ email: user.email });
        await User.findByIdAndDelete(req.userId);
        
        clearTokenCookie(res);
        
        res.json({ success: true, message: 'Account deleted successfully.', deleted: true });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, message: 'Error deleting account. Please try again.' });
    }
});

// ============================================================
// HISTORY APIs
// ============================================================

app.get('/api/history', authMiddleware, async (req, res) => {
    try {
        const history = await History.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: 'Error fetching history.' });
    }
});

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
            const toDelete = await History.find({ userId: req.userId }).sort({ createdAt: 1 }).limit(count - 100);
            const ids = toDelete.map(doc => doc._id);
            await History.deleteMany({ _id: { $in: ids } });
        }
        
        res.status(201).json({ success: true, message: 'History saved.', data: historyEntry });
    } catch (error) {
        console.error('Save history error:', error);
        res.status(500).json({ success: false, message: 'Error saving history.' });
    }
});

app.delete('/api/history/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await History.findOneAndDelete({ _id: id, userId: req.userId });
        if (!result) { return res.status(404).json({ success: false, message: 'History item not found.' }); }
        res.json({ success: true, message: 'History item deleted.' });
    } catch (error) {
        console.error('Delete history error:', error);
        res.status(500).json({ success: false, message: 'Error deleting history item.' });
    }
});

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
// VERIFICATION APIs
// ============================================================

app.post('/api/verify/send-code', async (req, res) => {
    try {
        const { email, action } = req.body;
        if (!email || !action) {
            return res.status(400).json({ success: false, message: 'Email and action are required.' });
        }
        
        const normalizedEmail = normalizeEmail(email);
        
        if (action === 'reset') {
            const user = await User.findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(404).json({ success: false, message: 'Email not registered. Please create an account.' });
            }
        }
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        await VerificationCode.deleteMany({
            email: normalizedEmail,
            action: action,
            isUsed: false
        });
        
        const verification = new VerificationCode({
            email: normalizedEmail,
            code: code,
            action: action,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });
        await verification.save();
        
        await sendEmailViaBrevo(email, code, action);
        
        res.json({
            success: true,
            message: 'Verification code sent successfully.',
            code: code
        });
    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ success: false, message: 'Error sending verification code. Please try again.' });
    }
});

app.post('/api/verify/check-code', async (req, res) => {
    try {
        const { email, code, action } = req.body;
        if (!email || !code || !action) {
            return res.status(400).json({ success: false, message: 'Email, code and action are required.' });
        }
        
        const normalizedEmail = normalizeEmail(email);
        
        const verification = await VerificationCode.findOne({
            email: normalizedEmail,
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
        
        let token = null;
        let requiresSignIn = false;
        
        if (action === 'signup') {
            verification.isUsed = true;
            await verification.save();
            
            const user = await User.findOne({ email: normalizedEmail });
            if (user) {
                user.isVerified = true;
                await user.save();
                requiresSignIn = true;
            }
            
            return res.json({
                success: true,
                message: 'Email verified successfully. Please sign in.',
                requiresSignIn: true
            });
        }
        
        if (action === 'signin') {
            verification.isUsed = true;
            await verification.save();
            
            const user = await User.findOne({ email: normalizedEmail });
            if (user) {
                user.isVerified = true;
                user.lastLogin = new Date();
                await user.save();
                token = generateToken(user._id);
                setTokenCookie(res, token);
                
                return res.json({
                    success: true,
                    message: 'Sign in verified successfully.',
                    token: token,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email
                    }
                });
            }
            
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        if (action === 'reset') {
            verification.isUsed = true;
            await verification.save();
            
            return res.json({
                success: true,
                message: 'Code verified successfully. Please enter your new password.',
                verified: true,
                code: code
            });
        }
        
        if (action === 'email') {
            verification.isUsed = true;
            await verification.save();
            return res.json({
                success: true,
                message: 'Code verified successfully. Proceeding with email change.',
                verified: true
            });
        }
        
        if (action === 'password') {
            verification.isUsed = true;
            await verification.save();
            return res.json({
                success: true,
                message: 'Code verified successfully. Proceeding with password change.',
                verified: true
            });
        }
        
        if (action === 'delete') {
            verification.isUsed = true;
            await verification.save();
            return res.json({
                success: true,
                message: 'Code verified successfully. Proceeding with account deletion.',
                verified: true
            });
        }
        
        verification.isUsed = true;
        await verification.save();
        
        res.json({
            success: true,
            message: 'Code verified successfully.',
            token: token,
            requiresSignIn: requiresSignIn
        });
    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ success: false, message: 'Error verifying code. Please try again.' });
    }
});

// ============================================================
// SETTINGS APIs
// ============================================================

app.get('/api/settings', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('theme preferredSourceLanguage preferredTargetLanguage voiceSpeed voicePitch autoDetect notificationSettings');
        if (!user) { return res.status(404).json({ success: false, message: 'User not found.' }); }
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

app.put('/api/settings', authMiddleware, async (req, res) => {
    try {
        const { theme, preferredSourceLanguage, preferredTargetLanguage, voiceSpeed, voicePitch, autoDetect, notificationSettings } = req.body;
        const user = await User.findById(req.userId);
        if (!user) { return res.status(404).json({ success: false, message: 'User not found.' }); }
        
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
// RESET PASSWORD
// ============================================================
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        let { email, newPassword, verificationCode } = req.body;
        
        if (!email || !newPassword || !verificationCode) {
            return res.status(400).json({ success: false, message: 'Email, new password and verification code are required.' });
        }
        
        const normalizedEmail = normalizeEmail(email);
        newPassword = typeof newPassword === 'string' ? newPassword.trim() : newPassword;
        
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        const verification = await VerificationCode.findOne({
            email: normalizedEmail,
            code: verificationCode,
            action: 'reset',
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
            const isMatch = await comparePassword(newPassword, user.passwordHash);
            if (isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be different from your current password.'
                });
            }
        } catch (compareError) {
            return res.status(500).json({ success: false, message: 'Error verifying password. Please try again.' });
        }
        
        verification.isUsed = true;
        await verification.save();
        
        const passwordHash = await hashPassword(newPassword);
        user.passwordHash = passwordHash;
        user.updatedAt = new Date();
        await user.save();
        
        res.json({
            success: true,
            message: 'Password reset successfully. Please sign in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Error resetting password. Please try again.' });
    }
});

// ============================================================
// HEALTH CHECK
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
        status: 'running'
    });
});

// ============================================================
// START SERVER
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
