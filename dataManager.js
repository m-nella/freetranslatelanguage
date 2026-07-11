// ============================================================
// DATA MANAGER - localStorage Account System
// ============================================================

var DATA_MANAGER = {
    KEYS: {
        USERS: 'users',
        LOGGED_IN_USER: 'loggedInUser',
        VERIFICATION_CODES: 'verificationCodes',
        HISTORY: 'history'
    },

    init: function() {
        if (!localStorage.getItem(this.KEYS.USERS)) {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.VERIFICATION_CODES)) {
            localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.HISTORY)) {
            localStorage.setItem(this.KEYS.HISTORY, JSON.stringify({}));
        }
        this.cleanExpiredCodes();
    },

    loadUsers: function() {
        try {
            var data = localStorage.getItem(this.KEYS.USERS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            return [];
        }
    },

    saveUsers: function(users) {
        try {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
            return true;
        } catch (error) {
            return false;
        }
    },

    findUserByEmail: function(email) {
        var users = this.loadUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].email.toLowerCase() === email.toLowerCase()) {
                return users[i];
            }
        }
        return null;
    },

    findUserById: function(id) {
        var users = this.loadUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === id) {
                return users[i];
            }
        }
        return null;
    },

    getCurrentUser: function() {
        var userId = localStorage.getItem(this.KEYS.LOGGED_IN_USER);
        if (!userId) return null;
        return this.findUserById(userId);
    },

    createUser: function(email, password, username) {
        if (!email || !password || !username) {
            return { success: false, error: 'All fields are required.' };
        }

        var existing = this.findUserByEmail(email);
        if (existing) {
            return { success: false, error: 'Email already registered. Please sign in.' };
        }

        var id = this.generateId();
        var user = {
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
                notifications: true
            }
        };

        var users = this.loadUsers();
        users.push(user);
        this.saveUsers(users);

        return { success: true, user: user };
    },

    login: function(email, password) {
        var user = this.findUserByEmail(email);
        if (!user) {
            return { success: false, error: 'Account not found. Please create an account.' };
        }

        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'Incorrect password. Please try again.' };
        }

        user.lastLogin = new Date().toISOString();
        var users = this.loadUsers();
        var index = this.findUserIndexById(user.id, users);
        if (index !== -1) {
            users[index] = user;
            this.saveUsers(users);
        }

        localStorage.setItem(this.KEYS.LOGGED_IN_USER, user.id);
        return { success: true, user: user };
    },

    logout: function() {
        localStorage.removeItem(this.KEYS.LOGGED_IN_USER);
        return { success: true };
    },

    updateProfile: function(userId, updates) {
        var users = this.loadUsers();
        var index = this.findUserIndexById(userId, users);
        
        if (index === -1) {
            return { success: false, error: 'User not found.' };
        }

        if (updates.username) users[index].username = updates.username;
        if (updates.email) {
            var existing = this.findUserByEmail(updates.email);
            if (existing && existing.id !== userId) {
                return { success: false, error: 'Email already in use.' };
            }
            users[index].email = updates.email.toLowerCase();
            users[index].username = updates.email.split('@')[0];
        }
        if (updates.profilePhoto !== undefined) users[index].profilePhoto = updates.profilePhoto;
        if (updates.preferences) {
            users[index].preferences = this.extendObject(users[index].preferences, updates.preferences);
        }

        this.saveUsers(users);
        return { success: true, user: users[index] };
    },

    changePassword: function(userId, currentPassword, newPassword) {
        var user = this.findUserById(userId);
        if (!user) {
            return { success: false, error: 'User not found.' };
        }

        if (!this.verifyPassword(currentPassword, user.password)) {
            return { success: false, error: 'Current password is incorrect.' };
        }

        var validation = this.validatePasswordStrength(newPassword);
        if (!validation.valid) {
            return { success: false, error: validation.message };
        }

        var users = this.loadUsers();
        var index = this.findUserIndexById(userId, users);
        if (index !== -1) {
            users[index].password = this.hashPassword(newPassword);
            this.saveUsers(users);
            return { success: true };
        }

        return { success: false, error: 'Failed to update password.' };
    },

    deleteAccount: function(userId, password) {
        var user = this.findUserById(userId);
        if (!user) {
            return { success: false, error: 'User not found.' };
        }

        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'Incorrect password.' };
        }

        var users = this.loadUsers();
        var filtered = [];
        for (var i = 0; i < users.length; i++) {
            if (users[i].id !== userId) {
                filtered.push(users[i]);
            }
        }
        this.saveUsers(filtered);

        localStorage.removeItem(this.KEYS.LOGGED_IN_USER);
        this.clearUserHistory(user.email);

        return { success: true };
    },

    generateCode: function() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    storeVerificationCode: function(email, action) {
        var code = this.generateCode();
        var expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        var codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        var filtered = [];
        for (var i = 0; i < codes.length; i++) {
            if (!(codes[i].email === email && codes[i].action === action)) {
                filtered.push(codes[i]);
            }
        }
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

        this.sendEmailViaAPI(email, code, action);

        return { success: true, code: code };
    },

    sendEmailViaAPI: function(email, code, action) {
        var apiUrl = 'https://freetranslatelanguage.onrender.com/api/send-email';
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 201) {
                // Email sent successfully
            }
        };
        
        xhr.onerror = function() {
            // Network error - but code is stored locally
        };
        
        var data = JSON.stringify({
            email: email,
            code: code,
            action: action
        });
        
        try {
            xhr.send(data);
        } catch (e) {
            // Silent fail
        }
    },

    verifyCode: function(email, code, action) {
        var codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        
        var index = -1;
        for (var i = 0; i < codes.length; i++) {
            if (codes[i].email === email && codes[i].code === code && codes[i].action === action && !codes[i].isUsed) {
                index = i;
                break;
            }
        }

        if (index === -1) {
            return { success: false, error: 'Invalid or expired verification code.' };
        }

        var verification = codes[index];

        if (new Date(verification.expiresAt) < new Date()) {
            codes.splice(index, 1);
            localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(codes));
            return { success: false, error: 'Code has expired. Please request a new one.' };
        }

        if (verification.attempts >= 5) {
            codes.splice(index, 1);
            localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(codes));
            return { success: false, error: 'Too many failed attempts. Please request a new code.' };
        }

        verification.isUsed = true;
        codes[index] = verification;
        localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(codes));

        return { success: true, message: 'Code verified successfully!' };
    },

    resendCode: function(email, action) {
        var codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        var filtered = [];
        for (var i = 0; i < codes.length; i++) {
            if (!(codes[i].email === email && codes[i].action === action && !codes[i].isUsed)) {
                filtered.push(codes[i]);
            }
        }
        localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(filtered));
        return this.storeVerificationCode(email, action);
    },

    cleanExpiredCodes: function() {
        var codes = JSON.parse(localStorage.getItem(this.KEYS.VERIFICATION_CODES) || '[]');
        var now = new Date();
        var filtered = [];
        for (var i = 0; i < codes.length; i++) {
            if (new Date(codes[i].expiresAt) > now && !codes[i].isUsed) {
                filtered.push(codes[i]);
            }
        }
        localStorage.setItem(this.KEYS.VERIFICATION_CODES, JSON.stringify(filtered));
    },

    saveHistory: function(email, entry) {
        var history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        
        if (!history[email]) {
            history[email] = [];
        }

        entry.id = this.generateId();
        entry.createdAt = new Date().toISOString();
        history[email].unshift(entry);

        if (history[email].length > 100) {
            history[email] = history[email].slice(0, 100);
        }

        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        return { success: true };
    },

    getHistory: function(email) {
        var history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        return history[email] || [];
    },

    deleteHistoryItem: function(email, id) {
        var history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        
        if (!history[email]) {
            return { success: false, error: 'No history found.' };
        }

        var filtered = [];
        for (var i = 0; i < history[email].length; i++) {
            if (history[email][i].id !== id) {
                filtered.push(history[email][i]);
            }
        }
        history[email] = filtered;
        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        return { success: true };
    },

    clearUserHistory: function(email) {
        var history = JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '{}');
        delete history[email];
        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
        return { success: true };
    },

    clearHistory: function(email) {
        return this.clearUserHistory(email);
    },

    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    hashPassword: function(password) {
        var hash = '';
        for (var i = 0; i < password.length; i++) {
            var char = password.charCodeAt(i);
            hash += ((char << 5) - char).toString(36);
        }
        return hash + ':' + password.length;
    },

    verifyPassword: function(input, stored) {
        var inputHash = this.hashPassword(input);
        return inputHash === stored;
    },

    validatePasswordStrength: function(password) {
        var requirements = [];
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
            message: 'Password must contain: ' + requirements.join(', ')
        };
    },

    validateEmail: function(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    findUserIndexById: function(id, users) {
        if (!users) users = this.loadUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === id) {
                return i;
            }
        }
        return -1;
    },

    extendObject: function(obj1, obj2) {
        var result = {};
        for (var key in obj1) {
            if (obj1.hasOwnProperty(key)) {
                result[key] = obj1[key];
            }
        }
        for (var key in obj2) {
            if (obj2.hasOwnProperty(key)) {
                result[key] = obj2[key];
            }
        }
        return result;
    },

    startAutoCleanup: function() {
        setInterval(function() {
            DATA_MANAGER.cleanExpiredCodes();
        }, 60 * 1000);
    }
};

DATA_MANAGER.init();
DATA_MANAGER.startAutoCleanup();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DATA_MANAGER;
}
