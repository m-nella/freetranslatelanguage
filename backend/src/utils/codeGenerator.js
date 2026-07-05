// ============================================================
// VERIFICATION CODE GENERATOR
// ============================================================

const crypto = require('crypto');

class CodeGenerator {
    generateCode() {
        // Generate a random 6-digit code
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    getExpiryTime(minutes = 15) {
        return new Date(Date.now() + minutes * 60 * 1000);
    }

    isExpired(expiresAt) {
        return new Date() > new Date(expiresAt);
    }

    canResend(lastSentAt, cooldownMinutes = 1) {
        if (!lastSentAt) return true;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        return Date.now() - new Date(lastSentAt).getTime() > cooldownMs;
    }
}

module.exports = new CodeGenerator();
