// ============================================================
// SERVER.JS - MAIN ENTRY POINT
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');

// Initialize express
const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

// Enable trust proxy (for rate limiting behind proxy)
app.set('trust proxy', 1);

// CORS
app.use(cors({
    origin: ['https://m-nella.github.io', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));

// JSON parser
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// ============================================================
// ROUTES
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'FreeTranslate API is running' });
});

// ============================================================
// 404 Handler for API routes - Return JSON instead of HTML
// ============================================================

app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// ============================================================
// DATABASE CONNECTION
// ============================================================

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });
