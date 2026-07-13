// ============================================================
// API MANAGER - Cloud Sync System
// Complete API Layer for FreeTranslateLanguage
// ============================================================

var API_MANAGER = {
    // ============================================================
    // API CONFIGURATION
    // ============================================================
    API_URL: 'https://freetranslatelanguage.onrender.com/api',
    
    // ============================================================
    // TOKEN MANAGEMENT
    // ============================================================
    getToken: function() {
        return localStorage.getItem('authToken');
    },
    
    setToken: function(token) {
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    },
    
    getHeaders: function() {
        var headers = {
            'Content-Type': 'application/json'
        };
        var token = this.getToken();
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    },
    
    // ============================================================
    // HELPER: Handle Response - FIXED: Better error handling
    // ============================================================
    handleResponse: function(response) {
        return response.json().then(function(data) {
            if (!response.ok) {
                var error = new Error(data.message || 'Request failed');
                error.status = response.status;
                error.data = data;
                error.success = false;
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                username: username
            })
        }).then(this.handleResponse);
    },
    
    signin: function(email, password) {
        return fetch(this.API_URL + '/auth/signin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        }).then(this.handleResponse);
    },
    
    logout: function() {
        var token = this.getToken();
        if (!token) {
            return Promise.resolve({ success: true });
        }
        return fetch(this.API_URL + '/auth/logout', {
            method: 'POST',
            headers: this.getHeaders()
        }).then(this.handleResponse).catch(function() {
            return { success: true };
        });
    },
    
    getMe: function() {
        return fetch(this.API_URL + '/auth/me', {
            method: 'GET',
            headers: this.getHeaders()
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // CHECK EMAIL EXISTS - FIXED
    // ============================================================
    checkEmailExists: function(email) {
        return fetch(this.API_URL + '/auth/check-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // USER APIs - ALL WITH VERIFICATION CODE
    // ============================================================
    
    updateProfile: function(updates) {
        return fetch(this.API_URL + '/user/profile', {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(updates)
        }).then(this.handleResponse);
    },
    
    // FIXED: Added verificationCode parameter
    changePassword: function(currentPassword, newPassword, verificationCode) {
        var body = {
            currentPassword: currentPassword,
            newPassword: newPassword
        };
        if (verificationCode) {
            body.verificationCode = verificationCode;
        }
        return fetch(this.API_URL + '/user/change-password', {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        }).then(this.handleResponse);
    },
    
    // FIXED: Added verificationCode parameter
    changeEmail: function(newEmail, password, verificationCode) {
        var body = {
            newEmail: newEmail,
            password: password
        };
        if (verificationCode) {
            body.verificationCode = verificationCode;
        }
        return fetch(this.API_URL + '/user/change-email', {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        }).then(this.handleResponse);
    },
    
    // FIXED: Added verificationCode parameter
    deleteAccount: function(password, verificationCode) {
        var body = {
            password: password
        };
        if (verificationCode) {
            body.verificationCode = verificationCode;
        }
        return fetch(this.API_URL + '/user/delete', {
            method: 'DELETE',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // HISTORY APIs
    // ============================================================
    
    getHistory: function() {
        return fetch(this.API_URL + '/history', {
            method: 'GET',
            headers: this.getHeaders()
        }).then(this.handleResponse);
    },
    
    saveHistory: function(entry) {
        return fetch(this.API_URL + '/history', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(entry)
        }).then(this.handleResponse);
    },
    
    deleteHistoryItem: function(id) {
        return fetch(this.API_URL + '/history/' + id, {
            method: 'DELETE',
            headers: this.getHeaders()
        }).then(this.handleResponse);
    },
    
    clearHistory: function() {
        return fetch(this.API_URL + '/history/clear', {
            method: 'DELETE',
            headers: this.getHeaders()
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // SETTINGS APIs
    // ============================================================
    
    getSettings: function() {
        return fetch(this.API_URL + '/settings', {
            method: 'GET',
            headers: this.getHeaders()
        }).then(this.handleResponse);
    },
    
    updateSettings: function(settings) {
        return fetch(this.API_URL + '/settings', {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(settings)
        }).then(this.handleResponse);
    },
    
    // ============================================================
    // VERIFICATION APIs
    // ============================================================
    
    sendVerificationCode: function(email, action) {
        return fetch(this.API_URL + '/verify/send-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                action: action
            })
        }).then(this.handleResponse);
    },
    
    verifyCode: function(email, code, action) {
        return fetch(this.API_URL + '/verify/check-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                code: code,
                action: action
            })
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
            if (error.status === 401) {
                throw error;
            }
            var cached = localStorage.getItem('cachedHistory');
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch(e) {
                    return [];
                }
            }
            throw error;
        });
    },
    
    fullSync: function() {
        var self = this;
        return this.syncUserData().then(function(user) {
            return self.syncHistory().then(function(history) {
                return {
                    user: user,
                    history: history
                };
            });
        });
    }
};
