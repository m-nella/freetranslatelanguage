// ============================================================
// FREE TRANSLATE LANGUAGE - Complete Application
// COMPLETELY REWRITTEN FOR ALL DEVICES & BROWSERS
// ES5 Compatible - Works on Chrome 74+
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // STATE
    // ============================================================
    var currentMode = 'login';
    var currentUser = null;
    var isLoggedIn = false;
    var pendingEmail = '';
    var pendingAction = '';
    var pendingCallback = null;
    var isVerifying = false;
    var verificationDone = false;
    var pendingResetUser = null;
    var isRecording = false;
    var isTranslating = false;
    var translateQueue = false;
    var currentSpeech = null;
    var recognition = null;
    var profileMenu = null;
    var historyModal = null;
    var translateFromContainer = null;
    var translateFromBtn = null;
    var notificationTimeout = null;
    var finalTranscript = '';
    var interimTranscript = '';
    var recordingTimeout = null;
    var currentRecordingLang = 'en';
    var detectedLanguageCache = '';
    var lastTranslationText = '';
    var isDetectingLanguage = false;
    var forceTranslationWithDetectedLang = false;
    var pendingDetectedLang = '';
    var lastDetectedText = '';
    var lastDetectedLangResult = '';
    var isDetectionRunning = false;

    // ============================================================
    // LANGUAGE LIST
    // ============================================================
    var LANGUAGES = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'rw', name: 'Kinyarwanda' },
        { code: 'rn', name: 'Kirundi' },
        { code: 'sw', name: 'Swahili' },
        { code: 'zu', name: 'Zulu' },
        { code: 'yo', name: 'Yoruba' },
        { code: 'ig', name: 'Igbo' },
        { code: 'ha', name: 'Hausa' },
        { code: 'ak', name: 'Akan' },
        { code: 'am', name: 'Amharic' },
        { code: 'so', name: 'Somali' },
        { code: 'mg', name: 'Malagasy' },
        { code: 'xh', name: 'Xhosa' },
        { code: 'af', name: 'Afrikaans' },
        { code: 'wo', name: 'Wolof' },
        { code: 'ki', name: 'Kikuyu' },
        { code: 'lg', name: 'Luganda' },
        { code: 'ny', name: 'Chichewa' }
    ];

    // ============================================================
    // DOM HELPERS
    // ============================================================
    function $(id) {
        return document.getElementById(id);
    }

    function bindClick(el, handler) {
        if (!el) return;
        el.addEventListener('click', handler);
        el.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handler(e);
        }, { passive: false });
    }

    function createElement(tag, className, html) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (html) el.innerHTML = html;
        return el;
    }

    function hasClass(el, className) {
        if (!el) return false;
        return (' ' + el.className + ' ').indexOf(' ' + className + ' ') > -1;
    }

    function addClass(el, className) {
        if (!el) return;
        if (!hasClass(el, className)) {
            el.className = el.className + ' ' + className;
        }
    }

    function removeClass(el, className) {
        if (!el) return;
        var classes = el.className.split(' ');
        var newClasses = [];
        for (var i = 0; i < classes.length; i++) {
            if (classes[i] !== className) {
                newClasses.push(classes[i]);
            }
        }
        el.className = newClasses.join(' ');
    }

    // ============================================================
    // LANGUAGE NAMES
    // ============================================================
    function getLanguageName(code) {
        var map = {
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
            'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
            'rw': 'Kinyarwanda', 'rn': 'Kirundi', 'sw': 'Swahili', 'zu': 'Zulu',
            'yo': 'Yoruba', 'ig': 'Igbo', 'ha': 'Hausa', 'ak': 'Akan',
            'am': 'Amharic', 'so': 'Somali', 'mg': 'Malagasy', 'xh': 'Xhosa',
            'af': 'Afrikaans', 'wo': 'Wolof', 'ki': 'Kikuyu', 'lg': 'Luganda',
            'ny': 'Chichewa'
        };
        return map[code] || code.toUpperCase();
    }

    // ============================================================
    // POPULATE LANGUAGES
    // ============================================================
    function populateLanguageDropdowns() {
        var sourceLang = $('sourceLang');
        var targetLang = $('targetLang');
        
        if (!sourceLang || !targetLang) {
            setTimeout(populateLanguageDropdowns, 200);
            return;
        }
        
        sourceLang.innerHTML = '';
        targetLang.innerHTML = '';
        
        for (var i = 0; i < LANGUAGES.length; i++) {
            var lang = LANGUAGES[i];
            var opt1 = document.createElement('option');
            opt1.value = lang.code;
            opt1.textContent = lang.name;
            sourceLang.appendChild(opt1);
            
            var opt2 = document.createElement('option');
            opt2.value = lang.code;
            opt2.textContent = lang.name;
            targetLang.appendChild(opt2);
        }
        
        sourceLang.value = 'rw';
        targetLang.value = 'en';
    }

    // ============================================================
    // NOTIFICATION SYSTEM
    // ============================================================
    function showNotification(message, type, duration) {
        type = type || 'info';
        duration = duration || 5000;
        
        var container = $('notificationContainer');
        if (!container) return;
        
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
        }
        
        var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        var notification = createElement('div', 'notification ' + type);
        notification.innerHTML = 
            '<span class="notif-icon">' + (icons[type] || 'ℹ️') + '</span>' +
            '<span class="notif-content">' + message + '</span>' +
            '<button class="notif-close">&times;</button>';
        
        container.innerHTML = '';
        container.appendChild(notification);
        
        var closeBtn = notification.querySelector('.notif-close');
        bindClick(closeBtn, function(e) {
            e.stopPropagation();
            notification.remove();
        });
        
        notificationTimeout = setTimeout(function() {
            if (notification.parentNode) {
                notification.remove();
            }
            notificationTimeout = null;
        }, duration);
    }

    // ============================================================
    // SPEECH FUNCTIONS
    // ============================================================
    function speakText(text, lang) {
        try {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            if (!text || text.trim() === '') {
                return;
            }
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang || 'en';
            currentSpeech = utterance;
            window.speechSynthesis.speak(utterance);
        } catch (e) {}
    }

    function stopSpeech() {
        try {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                currentSpeech = null;
            }
        } catch (e) {}
    }

    // ============================================================
    // PASSWORD TOGGLE
    // ============================================================
    function createPasswordField(id, placeholder) {
        var wrapper = document.createElement('div');
        wrapper.className = 'password-field';
        
        var input = document.createElement('input');
        input.type = 'password';
        input.id = id;
        input.placeholder = placeholder;
        input.required = true;
        
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'password-toggle';
        toggle.innerHTML = '<i class="fas fa-eye"></i>';
        toggle.setAttribute('aria-label', 'Show password');
        
        bindClick(toggle, function(e) {
            e.preventDefault();
            e.stopPropagation();
            var isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        });
        
        wrapper.appendChild(input);
        wrapper.appendChild(toggle);
        return wrapper;
    }

    function bindPasswordToggles(container) {
        if (!container) return;
        var fields = container.querySelectorAll('.password-field');
        for (var i = 0; i < fields.length; i++) {
            var wrapper = fields[i];
            var input = wrapper.querySelector('input');
            var toggle = wrapper.querySelector('.password-toggle');
            if (input && toggle) {
                var newToggle = toggle.cloneNode(true);
                toggle.parentNode.replaceChild(newToggle, toggle);
                (function(inp, tog) {
                    bindClick(tog, function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var isPassword = inp.type === 'password';
                        inp.type = isPassword ? 'text' : 'password';
                        this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
                    });
                })(input, newToggle);
            }
        }
    }

    // ============================================================
    // VERIFICATION CODE SYSTEM
    // ============================================================
    function sendVerificationCode(email, action) {
        return new Promise(function(resolve, reject) {
            try {
                var result = DATA_MANAGER.storeVerificationCode(email, action);
                if (result.success) {
                    showNotification('📧 Verification code sent! Check your email and spam folder.', 'success');
                    resolve({ success: true, code: result.code });
                } else {
                    showNotification('⚠️ Error sending code. Please try again.', 'error');
                    resolve({ success: false });
                }
            } catch (error) {
                showNotification('⚠️ Error sending code. Please try again.', 'error');
                resolve({ success: false });
            }
        });
    }

    function verifyCode(email, code) {
        isVerifying = true;
        return new Promise(function(resolve, reject) {
            try {
                var result = DATA_MANAGER.verifyCode(email, code, pendingAction);
                if (result.success) {
                    resolve({ success: true, token: 'local_' + email });
                } else {
                    resolve({ success: false, error: result.error || 'Invalid code.' });
                }
            } catch (error) {
                resolve({ success: false, error: 'Verification error.' });
            } finally {
                isVerifying = false;
            }
        });
    }

    // ============================================================
    // CUSTOM PASSWORD PROMPT MODAL
    // ============================================================
    function showPasswordPromptModal(title, message, placeholder) {
        placeholder = placeholder || 'Enter your password';
        return new Promise(function(resolve) {
            var modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.style.zIndex = '10001';
            modal.innerHTML = 
                '<div class="modal-content prompt-content" style="max-width: 420px;">' +
                    '<h2 style="text-align: center; margin-bottom: 12px;">' + title + '</h2>' +
                    '<p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">' + message + '</p>' +
                    '<div class="settings-field">' +
                        '<label>Password</label>' +
                        createPasswordField('promptPasswordInput', placeholder).outerHTML +
                    '</div>' +
                    '<div class="confirmation-buttons" style="margin-top: 16px;">' +
                        '<button class="auth-submit-btn cancel-btn" id="promptCancel" style="flex:1;">Cancel</button>' +
                        '<button class="auth-submit-btn delete-btn" id="promptConfirm" style="flex:1;">Confirm</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
            
            bindPasswordToggles(modal);
            
            var input = $('promptPasswordInput');
            var confirmBtn = modal.querySelector('#promptConfirm');
            var cancelBtn = modal.querySelector('#promptCancel');
            
            if (input) input.focus();
            
            bindClick(confirmBtn, function() {
                var value = input ? input.value : '';
                modal.remove();
                resolve(value);
            });
            
            bindClick(cancelBtn, function() {
                modal.remove();
                resolve(null);
            });
            
            if (input) {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        var value = input.value;
                        modal.remove();
                        resolve(value);
                    }
                    if (e.key === 'Escape') {
                        modal.remove();
                        resolve(null);
                    }
                });
            }
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            });
        });
    }

    // ============================================================
    // CONFIRMATION MODAL - FIXED: Better button spacing
    // ============================================================
    function showConfirmationModal(title, message, confirmText, cancelText) {
        confirmText = confirmText || 'Confirm';
        cancelText = cancelText || 'Cancel';
        return new Promise(function(resolve) {
            var modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = 
                '<div class="modal-content confirmation-content">' +
                    '<h2>' + title + '</h2>' +
                    '<p>' + message + '</p>' +
                    '<div class="confirmation-buttons" style="display:flex; gap:16px; justify-content:center; margin-top:16px; width:100%;">' +
                        '<button class="auth-submit-btn cancel-btn" id="cancelConfirm" style="flex:1; max-width:160px; min-height:44px;">' + cancelText + '</button>' +
                        '<button class="auth-submit-btn delete-btn" id="confirmAction" style="flex:1; max-width:160px; min-height:44px;">' + confirmText + '</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
            
            bindClick(modal.querySelector('#cancelConfirm'), function() {
                modal.remove();
                resolve(false);
            });
            
            bindClick(modal.querySelector('#confirmAction'), function() {
                modal.remove();
                resolve(true);
            });
        });
    }

    // ============================================================
    // PASSWORD RESET MODAL
    // ============================================================
    function showPasswordResetModal() {
        return new Promise(function(resolve) {
            var modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = 
                '<div class="modal-content prompt-content" style="max-width: 440px;">' +
                    '<h2 style="text-align: center; margin-bottom: 12px;">Reset Password</h2>' +
                    '<p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">Enter your new password below.</p>' +
                    '<div class="settings-field">' +
                        '<label>New Password (min 8 chars)</label>' +
                        createPasswordField('resetNewPassword', 'Enter new password').outerHTML +
                    '</div>' +
                    '<div class="settings-field">' +
                        '<label>Confirm New Password</label>' +
                        createPasswordField('resetConfirmPassword', 'Confirm new password').outerHTML +
                    '</div>' +
                    '<div class="confirmation-buttons" style="display:flex; gap:16px; justify-content:center; margin-top:16px; width:100%;">' +
                        '<button class="auth-submit-btn cancel-btn" id="resetCancel" style="flex:1; max-width:160px; min-height:44px;">Cancel</button>' +
                        '<button class="auth-submit-btn" id="resetConfirm" style="flex:1; max-width:160px; min-height:44px; background: var(--accent);">Reset Password</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
            
            bindPasswordToggles(modal);
            
            var newPassword = $('resetNewPassword');
            var confirmPassword = $('resetConfirmPassword');
            var confirmBtn = modal.querySelector('#resetConfirm');
            var cancelBtn = modal.querySelector('#resetCancel');
            
            bindClick(confirmBtn, function() {
                var pass1 = newPassword.value;
                var pass2 = confirmPassword.value;
                
                if (!pass1 || pass1.length < 8) {
                    showNotification('Password must be at least 8 characters.', 'error');
                    return;
                }
                if (pass1 !== pass2) {
                    showNotification('Passwords do not match!', 'error');
                    return;
                }
                var validation = DATA_MANAGER.validatePasswordStrength(pass1);
                if (!validation.valid) {
                    showNotification(validation.message, 'error');
                    return;
                }
                modal.remove();
                resolve(pass1);
            });
            
            bindClick(cancelBtn, function() {
                modal.remove();
                resolve(null);
            });
        });
    }

    // ============================================================
    // VERIFICATION MODAL
    // ============================================================
    function openVerificationModal(email, action, callback) {
        pendingEmail = email;
        pendingAction = action;
        pendingCallback = callback;
        isVerifying = false;
        verificationDone = false;
        
        var existing = $('verificationModal');
        if (existing) existing.remove();
        
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'verificationModal';
        modal.style.display = 'flex';
        var titleMap = {
            'signup': 'Verify Your Email',
            'signin': 'Verify Sign In',
            'delete': 'Confirm Delete Account',
            'email': 'Verify Email Change',
            'password': 'Verify Password Change',
            'reset': 'Reset Password'
        };
        var title = titleMap[action] || 'Verification Required';
        modal.innerHTML = 
            '<div class="modal-content verification-content">' +
                '<span class="close-modal close-verification">&times;</span>' +
                '<h2>' + title + '</h2>' +
                '<p class="verification-desc">Enter the 6-digit verification code sent to your email. Also check SPAM/JUNK folder.</p>' +
                '<form id="verificationForm">' +
                    '<input type="text" id="verificationCode" placeholder="Enter 6-digit code" maxlength="6" autocomplete="off" required>' +
                    '<button type="submit" class="auth-submit-btn" id="verifySubmitBtn" style="width:100%; min-height:44px; margin-top:10px;">Verify</button>' +
                '</form>' +
                '<p class="auth-switch">Didn\'t receive code? <a href="#" id="resendCodeBtn">Resend Code</a></p>' +
            '</div>';
        document.body.appendChild(modal);
        
        var codeInput = $('verificationCode');
        if (codeInput) {
            codeInput.style.width = '100%';
            codeInput.style.textAlign = 'center';
            codeInput.style.fontSize = '1.3rem';
            codeInput.style.letterSpacing = '6px';
            codeInput.style.padding = '12px 14px';
            codeInput.style.fontWeight = '600';
            codeInput.style.background = 'var(--bg-input)';
            codeInput.style.border = '2px solid var(--border-color)';
            codeInput.style.borderRadius = 'var(--radius-sm)';
            codeInput.style.color = 'var(--text-primary)';
            codeInput.style.fontFamily = 'var(--font)';
            codeInput.style.transition = 'var(--transition)';
            codeInput.style.minHeight = '48px';
        }
        
        var closeBtn = modal.querySelector('.close-verification');
        bindClick(closeBtn, function() {
            modal.remove();
            isVerifying = false;
            verificationDone = false;
        });
        
        var form = $('verificationForm');
        var submitBtn = $('verifySubmitBtn');
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (verificationDone || isVerifying) return;
            
            var code = codeInput.value.trim();
            if (!code || code.length !== 6) {
                showNotification('Please enter a valid 6-digit code.', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';
            isVerifying = true;
            
            verifyCode(email, code).then(function(result) {
                if (result.success) {
                    verificationDone = true;
                    submitBtn.textContent = '✓ Verified';
                    submitBtn.style.backgroundColor = '#4CAF50';
                    codeInput.disabled = true;
                    showNotification('Verification successful!', 'success');
                    if (result.token) {
                        localStorage.setItem('authToken', result.token);
                    }
                    setTimeout(function() {
                        modal.remove();
                        if (typeof pendingCallback === 'function') {
                            pendingCallback(result.token);
                        }
                        checkAuthStatus();
                        isVerifying = false;
                        verificationDone = false;
                    }, 800);
                } else {
                    showNotification(result.error || 'Invalid code.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Verify';
                    submitBtn.style.backgroundColor = '';
                    isVerifying = false;
                    codeInput.value = '';
                    codeInput.focus();
                }
            }).catch(function() {
                showNotification('Verification error.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify';
                submitBtn.style.backgroundColor = '';
                isVerifying = false;
            });
        });
        
        var resendBtn = $('resendCodeBtn');
        bindClick(resendBtn, function(e) {
            e.preventDefault();
            verificationDone = false;
            isVerifying = false;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify';
            submitBtn.style.backgroundColor = '';
            codeInput.disabled = false;
            codeInput.value = '';
            codeInput.focus();
            sendVerificationCode(email, pendingAction).then(function(result) {
                if (result.success) {
                    showNotification('New code sent! Check your email.', 'success');
                }
            });
        });
    }

    // ============================================================
    // AUTH STATE
    // ============================================================
    function checkAuthStatus() {
        var token = localStorage.getItem('authToken');
        var authBtn = $('authBtn');
        var historyNavBtn = $('historyNavBtn');
        
        if (!token) {
            isLoggedIn = false;
            currentUser = null;
            if (authBtn) {
                authBtn.innerHTML = '<i class="fas fa-user"></i> <span>Sign In</span>';
                removeClass(authBtn, 'logged-in');
            }
            if (historyNavBtn) {
                historyNavBtn.style.display = 'none';
            }
            return;
        }
        
        var user = DATA_MANAGER.getCurrentUser();
        if (user) {
            currentUser = {
                id: user.id,
                email: user.email,
                username: user.username,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            };
            isLoggedIn = true;
            if (authBtn) {
                authBtn.innerHTML = '<i class="fas fa-user-circle"></i> <span>' + currentUser.username + '</span>';
                addClass(authBtn, 'logged-in');
            }
            if (historyNavBtn) {
                historyNavBtn.style.display = 'flex';
                historyNavBtn.innerHTML = '<i class="fas fa-history"></i> <span>History</span>';
            }
        } else {
            localStorage.removeItem('authToken');
            isLoggedIn = false;
            currentUser = null;
            if (authBtn) {
                authBtn.innerHTML = '<i class="fas fa-user"></i> <span>Sign In</span>';
                removeClass(authBtn, 'logged-in');
            }
            if (historyNavBtn) {
                historyNavBtn.style.display = 'none';
            }
        }
    }

    // ============================================================
    // OPEN AUTH MODAL
    // ============================================================
    function openModal(mode) {
        currentMode = mode;
        var authModal = $('authModal');
        var authFields = $('authFields');
        var forgotPasswordLink = $('forgotPasswordLink');
        var authModalTitle = $('authModalTitle');
        var authSubmitBtn = $('authSubmitBtn');
        var authSwitchText = $('authSwitchText');
        var forgotPasswordBtn = $('forgotPasswordBtn');
        
        if (!authModal) return;
        
        authModal.style.display = 'flex';
        authFields.innerHTML = '';
        forgotPasswordLink.style.display = 'none';
        
        if (mode === 'login') {
            authModalTitle.textContent = 'Sign In';
            authSubmitBtn.textContent = 'Sign In';
            authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Create Account</a>';
            
            var email = document.createElement('input');
            email.type = 'email';
            email.id = 'authEmail';
            email.placeholder = 'Email address';
            email.required = true;
            email.style.marginBottom = '12px';
            authFields.appendChild(email);
            
            var passwordWrapper = createPasswordField('authPassword', 'Password');
            passwordWrapper.style.marginBottom = '8px';
            authFields.appendChild(passwordWrapper);
            bindPasswordToggles(authModal);
            
            forgotPasswordLink.style.display = 'block';
            bindClick(forgotPasswordBtn, function(e) {
                e.preventDefault();
                openModal('reset');
            });
            
        } else if (mode === 'reset') {
            authModalTitle.textContent = 'Reset Password';
            authSubmitBtn.textContent = 'Send Reset Code';
            authSwitchText.innerHTML = 'Remember password? <a href="#" id="authSwitchLink">Sign In</a>';
            
            var email = document.createElement('input');
            email.type = 'email';
            email.id = 'authEmail';
            email.placeholder = 'Email address';
            email.required = true;
            authFields.appendChild(email);
            forgotPasswordLink.style.display = 'none';
            
        } else if (mode === 'signup') {
            authModalTitle.textContent = 'Create Account';
            authSubmitBtn.textContent = 'Create Account';
            authSwitchText.innerHTML = 'Already have an account? <a href="#" id="authSwitchLink">Sign In</a>';
            
            var email = document.createElement('input');
            email.type = 'email';
            email.id = 'authEmail';
            email.placeholder = 'Email address';
            email.required = true;
            email.style.marginBottom = '12px';
            authFields.appendChild(email);
            
            var password = createPasswordField('authPassword', 'Password (min 8 chars)');
            password.style.marginBottom = '12px';
            authFields.appendChild(password);
            
            var confirm = createPasswordField('authConfirmPassword', 'Confirm password');
            confirm.style.marginBottom = '8px';
            authFields.appendChild(confirm);
            bindPasswordToggles(authModal);
            
            var hint = document.createElement('small');
            hint.textContent = 'Password: 8+ chars, uppercase, lowercase, number, special';
            hint.style.marginTop = '4px';
            authFields.appendChild(hint);
            forgotPasswordLink.style.display = 'none';
        }
        
        var switchLink = $('authSwitchLink');
        if (switchLink) {
            bindClick(switchLink, function(e) {
                e.preventDefault();
                if (mode === 'reset') {
                    openModal('login');
                } else if (mode === 'login') {
                    openModal('signup');
                } else {
                    openModal('login');
                }
            });
        }
    }

    // ============================================================
    // AUTH BUTTON
    // ============================================================
    function setupAuthButton() {
        var authBtn = $('authBtn');
        if (!authBtn) return;
        
        bindClick(authBtn, function() {
            if (isLoggedIn) {
                toggleProfileMenu();
            } else {
                openModal('login');
            }
        });
    }

    // ============================================================
    // CLOSE MODAL
    // ============================================================
    function setupCloseModal() {
        var closeAuthModal = $('closeAuthModal');
        var authModal = $('authModal');
        
        if (closeAuthModal) {
            bindClick(closeAuthModal, function() {
                if (authModal) authModal.style.display = 'none';
            });
        }
    }

    // ============================================================
    // AUTH FORM SUBMIT
    // ============================================================
    function setupAuthForm() {
        var authForm = $('authForm');
        var authSubmitBtn = $('authSubmitBtn');
        var authModal = $('authModal');
        
        if (!authForm) return;
        
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            var email = $('authEmail').value;
            var password = $('authPassword') ? $('authPassword').value : '';
            
            if (currentMode === 'login') {
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Signing in...';
                var result = DATA_MANAGER.login(email, password);
                if (!result.success) {
                    if (result.error === 'Account not found. Please create an account.') {
                        showNotification('Account not found. Redirecting...', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                        setTimeout(function() { openModal('signup'); }, 1500);
                        return;
                    } else {
                        showNotification(result.error, 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                        return;
                    }
                }
                sendVerificationCode(email, 'signin').then(function(codeResult) {
                    if (!codeResult.success) {
                        showNotification('Error sending code.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                        return;
                    }
                    if (authModal) authModal.style.display = 'none';
                    openVerificationModal(email, 'signin', function(token) {
                        showNotification('Signed in!', 'success');
                        checkAuthStatus();
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                    });
                });
            } else if (currentMode === 'reset') {
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Sending reset code...';
                var userExists = DATA_MANAGER.findUserByEmail(email);
                if (!userExists) {
                    showNotification('No account found.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    return;
                }
                sendVerificationCode(email, 'reset').then(function(codeResult) {
                    if (!codeResult.success) {
                        showNotification('Error sending code.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        return;
                    }
                    pendingResetUser = userExists;
                    if (authModal) authModal.style.display = 'none';
                    openVerificationModal(email, 'reset', function(token) {
                        showPasswordResetModal().then(function(newPassword) {
                            if (newPassword === null) {
                                showNotification('Cancelled.', 'info');
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Send Reset Code';
                                pendingResetUser = null;
                                return;
                            }
                            if (DATA_MANAGER.verifyPassword(newPassword, pendingResetUser.password)) {
                                showNotification('Must be different from current.', 'error');
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Send Reset Code';
                                pendingResetUser = null;
                                return;
                            }
                            var users = DATA_MANAGER.loadUsers();
                            var index = -1;
                            for (var i = 0; i < users.length; i++) {
                                if (users[i].id === pendingResetUser.id) {
                                    index = i;
                                    break;
                                }
                            }
                            if (index === -1) {
                                showNotification('User not found.', 'error');
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Send Reset Code';
                                pendingResetUser = null;
                                return;
                            }
                            users[index].password = DATA_MANAGER.hashPassword(newPassword);
                            DATA_MANAGER.saveUsers(users);
                            showNotification('Password reset! Please sign in.', 'success');
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Send Reset Code';
                            pendingResetUser = null;
                            setTimeout(function() { openModal('login'); }, 2000);
                        });
                    });
                });
            } else if (currentMode === 'signup') {
                var confirmPassword = $('authConfirmPassword') ? $('authConfirmPassword').value : '';
                var username = email.split('@')[0];
                if (password !== confirmPassword) {
                    showNotification('Passwords do not match!', 'error');
                    return;
                }
                var validation = DATA_MANAGER.validatePasswordStrength(password);
                if (!validation.valid) {
                    showNotification(validation.message, 'error');
                    return;
                }
                if (!DATA_MANAGER.validateEmail(email)) {
                    showNotification('Invalid email.', 'error');
                    return;
                }
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Creating account...';
                var result = DATA_MANAGER.createUser(email, password, username);
                if (!result.success) {
                    if (result.error === 'Email already registered. Please sign in.') {
                        showNotification('Email already registered. Redirecting...', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Create Account';
                        setTimeout(function() { openModal('login'); }, 1500);
                        return;
                    } else {
                        showNotification(result.error, 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Create Account';
                        return;
                    }
                }
                sendVerificationCode(email, 'signup').then(function(codeResult) {
                    if (!codeResult.success) {
                        showNotification('Error sending code.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Create Account';
                        return;
                    }
                    if (authModal) authModal.style.display = 'none';
                    openVerificationModal(email, 'signup', function(token) {
                        showNotification('Account created!', 'success');
                        checkAuthStatus();
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Create Account';
                    });
                });
            }
        });
    }

    // ============================================================
    // PROFILE MENU
    // ============================================================
    function toggleProfileMenu() {
        if (profileMenu) {
            profileMenu.remove();
            profileMenu = null;
            return;
        }
        
        if (!currentUser) {
            showNotification('Please sign in first.', 'warning');
            return;
        }
        
        profileMenu = document.createElement('div');
        profileMenu.className = 'user-menu';
        profileMenu.id = 'profileMenu';
        profileMenu.style.position = 'fixed';
        profileMenu.style.zIndex = '10000';
        profileMenu.style.minWidth = '220px';
        profileMenu.style.maxWidth = 'calc(100% - 16px)';
        profileMenu.style.background = 'var(--bg-card)';
        profileMenu.style.borderRadius = 'var(--radius)';
        profileMenu.style.boxShadow = 'var(--shadow-hover)';
        profileMenu.style.border = '1px solid var(--border-color)';
        profileMenu.style.overflow = 'hidden';
        profileMenu.style.padding = '8px 0';
        
        profileMenu.innerHTML = 
            '<div class="user-menu-header" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-input);">' +
                '<i class="fas fa-user-circle" style="font-size:1.8rem;color:var(--accent);"></i>' +
                '<div style="display:flex;flex-direction:column;">' +
                    '<strong style="color:var(--text-primary);font-size:0.9rem;">' + currentUser.username + '</strong>' +
                    '<small style="color:var(--text-light);font-size:0.7rem;word-break:break-all;">' + currentUser.email + '</small>' +
                '</div>' +
            '</div>' +
            '<div class="user-menu-divider" style="height:1px;background:var(--border-color);margin:4px 16px;"></div>' +
            '<div class="user-menu-item" data-action="profile" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;color:var(--text-secondary);transition:var(--transition);font-size:0.85rem;">' +
                '<i class="fas fa-user"></i> <span>Profile</span>' +
            '</div>' +
            '<div class="user-menu-item" data-action="account" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;color:var(--text-secondary);transition:var(--transition);font-size:0.85rem;">' +
                '<i class="fas fa-cog"></i> <span>Account Settings</span>' +
            '</div>' +
            '<div class="user-menu-divider" style="height:1px;background:var(--border-color);margin:4px 16px;"></div>' +
            '<div class="user-menu-item logout" data-action="logout" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;color:var(--danger);transition:var(--transition);font-size:0.85rem;">' +
                '<i class="fas fa-sign-out-alt"></i> <span>Log Out</span>' +
            '</div>';
        
        document.body.appendChild(profileMenu);
        
        var authBtn = $('authBtn');
        if (authBtn) {
            var rect = authBtn.getBoundingClientRect();
            profileMenu.style.top = (rect.bottom + 8) + 'px';
            profileMenu.style.right = (window.innerWidth - rect.right) + 'px';
        } else {
            profileMenu.style.top = '60px';
            profileMenu.style.right = '8px';
        }
        
        var items = profileMenu.querySelectorAll('.user-menu-item');
        for (var i = 0; i < items.length; i++) {
            (function(item) {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var action = this.getAttribute('data-action');
                    var menu = document.getElementById('profileMenu');
                    if (menu) {
                        menu.remove();
                        profileMenu = null;
                    }
                    if (action === 'profile') {
                        openProfileModal();
                    } else if (action === 'account') {
                        openAccountSettings();
                    } else if (action === 'logout') {
                        logoutUser();
                    }
                });
                
                item.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var action = this.getAttribute('data-action');
                    var menu = document.getElementById('profileMenu');
                    if (menu) {
                        menu.remove();
                        profileMenu = null;
                    }
                    if (action === 'profile') {
                        openProfileModal();
                    } else if (action === 'account') {
                        openAccountSettings();
                    } else if (action === 'logout') {
                        logoutUser();
                    }
                }, { passive: false });
            })(items[i]);
        }
        
        setTimeout(function() {
            var closeHandler = function(e) {
                var menu = document.getElementById('profileMenu');
                var authBtnEl = $('authBtn');
                if (menu && !menu.contains(e.target) && e.target !== authBtnEl) {
                    menu.remove();
                    profileMenu = null;
                    document.removeEventListener('click', closeHandler);
                    document.removeEventListener('touchstart', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
            document.addEventListener('touchstart', closeHandler);
        }, 100);
    }

    // ============================================================
    // LOGOUT
    // ============================================================
    function logoutUser() {
        DATA_MANAGER.logout();
        localStorage.removeItem('authToken');
        isLoggedIn = false;
        currentUser = null;
        var authBtn = $('authBtn');
        var historyNavBtn = $('historyNavBtn');
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> <span>Sign In</span>';
            removeClass(authBtn, 'logged-in');
        }
        if (historyNavBtn) {
            historyNavBtn.style.display = 'none';
        }
        showNotification('Logged out successfully.', 'info');
        if (profileMenu) {
            profileMenu.remove();
            profileMenu = null;
        }
    }

    // ============================================================
    // PROFILE MODAL
    // ============================================================
    function openProfileModal() {
        var user = DATA_MANAGER.getCurrentUser();
        if (!user) {
            showNotification('Please sign in to view profile.', 'warning');
            return;
        }
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = 
            '<div class="modal-content settings-content">' +
                '<span class="close-modal close-profile">&times;</span>' +
                '<div class="profile-header">' +
                    '<i class="fas fa-user-circle profile-icon"></i>' +
                    '<h2>' + user.username + '</h2>' +
                    '<p>' + user.email + '</p>' +
                    '<span class="profile-badge">Verified Account</span>' +
                '</div>' +
                '<div class="profile-info">' +
                    '<div class="info-item"><strong>Username:</strong> ' + user.username + '</div>' +
                    '<div class="info-item"><strong>Email:</strong> ' + user.email + '</div>' +
                    '<div class="info-item"><strong>Member Since:</strong> ' + new Date(user.createdAt).toLocaleDateString() + '</div>' +
                    '<div class="info-item"><strong>Last Login:</strong> ' + (user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First time') + '</div>' +
                '</div>' +
                '<button class="auth-submit-btn" id="goToSettingsBtn">Account Settings</button>' +
            '</div>';
        document.body.appendChild(modal);
        
        bindClick(modal.querySelector('.close-profile'), function() { modal.remove(); });
        bindClick(modal.querySelector('#goToSettingsBtn'), function() {
            modal.remove();
            openAccountSettings();
        });
    }

    // ============================================================
    // ACCOUNT SETTINGS
    // ============================================================
    function openAccountSettings() {
        var user = DATA_MANAGER.getCurrentUser();
        if (!user) {
            showNotification('Please sign in to access settings.', 'warning');
            return;
        }
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'settingsModal';
        modal.style.display = 'flex';
        modal.innerHTML = 
            '<div class="modal-content settings-content">' +
                '<span class="close-modal close-settings">&times;</span>' +
                '<h2><i class="fas fa-cog"></i> Account Settings</h2>' +
                '<div class="settings-body">' +
                    '<div class="settings-field">' +
                        '<label>Username</label>' +
                        '<input type="text" value="' + user.username + '" disabled>' +
                        '<small style="color: #888; font-size: 12px;">Username is auto-generated</small>' +
                    '</div>' +
                    '<div class="settings-field">' +
                        '<label>Email</label>' +
                        '<input type="email" id="settingsEmail" value="' + user.email + '">' +
                    '</div>' +
                    '<div class="settings-field">' +
                        '<label>Current Password</label>' +
                        createPasswordField('settingsCurrentPassword', 'Enter current password').outerHTML +
                    '</div>' +
                    '<div class="settings-field">' +
                        '<label>New Password</label>' +
                        createPasswordField('settingsNewPassword', 'Enter new password (8+ chars)').outerHTML +
                    '</div>' +
                    '<div class="settings-field">' +
                        '<label>Confirm New Password</label>' +
                        createPasswordField('settingsConfirmPassword', 'Confirm new password').outerHTML +
                    '</div>' +
                    '<button id="saveSettingsBtn" class="auth-submit-btn">Save Changes</button>' +
                    '<button id="deleteAccountBtn" class="auth-submit-btn delete-btn">Delete Account</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);
        
        bindPasswordToggles(modal);
        
        bindClick(modal.querySelector('.close-settings'), function() { modal.remove(); });
        
        bindClick(modal.querySelector('#saveSettingsBtn'), function() {
            var newEmail = $('settingsEmail').value;
            var currentPassword = $('settingsCurrentPassword').value;
            var newPassword = $('settingsNewPassword').value;
            var confirmPassword = $('settingsConfirmPassword').value;
            
            if (!currentPassword) {
                showNotification('Enter current password.', 'error');
                return;
            }
            if (!DATA_MANAGER.verifyPassword(currentPassword, user.password)) {
                showNotification('Current password is incorrect.', 'error');
                return;
            }
            if (newEmail && newEmail !== user.email) {
                var existing = DATA_MANAGER.findUserByEmail(newEmail);
                if (existing && existing.id !== user.id) {
                    showNotification('Email already in use.', 'error');
                    return;
                }
                var saveBtn = $('saveSettingsBtn');
                var originalText = saveBtn.textContent;
                saveBtn.textContent = 'Sending code...';
                saveBtn.disabled = true;
                sendVerificationCode(newEmail, 'email').then(function(result) {
                    if (!result.success) {
                        showNotification('Error sending code.', 'error');
                        saveBtn.textContent = originalText;
                        saveBtn.disabled = false;
                        return;
                    }
                    saveBtn.textContent = originalText;
                    saveBtn.disabled = false;
                    openVerificationModal(newEmail, 'email', function(token) {
                        var updateResult = DATA_MANAGER.updateProfile(user.id, { 
                            email: newEmail,
                            username: newEmail.split('@')[0]
                        });
                        if (updateResult.success) {
                            showNotification('Email updated!', 'success');
                            user.email = newEmail;
                            user.username = newEmail.split('@')[0];
                            modal.remove();
                            checkAuthStatus();
                            setTimeout(function() { openProfileModal(); }, 500);
                        } else {
                            showNotification('Error updating email.', 'error');
                        }
                    });
                });
                return;
            }
            if (newPassword || confirmPassword) {
                if (newPassword !== confirmPassword) {
                    showNotification('Passwords do not match!', 'error');
                    return;
                }
                if (newPassword === currentPassword) {
                    showNotification('New password must be different.', 'error');
                    return;
                }
                var validation = DATA_MANAGER.validatePasswordStrength(newPassword);
                if (!validation.valid) {
                    showNotification(validation.message, 'error');
                    return;
                }
                var saveBtn = $('saveSettingsBtn');
                var originalText = saveBtn.textContent;
                saveBtn.textContent = 'Sending code...';
                saveBtn.disabled = true;
                sendVerificationCode(user.email, 'password').then(function(result) {
                    if (!result.success) {
                        showNotification('Error sending code.', 'error');
                        saveBtn.textContent = originalText;
                        saveBtn.disabled = false;
                        return;
                    }
                    saveBtn.textContent = originalText;
                    saveBtn.disabled = false;
                    openVerificationModal(user.email, 'password', function(token) {
                        var updateResult = DATA_MANAGER.changePassword(user.id, currentPassword, newPassword);
                        if (updateResult.success) {
                            showNotification('Password updated!', 'success');
                            modal.remove();
                        } else {
                            showNotification('Error updating password.', 'error');
                        }
                    });
                });
                return;
            }
            showNotification('No changes made.', 'info');
            modal.remove();
        });
        
        bindClick(modal.querySelector('#deleteAccountBtn'), function() {
            showConfirmationModal(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
                'Delete Account',
                'Cancel'
            ).then(function(confirmed) {
                if (!confirmed) return;
                
                showPasswordPromptModal(
                    'Confirm Deletion',
                    'Enter your password to confirm account deletion:',
                    'Enter your password'
                ).then(function(password) {
                    if (password === null) {
                        showNotification('Account deletion cancelled.', 'info');
                        return;
                    }
                    if (!password || password.trim() === '') {
                        showNotification('Password is required.', 'error');
                        return;
                    }
                    if (!DATA_MANAGER.verifyPassword(password, user.password)) {
                        showNotification('Incorrect password. Please try again.', 'error');
                        return;
                    }
                    
                    var deleteBtn = $('deleteAccountBtn');
                    var originalText = deleteBtn.textContent;
                    deleteBtn.textContent = 'Sending code...';
                    deleteBtn.disabled = true;
                    
                    sendVerificationCode(user.email, 'delete').then(function(result) {
                        if (!result.success) {
                            showNotification('Error sending verification code.', 'error');
                            deleteBtn.textContent = originalText;
                            deleteBtn.disabled = false;
                            return;
                        }
                        deleteBtn.textContent = originalText;
                        deleteBtn.disabled = false;
                        
                        openVerificationModal(user.email, 'delete', function(token) {
                            var deleteResult = DATA_MANAGER.deleteAccount(user.id, password);
                            if (deleteResult.success) {
                                localStorage.removeItem('authToken');
                                showNotification('Account deleted successfully.', 'success');
                                modal.remove();
                                window.location.reload();
                            } else {
                                showNotification('Error deleting account.', 'error');
                            }
                        });
                    });
                });
            });
        });
    }

    // ============================================================
    // HISTORY MODAL - FIXED: Individual delete working
    // ============================================================
    function setupHistoryButton() {
        var historyNavBtn = $('historyNavBtn');
        if (historyNavBtn) {
            bindClick(historyNavBtn, function() {
                openHistoryModal();
            });
        }
    }

    function openHistoryModal() {
        if (!isLoggedIn || !currentUser) {
            showNotification('Please sign in to view your translation history.', 'warning');
            return;
        }
        if (historyModal) {
            historyModal.style.display = 'flex';
            loadHistoryModal();
            return;
        }
        historyModal = document.createElement('div');
        historyModal.className = 'modal';
        historyModal.id = 'historyModal';
        historyModal.style.display = 'flex';
        historyModal.innerHTML = 
            '<div class="modal-content history-modal-content">' +
                '<span class="close-modal close-history">&times;</span>' +
                '<h2><i class="fas fa-history"></i> Translation History</h2>' +
                '<div class="history-header">' +
                    '<div class="history-actions">' +
                        '<button id="deleteAllHistory" class="delete-all-btn"><i class="fas fa-trash"></i> Delete All</button>' +
                    '</div>' +
                '</div>' +
                '<div id="historyListModal" class="history-list-modal">' +
                    '<p class="empty-history">Loading history...</p>' +
                '</div>' +
            '</div>';
        document.body.appendChild(historyModal);
        
        bindClick(historyModal.querySelector('.close-history'), function() {
            historyModal.style.display = 'none';
        });
        
        loadHistoryModal();
        
        bindClick(historyModal.querySelector('#deleteAllHistory'), function() {
            if (!isLoggedIn || !currentUser) {
                showNotification('Please sign in.', 'warning');
                return;
            }
            showConfirmationModal(
                'Delete All History',
                'Are you sure you want to delete ALL your translation history? This action cannot be undone.',
                'Delete All',
                'Cancel'
            ).then(function(confirmed) {
                if (!confirmed) return;
                var result = DATA_MANAGER.clearHistory(currentUser.email);
                if (result.success) {
                    loadHistoryModal();
                    showNotification('All history deleted.', 'info');
                } else {
                    showNotification('Error deleting history.', 'error');
                }
            });
        });
    }

    function loadHistoryModal() {
        var historyList = $('historyListModal');
        if (!historyList) return;
        if (!isLoggedIn || !currentUser) {
            historyList.innerHTML = '<p class="empty-history">Sign in to see history.</p>';
            return;
        }
        try {
            var history = DATA_MANAGER.getHistory(currentUser.email);
            if (!history || history.length === 0) {
                historyList.innerHTML = '<p class="empty-history">No translations yet.</p>';
                return;
            }
            var html = '';
            for (var i = 0; i < history.length; i++) {
                var item = history[i];
                var time = new Date(item.createdAt).toLocaleString();
                html += 
                    '<div class="history-item" data-id="' + item.id + '">' +
                        '<button class="h-delete" data-id="' + item.id + '" title="Delete this translation"><i class="fas fa-times"></i></button>' +
                        '<div class="h-source">' + getLanguageName(item.sourceLang) + ' → ' + getLanguageName(item.targetLang) + '<span class="h-time">' + time + '</span></div>' +
                        '<div class="h-original">"' + item.original.substring(0, 60) + (item.original.length > 60 ? '...' : '') + '"</div>' +
                        '<div class="h-translation">"' + item.translated.substring(0, 60) + (item.translated.length > 60 ? '...' : '') + '"</div>' +
                    '</div>';
            }
            historyList.innerHTML = html;
            
            // FIXED: Individual delete buttons - properly bound
            var deleteBtns = historyList.querySelectorAll('.h-delete');
            for (var j = 0; j < deleteBtns.length; j++) {
                (function(btn) {
                    // Use bindClick for both click and touch support
                    bindClick(btn, function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var id = this.getAttribute('data-id');
                        if (!id) return;
                        
                        showConfirmationModal(
                            'Delete History',
                            'Delete this translation from history?',
                            'Delete',
                            'Cancel'
                        ).then(function(confirmed) {
                            if (!confirmed) return;
                            if (!isLoggedIn || !currentUser) {
                                showNotification('Please sign in.', 'warning');
                                return;
                            }
                            var result = DATA_MANAGER.deleteHistoryItem(currentUser.email, id);
                            if (result.success) {
                                loadHistoryModal();
                                showNotification('History item deleted.', 'info');
                            } else {
                                showNotification('Error deleting history item.', 'error');
                            }
                        });
                    });
                })(deleteBtns[j]);
            }
        } catch (error) {
            historyList.innerHTML = '<p class="empty-history">Could not load history.</p>';
        }
    }

    // ============================================================
    // SAVE TO HISTORY
    // ============================================================
    function saveToHistory(original, translated, sourceLang, targetLang) {
        if (!isLoggedIn || !currentUser) {
            return;
        }
        var entry = {
            original: original,
            translated: translated,
            sourceLang: sourceLang,
            targetLang: targetLang
        };
        DATA_MANAGER.saveHistory(currentUser.email, entry);
    }

    // ============================================================
    // THEME TOGGLE - FIXED: Works on ALL devices
    // ============================================================
    function setupThemeToggle() {
        var themeToggle = $('themeToggle');
        if (themeToggle) {
            // Set initial icon based on theme
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            var icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
            }
            
            function toggleTheme(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                var newTheme = isDark ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                
                var icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
                
                localStorage.setItem('theme', newTheme);
            }
            
            themeToggle.addEventListener('click', toggleTheme);
            themeToggle.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleTheme(e);
            }, { passive: false });
            
            if (localStorage.getItem('theme') === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                var icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sun';
                }
            }
        }
    }

    // ============================================================
    // ABOUT MODAL
    // ============================================================
    function setupAboutModal() {
        var aboutNavBtn = $('aboutNavBtn');
        var aboutModal = $('aboutModal');
        var closeAboutModal = $('closeAboutModal');
        
        if (aboutNavBtn) {
            bindClick(aboutNavBtn, function() {
                if (aboutModal) aboutModal.style.display = 'flex';
            });
        }
        
        if (closeAboutModal) {
            bindClick(closeAboutModal, function() {
                if (aboutModal) aboutModal.style.display = 'none';
            });
        }
        
        if (aboutModal) {
            aboutModal.addEventListener('click', function(e) {
                if (e.target === aboutModal) {
                    aboutModal.style.display = 'none';
                }
            });
        }
    }

    // ============================================================
    // TRANSLATION ENGINE
    // ============================================================
    function setupTranslation() {
        var sourceLang = $('sourceLang');
        var targetLang = $('targetLang');
        var inputText = $('inputText');
        var outputDisplay = $('outputText');
        var translateBtn = $('translateBtn');
        var micBtn = $('micBtn');
        var recordingStatus = $('recordingStatus');
        var swapBtn = $('swapLang');
        var clearInputBtn = $('clearInput');
        var copyOutputBtn = $('copyOutput');
        var speakOutputBtn = $('speakOutput');
        
        finalTranscript = '';
        interimTranscript = '';
        currentRecordingLang = sourceLang ? sourceLang.value || 'en' : 'en';
        detectedLanguageCache = '';
        forceTranslationWithDetectedLang = false;
        pendingDetectedLang = '';
        lastDetectedText = '';
        lastDetectedLangResult = '';
        isDetectionRunning = false;
        
        // Create Translate From Container
        translateFromContainer = document.createElement('div');
        translateFromContainer.className = 'translate-from-container';
        translateFromContainer.style.display = 'none';
        translateFromContainer.style.marginTop = '4px';
        translateFromContainer.style.padding = '0 4px';
        
        var inputBox = inputText ? inputText.closest('.input-box') : null;
        if (inputBox) {
            var inputTools = inputBox.querySelector('.input-tools');
            if (inputTools) {
                inputBox.insertBefore(translateFromContainer, inputTools);
            } else {
                inputBox.appendChild(translateFromContainer);
            }
        }

        // Create Translate From Button
        translateFromBtn = document.createElement('button');
        translateFromBtn.className = 'translate-from-btn';
        translateFromBtn.textContent = 'Translate from: ';
        translateFromContainer.appendChild(translateFromBtn);

        // Click handler for Translate From button
        function handleTranslateFromClick(e) {
            e.preventDefault();
            e.stopPropagation();
            var detectedLang = translateFromBtn.getAttribute('data-lang');
            if (detectedLang && detectedLang !== 'auto' && detectedLang !== '') {
                var langExists = false;
                for (var i = 0; i < LANGUAGES.length; i++) {
                    if (LANGUAGES[i].code === detectedLang) {
                        langExists = true;
                        break;
                    }
                }
                if (langExists && sourceLang) {
                    sourceLang.value = detectedLang;
                    translateFromContainer.style.display = 'none';
                    translateFromBtn.setAttribute('data-lang', '');
                    translateFromBtn.textContent = 'Translate from: ';
                    var text = inputText ? inputText.value.trim() : '';
                    if (text) {
                        forceTranslationWithDetectedLang = true;
                        pendingDetectedLang = detectedLang;
                        performTranslation();
                    }
                    var langName = getLanguageName(detectedLang);
                    showNotification('Switched to: ' + langName, 'success', 2000);
                }
            }
        }
        
        translateFromBtn.addEventListener('click', handleTranslateFromClick);
        translateFromBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleTranslateFromClick(e);
        }, { passive: false });

        // Add Speaker Icon to Input Field
        var inputSpeakerBtn = document.createElement('button');
        inputSpeakerBtn.className = 'action-btn input-speaker-btn';
        inputSpeakerBtn.style.cssText = 'background:transparent;border:none;color:var(--text-light);padding:3px 6px;border-radius:4px;cursor:pointer;transition:var(--transition);font-size:0.75rem;min-width:28px;min-height:28px;display:flex;align-items:center;justify-content:center;';
        inputSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        inputSpeakerBtn.title = 'Read input text aloud';

        var inputBoxActions = inputBox ? inputBox.querySelector('.box-actions') : null;
        if (inputBoxActions) {
            inputBoxActions.appendChild(inputSpeakerBtn);
        }

        bindClick(inputSpeakerBtn, function() {
            var text = inputText ? inputText.value.trim() : '';
            if (text) {
                stopSpeech();
                var lang = sourceLang ? sourceLang.value || 'en' : 'en';
                speakText(text, lang);
                showNotification('🔊 Reading input...', 'info', 2000);
            } else {
                showNotification('No text to read.', 'warning', 2000);
            }
        });

        // Update output speaker
        if (speakOutputBtn) {
            var newOutputSpeaker = speakOutputBtn.cloneNode(true);
            speakOutputBtn.parentNode.replaceChild(newOutputSpeaker, speakOutputBtn);
            bindClick(newOutputSpeaker, function() {
                var text = outputDisplay ? outputDisplay.textContent : '';
                if (text && !text.includes('placeholder') && !text.includes('Please enter') && !text.includes('Translating') && !text.includes('Error')) {
                    stopSpeech();
                    speakText(text, targetLang ? targetLang.value : 'en');
                    showNotification('🔊 Reading translation...', 'info', 2000);
                }
            });
        }

        // ============================================================
        // LANGUAGE DETECTION FUNCTIONS
        // ============================================================
        function updateTranslateFromBtn(detectedLang, text) {
            if (!text || text.length < 2 || isRecording) {
                translateFromContainer.style.display = 'none';
                translateFromBtn.setAttribute('data-lang', '');
                translateFromBtn.textContent = 'Translate from: ';
                return;
            }
            
            var selectedLang = sourceLang ? sourceLang.value : 'en';
            
            if (detectedLang && detectedLang !== 'auto' && detectedLang !== selectedLang) {
                var langExists = false;
                for (var i = 0; i < LANGUAGES.length; i++) {
                    if (LANGUAGES[i].code === detectedLang) {
                        langExists = true;
                        break;
                    }
                }
                if (langExists) {
                    var langName = getLanguageName(detectedLang);
                    translateFromBtn.textContent = 'Translate from: ' + langName;
                    translateFromBtn.setAttribute('data-lang', detectedLang);
                    translateFromContainer.style.display = 'block';
                } else {
                    translateFromContainer.style.display = 'none';
                    translateFromBtn.setAttribute('data-lang', '');
                    translateFromBtn.textContent = 'Translate from: ';
                }
            } else {
                translateFromContainer.style.display = 'none';
                translateFromBtn.setAttribute('data-lang', '');
                translateFromBtn.textContent = 'Translate from: ';
            }
        }

        function resetTranslateFromBtn() {
            translateFromContainer.style.display = 'none';
            translateFromBtn.setAttribute('data-lang', '');
            translateFromBtn.textContent = 'Translate from: ';
        }

        function detectLanguage(text) {
            return new Promise(function(resolve) {
                if (!text || text.length < 3) {
                    resolve('en');
                    return;
                }
                
                if (lastDetectedText === text && lastDetectedLangResult) {
                    resolve(lastDetectedLangResult);
                    return;
                }
                
                lastDetectedText = text;
                
                var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(text);
                fetch(url).then(function(response) {
                    return response.json();
                }).then(function(data) {
                    if (data && data[2]) {
                        var detected = data[2];
                        if (detected && detected !== 'auto') {
                            detectedLanguageCache = detected;
                            lastDetectedLangResult = detected;
                            resolve(detected);
                        } else {
                            lastDetectedLangResult = 'en';
                            resolve('en');
                        }
                    } else {
                        lastDetectedLangResult = 'en';
                        resolve('en');
                    }
                }).catch(function() {
                    lastDetectedLangResult = 'en';
                    resolve('en');
                });
            });
        }

        function translateText(text, sourceLangCode, targetLangCode) {
            return new Promise(function(resolve, reject) {
                if (!text || text.trim().length === 0) {
                    resolve('');
                    return;
                }
                if (sourceLangCode === targetLangCode) {
                    resolve(text);
                    return;
                }
                var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + sourceLangCode + '&tl=' + targetLangCode + '&dt=t&q=' + encodeURIComponent(text);
                fetch(url).then(function(response) {
                    return response.json();
                }).then(function(data) {
                    if (data && data[0]) {
                        var result = '';
                        for (var i = 0; i < data[0].length; i++) {
                            result += data[0][i][0];
                        }
                        resolve(result);
                    } else {
                        reject(new Error('Translation failed'));
                    }
                }).catch(function() {
                    reject(new Error('Translation failed'));
                });
            });
        }

        function performTranslation() {
            var text = inputText ? inputText.value.trim() : '';
            if (!text) {
                if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
                if (translateBtn) {
                    translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                    translateBtn.disabled = false;
                }
                resetTranslateFromBtn();
                forceTranslationWithDetectedLang = false;
                pendingDetectedLang = '';
                return;
            }
            
            var sourceLangCode = sourceLang ? sourceLang.value : 'en';
            var targetLangCode = targetLang ? targetLang.value : 'en';
            
            if (sourceLangCode === targetLangCode) {
                if (outputDisplay) outputDisplay.textContent = text;
                if (translateBtn) {
                    translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                    translateBtn.disabled = false;
                }
                resetTranslateFromBtn();
                forceTranslationWithDetectedLang = false;
                pendingDetectedLang = '';
                return;
            }
            
            if (isTranslating) {
                translateQueue = true;
                return;
            }
            translateQueue = false;
            isTranslating = true;
            if (translateBtn) {
                translateBtn.disabled = true;
                translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
            }
            
            if (forceTranslationWithDetectedLang && pendingDetectedLang) {
                var detectedLang = pendingDetectedLang;
                forceTranslationWithDetectedLang = false;
                pendingDetectedLang = '';
                
                if (!isRecording && detectedLang && detectedLang !== 'auto') {
                    updateTranslateFromBtn(detectedLang, text);
                } else {
                    resetTranslateFromBtn();
                }
                
                translateText(text, sourceLangCode, targetLangCode).then(function(translated) {
                    if (outputDisplay) outputDisplay.textContent = translated;
                    if (isLoggedIn && currentUser) {
                        saveToHistory(text, translated, sourceLangCode, targetLangCode);
                    }
                    isTranslating = false;
                    if (translateBtn) {
                        translateBtn.disabled = false;
                        translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                    }
                    if (translateQueue) {
                        setTimeout(function() { performTranslation(); }, 30);
                    }
                }).catch(function(error) {
                    if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Error: ' + error.message + '</span>';
                    isTranslating = false;
                    if (translateBtn) {
                        translateBtn.disabled = false;
                        translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                    }
                    if (translateQueue) {
                        setTimeout(function() { performTranslation(); }, 30);
                    }
                });
                return;
            }
            
            detectLanguage(text).then(function(detectedLang) {
                if (!isRecording && detectedLang && detectedLang !== 'auto') {
                    updateTranslateFromBtn(detectedLang, text);
                } else {
                    resetTranslateFromBtn();
                }
                return translateText(text, sourceLangCode, targetLangCode);
            }).then(function(translated) {
                if (outputDisplay) outputDisplay.textContent = translated;
                if (isLoggedIn && currentUser) {
                    saveToHistory(text, translated, sourceLangCode, targetLangCode);
                }
                isTranslating = false;
                if (translateBtn) {
                    translateBtn.disabled = false;
                    translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                }
                if (translateQueue) {
                    setTimeout(function() { performTranslation(); }, 30);
                }
            }).catch(function(error) {
                if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Error: ' + error.message + '</span>';
                isTranslating = false;
                if (translateBtn) {
                    translateBtn.disabled = false;
                    translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                }
                if (translateQueue) {
                    setTimeout(function() { performTranslation(); }, 30);
                }
            });
        }

        // Event listeners
        bindClick(translateBtn, function() {
            if (!isTranslating) {
                performTranslation();
            }
        });

        if (inputText) {
            inputText.addEventListener('input', function() {
                var text = inputText.value.trim();
                if (!text) {
                    stopSpeech();
                    if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
                    if (translateBtn) {
                        translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                        translateBtn.disabled = false;
                    }
                    resetTranslateFromBtn();
                    forceTranslationWithDetectedLang = false;
                    pendingDetectedLang = '';
                    lastDetectedText = '';
                    lastDetectedLangResult = '';
                    return;
                }
                
                if (translateBtn) {
                    translateBtn.disabled = true;
                    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
                }
                
                if (!isRecording && text.length > 2) {
                    if (lastDetectedText === text && lastDetectedLangResult) {
                        updateTranslateFromBtn(lastDetectedLangResult, text);
                        performTranslation();
                    } else {
                        detectLanguage(text).then(function(detectedLang) {
                            if (detectedLang && detectedLang !== 'auto') {
                                updateTranslateFromBtn(detectedLang, text);
                            }
                            performTranslation();
                        }).catch(function() {
                            performTranslation();
                        });
                    }
                } else {
                    resetTranslateFromBtn();
                    performTranslation();
                }
            });
        }

        // ============================================================
        // FIXED: Prevent source and target from being the same
        // ============================================================
        function ensureDifferentLanguages() {
            if (!sourceLang || !targetLang) return;
            
            if (sourceLang.value === targetLang.value) {
                var allLangs = LANGUAGES.map(function(l) { return l.code; });
                var newLang = 'en';
                for (var i = 0; i < allLangs.length; i++) {
                    if (allLangs[i] !== sourceLang.value) {
                        newLang = allLangs[i];
                        break;
                    }
                }
                targetLang.value = newLang;
            }
        }

        if (sourceLang) {
            sourceLang.addEventListener('change', function() {
                stopRecordingIfActive();
                resetTranslateFromBtn();
                stopSpeech();
                currentRecordingLang = sourceLang.value || 'en';
                if (recognition && isRecording) {
                    recognition.lang = currentRecordingLang;
                }
                ensureDifferentLanguages();
                var text = inputText ? inputText.value.trim() : '';
                if (text) {
                    performTranslation();
                }
            });
        }

        if (targetLang) {
            targetLang.addEventListener('change', function() {
                stopRecordingIfActive();
                stopSpeech();
                ensureDifferentLanguages();
                var text = inputText ? inputText.value.trim() : '';
                if (text) {
                    performTranslation();
                }
            });
        }

        bindClick(swapBtn, function() {
            stopRecordingIfActive();
            stopSpeech();
            var temp = sourceLang ? sourceLang.value : 'rw';
            if (sourceLang) sourceLang.value = targetLang ? targetLang.value : 'en';
            if (targetLang) targetLang.value = temp;
            ensureDifferentLanguages();
            if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
            if (inputText) inputText.value = '';
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                translateBtn.disabled = false;
            }
            resetTranslateFromBtn();
            forceTranslationWithDetectedLang = false;
            pendingDetectedLang = '';
            lastDetectedText = '';
            lastDetectedLangResult = '';
        });

        bindClick(copyOutputBtn, function() {
            var text = outputDisplay ? outputDisplay.textContent : '';
            if (text && !text.includes('placeholder') && !text.includes('Please enter') && !text.includes('Translating') && !text.includes('Error')) {
                try {
                    navigator.clipboard.writeText(text).then(function() {
                        showNotification('Copied!', 'success');
                    }).catch(function() {
                        var textarea = document.createElement('textarea');
                        textarea.value = text;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        textarea.remove();
                        showNotification('Copied!', 'success');
                    });
                } catch (e) {
                    var textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    textarea.remove();
                    showNotification('Copied!', 'success');
                }
            }
        });

        bindClick(clearInputBtn, function() {
            stopRecordingIfActive();
            stopSpeech();
            if (inputText) inputText.value = '';
            if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                translateBtn.disabled = false;
            }
            resetTranslateFromBtn();
            forceTranslationWithDetectedLang = false;
            pendingDetectedLang = '';
            lastDetectedText = '';
            lastDetectedLangResult = '';
        });

        // ============================================================
        // MIC - RECORDING SYSTEM
        // ============================================================
        function stopRecordingIfActive() {
            if (isRecording) {
                try {
                    if (recognition) {
                        recognition.stop();
                    }
                } catch (e) {}
                isRecording = false;
                if (recordingTimeout) {
                    clearTimeout(recordingTimeout);
                    recordingTimeout = null;
                }
                if (micBtn) {
                    removeClass(micBtn, 'recording');
                    micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                    if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                }
                resetTranslateFromBtn();
                if (finalTranscript.trim()) {
                    inputText.value = finalTranscript.trim();
                    performTranslation();
                }
                finalTranscript = '';
                interimTranscript = '';
            }
        }

        if (window.SpeechRecognition || window.webkitSpeechRecognition) {
            var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            function initRecognition() {
                if (recognition) {
                    try { recognition.stop(); } catch(e) {}
                }
                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                var selectedLang = sourceLang ? sourceLang.value || 'en' : 'en';
                currentRecordingLang = selectedLang;
                recognition.lang = selectedLang;
                recognition.maxAlternatives = 5;
                recognition.continuous = true;
                
                recognition.onstart = function() {
                    isRecording = true;
                    finalTranscript = '';
                    interimTranscript = '';
                    if (micBtn) {
                        addClass(micBtn, 'recording');
                        micBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                    }
                    if (recordingStatus) {
                        var langName = getLanguageName(sourceLang ? sourceLang.value : 'en');
                        recordingStatus.textContent = '🎤 Recording in ' + langName + '... Click to stop';
                    }
                    resetTranslateFromBtn();
                    
                    if (recordingTimeout) {
                        clearTimeout(recordingTimeout);
                    }
                    recordingTimeout = setTimeout(function() {
                        if (isRecording) {
                            try {
                                if (recognition) {
                                    recognition.stop();
                                }
                            } catch(e) {}
                            isRecording = false;
                            if (micBtn) {
                                removeClass(micBtn, 'recording');
                                micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                            }
                            if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                            if (finalTranscript.trim()) {
                                inputText.value = finalTranscript.trim();
                                performTranslation();
                            }
                            finalTranscript = '';
                            interimTranscript = '';
                        }
                        recordingTimeout = null;
                    }, 30000);
                };
                
                recognition.onresult = function(event) {
                    var currentFinal = '';
                    var currentInterim = '';
                    
                    for (var i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            currentFinal += event.results[i][0].transcript;
                        } else {
                            currentInterim += event.results[i][0].transcript;
                        }
                    }
                    
                    if (currentFinal) {
                        finalTranscript += ' ' + currentFinal;
                    }
                    
                    if (currentInterim || finalTranscript) {
                        var displayText = (finalTranscript + ' ' + currentInterim).trim();
                        if (inputText) {
                            inputText.value = displayText;
                        }
                        if (translateBtn) {
                            translateBtn.disabled = true;
                            translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
                        }
                        performTranslation();
                    }
                };
                
                recognition.onerror = function(event) {
                    if (event.error === 'no-speech') {
                        return;
                    }
                    if (event.error === 'not-allowed') {
                        showNotification('Microphone access denied. Please allow microphone access.', 'error');
                    }
                    if (event.error === 'audio-capture') {
                        showNotification('No microphone found. Please connect a microphone.', 'error');
                    }
                    if (event.error === 'language-not-supported') {
                        var langName = getLanguageName(sourceLang ? sourceLang.value : 'en');
                        showNotification('"' + langName + '" may not be fully supported for speech recognition. Trying anyway...', 'warning');
                    }
                    if (!isRecording) {
                        if (micBtn) {
                            removeClass(micBtn, 'recording');
                            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                        }
                        if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                        resetTranslateFromBtn();
                    }
                };
                
                recognition.onend = function() {
                    if (recordingTimeout) {
                        clearTimeout(recordingTimeout);
                        recordingTimeout = null;
                    }
                    
                    if (isRecording) {
                        try {
                            var selectedLang = sourceLang ? sourceLang.value || 'en' : 'en';
                            currentRecordingLang = selectedLang;
                            recognition.lang = selectedLang;
                            recognition.start();
                        } catch (e) {
                            isRecording = false;
                            if (micBtn) {
                                removeClass(micBtn, 'recording');
                                micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                            }
                            if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                            resetTranslateFromBtn();
                            if (finalTranscript.trim()) {
                                inputText.value = finalTranscript.trim();
                                performTranslation();
                            }
                            finalTranscript = '';
                            interimTranscript = '';
                        }
                    } else {
                        if (micBtn) {
                            removeClass(micBtn, 'recording');
                            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                        }
                        if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                        resetTranslateFromBtn();
                        if (finalTranscript.trim()) {
                            inputText.value = finalTranscript.trim();
                            performTranslation();
                        }
                        finalTranscript = '';
                        interimTranscript = '';
                    }
                };
            }
            
            initRecognition();
            
            bindClick(micBtn, function() {
                if (isRecording) {
                    isRecording = false;
                    try {
                        if (recognition) {
                            recognition.stop();
                        }
                    } catch (e) {}
                    if (recordingTimeout) {
                        clearTimeout(recordingTimeout);
                        recordingTimeout = null;
                    }
                    removeClass(micBtn, 'recording');
                    micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                    if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                    showNotification('⏹ Recording stopped.', 'info', 2000);
                    
                    if (finalTranscript.trim()) {
                        inputText.value = finalTranscript.trim();
                        performTranslation();
                    }
                    finalTranscript = '';
                    interimTranscript = '';
                } else {
                    var lang = sourceLang ? sourceLang.value || 'en' : 'en';
                    var langName = getLanguageName(lang);
                    currentRecordingLang = lang;
                    
                    if (recognition) {
                        recognition.lang = lang;
                        try {
                            recognition.start();
                            showNotification('🎤 Listening in ' + langName + '...', 'info', 2000);
                        } catch (e) {
                            initRecognition();
                            if (recognition) {
                                recognition.lang = lang;
                                try {
                                    recognition.start();
                                    showNotification('🎤 Listening in ' + langName + '...', 'info', 2000);
                                } catch (e2) {
                                    showNotification('Error starting microphone. Please try again.', 'error');
                                }
                            }
                        }
                    } else {
                        initRecognition();
                        if (recognition) {
                            recognition.lang = lang;
                            try {
                                recognition.start();
                                showNotification('🎤 Listening in ' + langName + '...', 'info', 2000);
                            } catch (e) {
                                showNotification('Error starting microphone. Please try again.', 'error');
                            }
                        }
                    }
                }
            });
            
            if (sourceLang) {
                sourceLang.addEventListener('change', function() {
                    if (recognition && isRecording) {
                        var newLang = sourceLang.value || 'en';
                        currentRecordingLang = newLang;
                        recognition.lang = newLang;
                        var langName = getLanguageName(newLang);
                        if (recordingStatus) {
                            recordingStatus.textContent = '🎤 Recording in ' + langName + '... Click to stop';
                        }
                    }
                });
            }
            
        } else {
            if (micBtn) {
                micBtn.disabled = true;
                micBtn.title = 'Speech recognition not supported';
                micBtn.style.opacity = '0.5';
                micBtn.style.cursor = 'not-allowed';
            }
            if (recordingStatus) {
                recordingStatus.textContent = '⚠️ Not supported';
            }
        }
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function initApp() {
        populateLanguageDropdowns();
        setupAuthButton();
        setupCloseModal();
        setupAuthForm();
        setupHistoryButton();
        setupTranslation();
        setupThemeToggle();
        setupAboutModal();
        checkAuthStatus();
        
        console.log('✅ FreeTranslateLanguage initialized successfully!');
    }

    // ============================================================
    // START APP
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    window.addEventListener('load', function() {
        var sourceLang = $('sourceLang');
        if (sourceLang && sourceLang.options.length === 0) {
            populateLanguageDropdowns();
        }
    });

})();
