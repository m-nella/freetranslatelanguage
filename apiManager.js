// ============================================================
// API MANAGER - Cloud Sync System
// Complete API Layer for FreeTranslateLanguage
// ============================================================

var API_MANAGER = {
    API_URL: 'https://freetranslatelanguage.onrender.com/api',
    
    // ============================================================
    // TOKEN MANAGEMENT - Now uses cookies primarily
    // ============================================================
    getToken: function() {
        // Try to get token from cookie first
        var token = this.getCookie('authToken');
        if (token) {
            // Also store in localStorage for fallback
            localStorage.setItem('authToken', token);
            return token;
        }
        // Fallback to localStorage
        return localStorage.getItem('authToken');
    },
    
    setToken: function(token) {
        if (token) {
            localStorage.setItem('authToken', token);
            // Also set cookie via server
            this.setCookie('authToken', token, 30);
        } else {
            localStorage.removeItem('authToken');
            this.deleteCookie('authToken');
        }
    },
    
    getCookie: function(name) {
        var value = '; ' + document.cookie;
        var parts = value.split('; ' + name + '=');
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    },
    
    setCookie: function(name, value, days) {
        var expires = '';
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
    },
    
    deleteCookie: function(name) {
        document.cookie = name + '=; Max-Age=-99999999; path=/';
    },
    
    getHeaders: function() {
        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        // Include token in Authorization header as fallback
        var token = this.getToken();
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    },
    
    // ============================================================
    // HELPER: Handle Response - Check for cookie setting
    // ============================================================
    handleResponse: function(response) {
        return response.json().then(function(data) {
            // Check if response set a cookie
            var setCookie = response.headers.get('Set-Cookie');
            if (setCookie && setCookie.includes('authToken')) {
                // Cookie was set by server, no need to do anything
            }
            if (!response.ok) {
                var error = new Error(data.message || 'Request failed');
                error.status = response.status;
                error.data = data;
                throw error;
            }
            return data;
        });
    },
    
    // ============================================================
    // AUTH APIs
    // ============================================================
    
    signup: function(email, password, username) {
        return fetch(this.API_URL + '/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: email, password: password, username: username })
        }).then(this.handleResponse);
    },
    
    signin: function(email, password) {
        return fetch(this.API_URL + '/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: email, password: password })
        }).then(this.handleResponse);
    },
    
    verifyPassword: function(password) {
        var token = this.getToken();
        if (!token) {
            return Promise.reject({ status: 401, message: 'No token' });
        }
        return fetch(this.API_URL + '/auth/verify-password', {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ password: password })
        }).then(this.handleResponse);
    },
    
    resetPassword: function(email, newPassword, verificationCode) {
        return fetch(this.API_URL + '/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: email, newPassword: newPassword, verificationCode: verificationCode })
        }).then(this.handleResponse);
    },
    
    logout: function() {
        var token = this.getToken();
        if (!token) {
            return Promise.resolve({ success: true });
        }
        return fetch(this.API_URL + '/auth/logout', {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include'
        }).then(this.handleResponse).catch(function() {
            return { success: true };
        });
    },
    
    getMe: function() {
        var token = this.getToken();
        if (!token) {
            return Promise.reject({ status: 401, message: 'No token' });
        }
        return fetch(this.API_URL + '/auth/me', {
            method: 'GET',
            headers: this.getHeaders(),
            credentials: 'include'
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // CHECK EMAIL EXISTS
    // ============================================================
    checkEmailExists: function(email) {
        return fetch(this.API_URL + '/auth/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: email })
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // USER APIs
    // ============================================================
    
    updateProfile: function(updates) {
        return fetch(this.API_URL + '/user/profile', {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify(updates)
        }).then(this.handleResponse);
    },
    
    changePassword: function(currentPassword, newPassword) {
        return fetch(this.API_URL + '/user/change-password', {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
        }).then(this.handleResponse);
    },
    
    changeEmail: function(newEmail, password) {
        return fetch(this.API_URL + '/user/change-email', {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ newEmail: newEmail, password: password })
        }).then(this.handleResponse);
    },
    
    deleteAccount: function(password) {
        return fetch(this.API_URL + '/user/delete', {
            method: 'DELETE',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ password: password })
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // HISTORY APIs
    // ============================================================
    
    getHistory: function() {
        return fetch(this.API_URL + '/history', {
            method: 'GET',
            headers: this.getHeaders(),
            credentials: 'include'
        }).then(this.handleResponse);
    },
    
    saveHistory: function(entry) {
        return fetch(this.API_URL + '/history', {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify(entry)
        }).then(this.handleResponse);
    },
    
    deleteHistoryItem: function(id) {
        return fetch(this.API_URL + '/history/' + id, {
            method: 'DELETE',
            headers: this.getHeaders(),
            credentials: 'include'
        }).then(this.handleResponse);
    },
    
    clearHistory: function() {
        return fetch(this.API_URL + '/history/clear', {
            method: 'DELETE',
            headers: this.getHeaders(),
            credentials: 'include'
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // SETTINGS APIs
    // ============================================================
    
    getSettings: function() {
        return fetch(this.API_URL + '/settings', {
            method: 'GET',
            headers: this.getHeaders(),
            credentials: 'include'
        }).then(this.handleResponse);
    },
    
    updateSettings: function(settings) {
        return fetch(this.API_URL + '/settings', {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify(settings)
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // VERIFICATION APIs
    // ============================================================
    
    sendVerificationCode: function(email, action) {
        return fetch(this.API_URL + '/verify/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: email, action: action })
        }).then(this.handleResponse);
    },
    
    verifyCode: function(email, code, action) {
        return fetch(this.API_URL + '/verify/check-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: email, code: code, action: action })
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // SYNC HELPERS
    // ============================================================
    
    syncUserData: function() {
        var self = this;
        return this.getMe().then(function(userData) {
            if (userData.success && userData.data) {
                localStorage.setItem('cachedUser', JSON.stringify(userData.data));
                return userData.data;
            }
            throw new Error('Failed to sync user data');
        }).catch(function(error) {
            if (error.status === 401) {
                self.setToken(null);
                localStorage.removeItem('cachedUser');
            }
            throw error;
        });
    },
    
    syncHistory: function() {
        return this.getHistory().then(function(historyData) {
            if (historyData.success && historyData.data) {
                localStorage.setItem('cachedHistory', JSON.stringify(historyData.data));
                return historyData.data;
            }
            throw new Error('Failed to sync history');
        }).catch(function(error) {
            if (error.status === 401) { throw error; }
            var cached = localStorage.getItem('cachedHistory');
            if (cached) {
                try { return JSON.parse(cached); } catch(e) { return []; }
            }
            throw error;
        });
    },
    
    fullSync: function() {
        var self = this;
        return this.syncUserData().then(function(user) {
            return self.syncHistory().then(function(history) {
                return { user: user, history: history };
            });
        });
    }
};
