// ============================================================
// VERIFICATION CODE MODEL
// ============================================================

const mongoose = require('mongoose');

const VerificationCodeSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    code: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: ['signup', 'signin', 'reset', 'email', 'password', 'delete'],
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 5
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for automatic deletion after 15 minutes
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
