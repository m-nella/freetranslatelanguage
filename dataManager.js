// ============================================================
// DATA MANAGER - localStorage Account System
// ============================================================

const DATA_MANAGER = {
    // Storage keys
    KEYS: {
        USERS: 'users',
        LOGGED_IN_USER: 'loggedInUser',
        VERIFICATION_CODES: 'verificationCodes',
        HISTORY: 'history'
    },

    // Email API URL
    EMAIL_API_URL: 'https://freetranslatelanguage.onrender.com/api/send-email',

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        // Initialize users array if empty
        if (!localStorage.getItem(this.KEYS.USERS)) {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify([]));
        }
        
        // Initialize verification codes
        if (!localStorage.getItem(this.KEYS.VERIFICATION_CODES)) {
            localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify([]));
        }
        
        // Initialize history
        if (!localStorage.getItem(this.KEYS.HISTORY)) {
            localStorage.setItem(this.KEYS.HISTORY, JSON.stringify({}));
        }
        
        // Clean expired verification codes
        this.cleanExpiredCodes();
    },

    // ============================================================
    // USER MANAGEMENT
    // ============================================================
    
    // Load all users
    loadUsers() {
        try {
            const data = localStorage.getItem(this.KEYS.USERS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading users:', error);
            return [];
        }
    },

    // Save users
    saveUsers(users) {
        try {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    },

    // Find user by email
    findUserByEmail(email) {
        const users = this.loadUsers();
        return users.find(user => user.email.toLowerCase() === email.toLowerCase());
    },

    // Find user by ID
    findUserById(id) {
        const users = this.loadUsers();
        return users.find(user => user.id === id);
    },

    // Get currently logged in user
    getCurrentUser() {
        const userId = localStorage.getItem(this.KEYS.LOGGED_IN_USER);
        if (!userId) return null;
        return this.findUserById(userId);
    },

    // Check if user is logged in
    isLoggedIn() {
        const userId = localStorage.getItem(this.KEYS.LOGGED_IN_USER);
        if (!userId) return false;
        const user = this.findUserById(userId);
        return user !== null;
    },

    // ============================================================
    // ACCOUNT OPERATIONS
    // ============================================================

    // Create a new user account
    createUser(email, password, username) {
        // Validate
        if (!email || !password || !username) {
            return { success: false, error: 'All fields are required.' };
        }

        // Check if email already exists
        const existing = this.findUserByEmail(email);
        if (existing) {
            return { success: false, error: 'Email already registered. Please sign in.' };
        }

        // Generate unique ID
        const id = this.generateId();

        // Create user object
        const user = {
            id: id,
            username: username,
            email: email.toLowerCase(),
            password: this.hashPassword(password),
            profilePhoto: '',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true,
                converterSettings: {
                    defaultSourceLang: 'en',
                    defaultTargetLang: 'rw'
                }
            }
        };

        // Save user
        const users = this.loadUsers();
        users.push(user);
        this.saveUsers(users);

        return { success: true, user: user };
    },

    // Login user
    login(email, password) {
        const user = this.findUserByEmail(email);
        if (!user) {
            return { success: false, error: 'Account not found. Please create an account.' };
        }

        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'Incorrect password. Please try again.' };
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        const users = this.loadUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = user;
            this.saveUsers(users);
        }

        // Set logged in user
        localStorage.setItem(this.KEYS.LOGGED_IN_USER, user.id);

        return { success: true, user: user };
    },

    // Logout user
    logout() {
        localStorage.removeItem(this.KEYS.LOGGED_IN_USER);
        return { success: true };
    },

    // Update user profile
    updateProfile(userId, updates) {
        const users = this.loadUsers();
        const index = users.findIndex(u => u.id === userId);
        
        if (index === -1) {
            return { success: false, error: 'User not found.' };
        }

        // Update allowed fields
        if (updates.username) users[index].username = updates.username;
        if (updates.email) {
            // Check if email already in use by another user
            const existing = this.findUserByEmail(updates.email);
            if (existing && existing.id !== userId) {
                return { success: false, error: 'Email already in use.' };
            }
            users[index].email = updates.email.toLowerCase();
        }
        if (updates.profilePhoto !== undefined) users[index].profilePhoto = updates.profilePhoto;
        if (updates.preferences) {
            users[index].preferences = { ...users[index].preferences, ...updates.preferences };
        }

        this.saveUsers(users);
        return { success: true, user: users[index] };
    },

    // Change password
    changePassword(userId, currentPassword, newPassword) {
        const user = this.findUserById(userId);
        if (!user) {
            return { success: false, error: 'User not found.' };
        }

        // Verify current password
        if (!this.verifyPassword(currentPassword, user.password)) {
            return { success: false, error: 'Current password is incorrect.' };
        }

        // Validate new password
        const validation = this.validatePasswordStrength(newPassword);
        if (!validation.valid) {
            return { success: false, error: validation.message };
        }

        // Update password
        const users = this.loadUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].password = this.hashPassword(newPassword);
            this.saveUsers(users);
            return { success: true };
        }

        return { success: false, error: 'Failed to update password.' };
    },

    // Delete account
    deleteAccount(userId, password) {
        const user = this.findUserById(userId);
        if (!user) {
            return { success: false, error: 'User not found.' };
        }

        // Verify password
        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'Incorrect password.' };
        }

        // Remove user
        const users = this.loadUsers();
        const filtered = users.filter(u => u.id !== userId);
        this.saveUsers(filtered);

        // Clear session
        localStorage.removeItem(this.KEYS.LOGGED_IN_USER);
        
        // Clear user's history
        this.clearUserHistory(user.email);

        return { success: true };
    },

    // ============================================================
    // VERIFICATION CODE SYSTEM WITH EMAIL
    // ============================================================

    // Generate a verification code
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    // Send verification code via Render API
    async sendEmailViaAPI(email, code, action) {
        try {
            console.log(`📧 Sending email via Render API to: ${email}`);
            console.log(`🔑 Code: ${code}`);
            console.log(`📋 Action: ${action}`);

            const response = await fetch(this.EMAIL_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    code: code,
                    action: action
                })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log('✅ Email sent successfully via Render');
                return { success: true };
            } else {
                console.error('❌ Email API returned error:', data);
                return { success: false, error: data.error || 'Email sending failed' };
            }
        } catch (error) {
            console.error('❌ Email API error:', error);
            return { success: false, error: error.message };
        }
    },

    // Store verification code and send email
    async storeVerificationCode(email, action) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        console.log('📦 Storing verification code for:', email);
        console.log('🔑 Code:', code);
        console.log('📋 Action:', action);

        // Store in localStorage
        const codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        const filtered = codes.filter(c => !(c.email === email && c.action === action));
        filtered.push({
            email: email,
            code: code,
            action: action,
            expiresAt: expiresAt,
            isUsed: false,
            attempts: 0,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(filtered));

        // Send email via Render API
        try {
            const emailResult = await this.sendEmailViaAPI(email, code, action);
            
            if (emailResult.success) {
                console.log('📧 Verification code sent to:', email);
                return { success: true, code: code };
            } else {
                // Email failed but code is stored locally
                console.warn('⚠️ Email failed but code is stored locally:', emailResult.error);
                return { success: true, code: code, warning: 'Email sending failed, check console for code' };
            }
        } catch (error) {
            console.error('❌ Email send error:', error);
            return { success: true, code: code, warning: 'Email failed' };
        }
    },

    // Verify code
    verifyCode(email, code, action) {
        const codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        
        // Find the code
        const index = codes.findIndex(c => 
            c.email === email && 
            c.code === code && 
            c.action === action && 
            !c.isUsed
        );

        if (index === -1) {
            return { success: false, error: 'Invalid or expired verification code.' };
        }

        const verification = codes[index];

        // Check if expired
        if (new Date(verification.expiresAt) < new Date()) {
            // Remove expired code
            codes.splice(index, 1);
            localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(codes));
            return { success: false, error: 'Code has expired. Please request a new one.' };
        }

        // Check attempts
        if (verification.attempts >= 5) {
            codes.splice(index, 1);
            localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(codes));
            return { success: false, error: 'Too many failed attempts. Please request a new code.' };
        }

        // Mark as used
        verification.isUsed = true;
        codes[index] = verification;
        localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(codes));

        return { success: true, message: 'Code verified successfully!' };
    },

    // Resend code (delete old, create new)
    async resendCode(email, action) {
        // Remove old codes
        const codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        const filtered = codes.filter(c => !(c.email === email && c.action === action && !c.isUsed));
        localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(filtered));

        // Generate new code with email
        return await this.storeVerificationCode(email, action);
    },

    // Clean expired codes
    cleanExpiredCodes() {
        const codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        const now = new Date();
        const filtered = codes.filter(c => new Date(c.expiresAt) > now && !c.isUsed);
        localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(filtered));
    },

    // ============================================================
    // HISTORY MANAGEMENT
    // ============================================================

    // Save history entry
    saveHistory(email, entry) {
        const history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        
        if (!history[email]) {
            history[email] = [];
        }

        // Add entry with ID
        entry.id = this.generateId();
        entry.createdAt = new Date().toISOString();
        history[email].unshift(entry); // Add to beginning

        // Keep only last 100 entries per user
        if (history[email].length > 100) {
            history[email] = history[email].slice(0, 100);
        }

        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        return { success: true };
    },

    // Get user's history
    getHistory(email) {
        const history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        return history[email] || [];
    },

    // Delete single history entry
    deleteHistoryItem(email, id) {
        const history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        
        if (!history[email]) {
            return { success: false, error: 'No history found.' };
        }

        history[email] = history[email].filter(item => item.id !== id);
        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        return { success: true };
    },

    // Delete all history for a user
    clearUserHistory(email) {
        const history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        delete history[email];
        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        return { success: true };
    },

    // Delete all history for a user (including current session)
    clearHistory(email) {
        return this.clearUserHistory(email);
    },

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // Simple password hashing (for localStorage only - NOT SECURE for production)
    hashPassword(password) {
        let hash = '';
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash += ((char << 5) - char).toString(36);
        }
        return hash + ':' + password.length;
    },

    // Verify password
    verifyPassword(input, stored) {
        const inputHash = this.hashPassword(input);
        return inputHash === stored;
    },

    // Validate password strength
    validatePasswordStrength(password) {
        const requirements = [];
        if (password.length < 8) requirements.push('at least 8 characters');
        if (!/[A-Z]/.test(password)) requirements.push('an uppercase letter');
        if (!/[a-z]/.test(password)) requirements.push('a lowercase letter');
        if (!/[0-9]/.test(password)) requirements.push('a number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) requirements.push('a special character');
        
        if (requirements.length === 0) {
            return { valid: true };
        }
        return { 
            valid: false, 
            message: `Password must contain: ${requirements.join(', ')}` 
        };
    },

    // Validate email format
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate username
    validateUsername(username) {
        if (username.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters.' };
        }
        if (username.length > 30) {
            return { valid: false, message: 'Username must be less than 30 characters.' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, message: 'Username can only contain letters, numbers, and underscores.' };
        }
        return { valid: true };
    },

    // ============================================================
    // AUTO-CLEANUP
    // ============================================================

    // Run periodic cleanup
    startAutoCleanup() {
        setInterval(() => {
            this.cleanExpiredCodes();
        }, 60 * 1000); // Run every minute
    }
};

// Initialize on load
DATA_MANAGER.init();
DATA_MANAGER.startAutoCleanup();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA_MANAGER;
}
