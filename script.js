// ============================================================
// FREE TRANSLATE LANGUAGE - Complete Application
// UPDATED: Cloud Sync with API Manager
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
    var pendingVerificationCode = null;
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
    var silenceTimeout = null;
    var lastSpeechTime = null;
    var currentRecordingLang = 'en';
    var detectedLanguageCache = '';
    var lastTranslationText = '';
    var isDetectingLanguage = false;
    var forceTranslationWithDetectedLang = false;
    var pendingDetectedLang = '';
    var lastDetectedText = '';
    var lastDetectedLangResult = '';
    var isDetectionRunning = false;
    var isProcessingRecording = false;
    var authCheckInProgress = false;
    var initialAuthCheckDone = false;

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
            handler(e);
        }, { passive: true });
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
    // USERNAME GENERATION
    // ============================================================
    function generateUsernameFromEmail(email) {
        if (!email) return 'user';
        var localPart = email.split('@')[0];
        var clean = localPart.replace(/[^a-zA-Z0-9]/g, '');
        if (!clean) return 'user';
        if (clean.length > 8) {
            clean = clean.substring(0, 8);
        }
        if (clean.length < 3) {
            var random = Math.random().toString(36).substring(2, 5);
            clean = clean + random;
        }
        return clean.toLowerCase();
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
            API_MANAGER.sendVerificationCode(email, action).then(function(result) {
                if (result.success) {
                    showNotification('📧 Verification code sent! Check your email and spam folder.', 'success');
                    resolve({ success: true, code: result.code });
                } else {
                    showNotification('⚠️ ' + (result.message || 'Error sending code. Please try again.'), 'error');
                    resolve({ success: false });
                }
            }).catch(function(error) {
                var result = DATA_MANAGER.storeVerificationCode(email, action);
                if (result.success) {
                    showNotification('📧 Verification code sent! Check your email and spam folder.', 'success');
                    resolve({ success: true, code: result.code });
                } else {
                    showNotification('⚠️ Error sending code. Please try again.', 'error');
                    resolve({ success: false });
                }
            });
        });
    }

    // ============================================================
    // VERIFY CODE
    // ============================================================
    function verifyCode(email, code) {
        isVerifying = true;
        return new Promise(function(resolve, reject) {
            API_MANAGER.verifyCode(email, code, pendingAction).then(function(result) {
                if (result.success) {
                    resolve({ 
                        success: true, 
                        token: result.token || null,
                        requiresSignIn: result.requiresSignIn || false,
                        code: code
                    });
                } else {
                    resolve({ 
                        success: false, 
                        error: result.message || 'Invalid code.' 
                    });
                }
                isVerifying = false;
            }).catch(function(error) {
                var result = DATA_MANAGER.verifyCode(email, code, pendingAction);
                if (result.success) {
                    resolve({ 
                        success: true, 
                        token: 'local_' + email,
                        requiresSignIn: pendingAction === 'signup',
                        code: code
                    });
                } else {
                    resolve({ 
                        success: false, 
                        error: result.error || 'Invalid code.' 
                    });
                }
                isVerifying = false;
            });
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
                '<div class="modal-content prompt-content" style="max-width: 420px; padding:28px 24px;">' +
                    '<h2 style="text-align: center; margin-bottom: 12px; color:var(--text-primary);">' + title + '</h2>' +
                    '<p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px; font-size:0.9rem;">' + message + '</p>' +
                    '<div class="settings-field" style="margin-bottom:16px;">' +
                        '<label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Password</label>' +
                        createPasswordField('promptPasswordInput', placeholder).outerHTML +
                    '</div>' +
                    '<div class="confirmation-buttons" style="display:flex; gap:16px; justify-content:center; margin-top:8px; width:100%; flex-wrap:wrap;">' +
                        '<button class="auth-submit-btn cancel-btn" id="promptCancel" style="flex:1; min-width:120px; max-width:180px; min-height:44px; padding:10px 20px; border-radius:var(--radius-sm); font-size:0.9rem; font-weight:600; cursor:pointer; transition:var(--transition); font-family:var(--font); border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-secondary); margin:4px;">Cancel</button>' +
                        '<button class="auth-submit-btn delete-btn" id="promptConfirm" style="flex:1; min-width:120px; max-width:180px; min-height:44px; padding:10px 20px; border-radius:var(--radius-sm); font-size:0.9rem; font-weight:600; cursor:pointer; transition:var(--transition); font-family:var(--font); border:none; background:var(--danger); color:white; margin:4px;">Confirm</button>' +
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
    // CONFIRMATION MODAL
    // ============================================================
    function showConfirmationModal(title, message, confirmText, cancelText) {
        confirmText = confirmText || 'Confirm';
        cancelText = cancelText || 'Cancel';
        return new Promise(function(resolve) {
            var modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = 
                '<div class="modal-content confirmation-content" style="padding:28px 24px;">' +
                    '<h2 style="margin-bottom:12px; color:var(--text-primary);">' + title + '</h2>' +
                    '<p style="margin-bottom:16px; color:var(--text-secondary); font-size:0.9rem; line-height:1.6;">' + message + '</p>' +
                    '<div class="confirmation-buttons" style="display:flex; gap:16px; justify-content:center; margin-top:16px; width:100%; flex-wrap:wrap;">' +
                        '<button class="auth-submit-btn cancel-btn" id="cancelConfirm" style="flex:1; min-width:120px; max-width:180px; min-height:44px; margin:4px; padding:10px 20px; border-radius:var(--radius-sm); font-size:0.9rem; font-weight:600; cursor:pointer; transition:var(--transition); font-family:var(--font); border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-secondary);">' + cancelText + '</button>' +
                        '<button class="auth-submit-btn delete-btn" id="confirmAction" style="flex:1; min-width:120px; max-width:180px; min-height:44px; margin:4px; padding:10px 20px; border-radius:var(--radius-sm); font-size:0.9rem; font-weight:600; cursor:pointer; transition:var(--transition); font-family:var(--font); border:none; background:var(--danger); color:white;">' + confirmText + '</button>' +
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
                '<div class="modal-content prompt-content" style="max-width: 440px; padding:28px 24px;">' +
                    '<h2 style="text-align: center; margin-bottom: 12px; color:var(--text-primary);">Reset Password</h2>' +
                    '<p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px; font-size:0.9rem;">Enter your new password below.</p>' +
                    '<div class="settings-field" style="margin-bottom:12px;">' +
                        '<label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">New Password (min 8 chars)</label>' +
                        createPasswordField('resetNewPassword', 'Enter new password').outerHTML +
                    '</div>' +
                    '<div class="settings-field" style="margin-bottom:16px;">' +
                        '<label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Confirm New Password</label>' +
                        createPasswordField('resetConfirmPassword', 'Confirm new password').outerHTML +
                    '</div>' +
                    '<div class="confirmation-buttons" style="display:flex; gap:16px; justify-content:center; margin-top:8px; width:100%; flex-wrap:wrap;">' +
                        '<button class="auth-submit-btn cancel-btn" id="resetCancel" style="flex:1; min-width:120px; max-width:180px; min-height:44px; padding:10px 20px; border-radius:var(--radius-sm); font-size:0.9rem; font-weight:600; cursor:pointer; transition:var(--transition); font-family:var(--font); border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-secondary); margin:4px;">Cancel</button>' +
                        '<button class="auth-submit-btn" id="resetConfirm" style="flex:1; min-width:120px; max-width:180px; min-height:44px; padding:10px 20px; border-radius:var(--radius-sm); font-size:0.9rem; font-weight:600; cursor:pointer; transition:var(--transition); font-family:var(--font); border:none; background:var(--accent); color:white; margin:4px;">Reset Password</button>' +
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
    // VERIFICATION MODAL - FIXED: Refresh on cancel for ALL actions
    // ============================================================
    function openVerificationModal(email, action, callback) {
        pendingEmail = email;
        pendingAction = action;
        pendingCallback = callback;
        pendingVerificationCode = null;
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
            '<div class="modal-content verification-content" style="padding:28px 24px;">' +
                '<span class="close-modal close-verification" style="position:absolute; top:12px; right:16px; font-size:1.4rem; cursor:pointer; color:var(--text-light); transition:var(--transition); line-height:1; background:none; border:none; padding:4px 8px; border-radius:4px;">&times;</span>' +
                '<h2 style="margin-bottom:12px; color:var(--text-primary);">' + title + '</h2>' +
                '<p class="verification-desc" style="text-align:center; color:var(--text-secondary); margin-bottom:14px; font-size:0.85rem; line-height:1.5;">Enter the 6-digit verification code sent to your email. Also check SPAM/JUNK folder.</p>' +
                '<form id="verificationForm" style="display:flex; flex-direction:column; gap:10px;">' +
                    '<input type="text" id="verificationCode" placeholder="Enter 6-digit code" maxlength="6" autocomplete="off" required style="width:100%; text-align:center; font-size:1.3rem; letter-spacing:6px; padding:12px 14px; font-weight:600; background:var(--bg-input); border:2px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-family:var(--font); transition:var(--transition); min-height:48px;">' +
                    '<button type="submit" class="auth-submit-btn" id="verifySubmitBtn" style="width:100%; min-height:44px; margin-top:10px; padding:10px; background:var(--accent); color:white; border:none; border-radius:var(--radius-sm); font-size:0.9rem; font-weight:600; cursor:pointer; transition:var(--transition); font-family:var(--font);">Verify</button>' +
                '</form>' +
                '<p class="auth-switch" style="text-align:center; margin-top:12px; font-size:0.8rem; color:var(--text-secondary);">Didn\'t receive code? <a href="#" id="resendCodeBtn" style="color:var(--accent); text-decoration:none; font-weight:600; cursor:pointer;">Resend Code</a></p>' +
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
            // REFRESH PAGE FOR ALL ACTIONS when user cancels/closes
            window.location.reload();
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
            
            API_MANAGER.verifyCode(email, code, action).then(function(result) {
                if (result.success) {
                    verificationDone = true;
                    submitBtn.textContent = '✓ Verified';
                    submitBtn.style.backgroundColor = '#4CAF50';
                    codeInput.disabled = true;
                    showNotification('Verification successful!', 'success');
                    
                    pendingVerificationCode = code;
                    
                    if (action === 'signup') {
                        setTimeout(function() {
                            modal.remove();
                            if (typeof pendingCallback === 'function') {
                                pendingCallback(result, code);
                            }
                            showNotification('Email verified! Please sign in.', 'success');
                            setTimeout(function() {
                                window.location.reload();
                            }, 500);
                            isVerifying = false;
                            verificationDone = false;
                        }, 800);
                        return;
                    }
                    
                    if (action === 'signin') {
                        if (result.token) {
                            API_MANAGER.setToken(result.token);
                            showNotification('Signed in successfully!', 'success');
                            setTimeout(function() {
                                modal.remove();
                                if (typeof pendingCallback === 'function') {
                                    pendingCallback(result, code);
                                }
                                checkAuthStatus();
                                isVerifying = false;
                                verificationDone = false;
                            }, 500);
                        } else {
                            showNotification('Verification failed: No token received.', 'error');
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Verify';
                            submitBtn.style.backgroundColor = '';
                            isVerifying = false;
                        }
                        return;
                    }
                    
                    if (action === 'reset') {
                        setTimeout(function() {
                            modal.remove();
                            if (typeof pendingCallback === 'function') {
                                pendingCallback(result, code);
                            }
                            isVerifying = false;
                            verificationDone = false;
                        }, 500);
                        return;
                    }
                    
                    if (action === 'email' || action === 'password' || action === 'delete') {
                        setTimeout(function() {
                            modal.remove();
                            if (typeof pendingCallback === 'function') {
                                pendingCallback(result, code);
                            }
                            isVerifying = false;
                            verificationDone = false;
                        }, 500);
                        return;
                    }
                    
                    setTimeout(function() {
                        modal.remove();
                        if (typeof pendingCallback === 'function') {
                            pendingCallback(result, code);
                        }
                        checkAuthStatus();
                        isVerifying = false;
                        verificationDone = false;
                    }, 800);
                } else {
                    showNotification(result.message || 'Invalid code.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Verify';
                    submitBtn.style.backgroundColor = '';
                    isVerifying = false;
                    codeInput.value = '';
                    codeInput.focus();
                }
            }).catch(function(error) {
                showNotification(error.message || 'Verification error. Please try again.', 'error');
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
            API_MANAGER.sendVerificationCode(email, action).then(function(result) {
                if (result.success) {
                    showNotification('New code sent! Check your email.', 'success');
                } else {
                    showNotification(result.message || 'Error sending code.', 'error');
                }
            }).catch(function() {
                showNotification('Error sending code.', 'error');
            });
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                isVerifying = false;
                verificationDone = false;
                // REFRESH PAGE FOR ALL ACTIONS when clicking outside
                window.location.reload();
            }
        });
    }

    // ============================================================
    // UPDATE UI FOR LOGGED IN USER
    // ============================================================
    function updateUIForLoggedInUser() {
        var authBtn = $('authBtn');
        var historyNavBtn = $('historyNavBtn');
        
        if (authBtn && currentUser) {
            authBtn.innerHTML = '<i class="fas fa-user-circle"></i> <span>' + currentUser.username + '</span>';
            addClass(authBtn, 'logged-in');
        }
        if (historyNavBtn && currentUser) {
            historyNavBtn.style.display = 'flex';
            historyNavBtn.innerHTML = '<i class="fas fa-history"></i> <span>History</span>';
        }
    }

    // ============================================================
    // AUTH STATE - FIXED: No auto-login without token
    // ============================================================
    function checkAuthStatus() {
        if (authCheckInProgress) return;
        authCheckInProgress = true;
        
        var token = API_MANAGER.getToken();
        var authBtn = $('authBtn');
        var historyNavBtn = $('historyNavBtn');
        
        if (!token) {
            isLoggedIn = false;
            currentUser = null;
            localStorage.removeItem('cachedUser');
            if (authBtn) {
                authBtn.innerHTML = '<i class="fas fa-user"></i> <span>Sign In</span>';
                removeClass(authBtn, 'logged-in');
            }
            if (historyNavBtn) {
                historyNavBtn.style.display = 'none';
            }
            authCheckInProgress = false;
            initialAuthCheckDone = true;
            return;
        }
        
        API_MANAGER.getMe().then(function(response) {
            authCheckInProgress = false;
            initialAuthCheckDone = true;
            if (response.success && response.data) {
                var user = response.data;
                currentUser = {
                    id: user._id || user.id,
                    email: user.email,
                    username: user.username || generateUsernameFromEmail(user.email),
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin,
                    isVerified: user.isVerified
                };
                isLoggedIn = true;
                updateUIForLoggedInUser();
                localStorage.setItem('cachedUser', JSON.stringify(user));
            } else {
                API_MANAGER.setToken(null);
                localStorage.removeItem('cachedUser');
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
        }).catch(function(error) {
            authCheckInProgress = false;
            initialAuthCheckDone = true;
            if (error.status === 401) {
                API_MANAGER.setToken(null);
                localStorage.removeItem('cachedUser');
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
            
            var cachedUser = localStorage.getItem('cachedUser');
            if (cachedUser) {
                try {
                    var user = JSON.parse(cachedUser);
                    currentUser = {
                        id: user._id || user.id,
                        email: user.email,
                        username: user.username || generateUsernameFromEmail(user.email),
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin,
                        isVerified: user.isVerified
                    };
                    isLoggedIn = true;
                    updateUIForLoggedInUser();
                } catch(e) {
                    API_MANAGER.setToken(null);
                    localStorage.removeItem('cachedUser');
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
            } else {
                API_MANAGER.setToken(null);
                localStorage.removeItem('cachedUser');
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
        });
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
    // AUTH FORM SUBMIT - COMPLETE FIXED
    // ============================================================
    function setupAuthForm() {
        var authForm = $('authForm');
        var authSubmitBtn = $('authSubmitBtn');
        var authModal = $('authModal');
        
        if (!authForm) return;
        
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            var email = $('authEmail').value.trim();
            var password = $('authPassword') ? $('authPassword').value.trim() : '';
            
            // ============================================================
            // SIGN IN
            // ============================================================
            if (currentMode === 'login') {
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Signing in...';

                API_MANAGER.signin(email, password).then(function(response) {
                    if (response.success) {
                        if (response.token) {
                            API_MANAGER.setToken(response.token);
                            API_MANAGER.fullSync().then(function(data) {
                                showNotification('Signed in successfully!', 'success');
                                checkAuthStatus();
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Sign In';
                                if (authModal) authModal.style.display = 'none';
                            }).catch(function() {
                                showNotification('Signed in successfully!', 'success');
                                checkAuthStatus();
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Sign In';
                                if (authModal) authModal.style.display = 'none';
                            });
                        } else {
                            showNotification(response.message || 'Sign in failed.', 'error');
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Sign In';
                        }
                    } else {
                        if (response.requiresVerification) {
                            showNotification('Please verify your identity. Code sent!', 'warning');
                            if (authModal) authModal.style.display = 'none';
                            sendVerificationCode(email, 'signin').then(function(codeResult) {
                                if (codeResult.success) {
                                    openVerificationModal(email, 'signin', function(result, code) {
                                        if (result.success && result.token) {
                                            API_MANAGER.setToken(result.token);
                                            showNotification('Signed in successfully!', 'success');
                                            checkAuthStatus();
                                        }
                                    });
                                }
                            });
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Sign In';
                            return;
                        }
                        
                        if (response.message && response.message.toLowerCase().includes('account not found')) {
                            showNotification('Account not found. Please create an account.', 'error');
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Sign In';
                            setTimeout(function() { 
                                if (authModal) authModal.style.display = 'none';
                                openModal('signup');
                            }, 1500);
                        } else {
                            showNotification(response.message || 'Sign in failed. Please try again.', 'error');
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Sign In';
                        }
                    }
                }).catch(function(error) {
                    if (error.status === 404) {
                        showNotification('Account not found. Please create an account.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                        setTimeout(function() { 
                            if (authModal) authModal.style.display = 'none';
                            openModal('signup');
                        }, 1500);
                    } else if (error.data && error.data.requiresVerification) {
                        showNotification('Please verify your identity. Code sent!', 'warning');
                        if (authModal) authModal.style.display = 'none';
                        sendVerificationCode(email, 'signin').then(function(codeResult) {
                            if (codeResult.success) {
                                openVerificationModal(email, 'signin', function(result, code) {
                                    if (result.success && result.token) {
                                        API_MANAGER.setToken(result.token);
                                        showNotification('Signed in successfully!', 'success');
                                        checkAuthStatus();
                                    }
                                });
                            }
                        });
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                    } else if (error.status === 401) {
                        showNotification('Incorrect password. Please try again.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                    } else {
                        var result = DATA_MANAGER.login(email, password);
                        if (result.success) {
                            sendVerificationCode(email, 'signin').then(function(codeResult) {
                                if (!codeResult.success) {
                                    showNotification('Error sending code.', 'error');
                                    authSubmitBtn.disabled = false;
                                    authSubmitBtn.textContent = 'Sign In';
                                    return;
                                }
                                if (authModal) authModal.style.display = 'none';
                                openVerificationModal(email, 'signin', function(result, code) {
                                    showNotification('Signed in!', 'success');
                                    checkAuthStatus();
                                    authSubmitBtn.disabled = false;
                                    authSubmitBtn.textContent = 'Sign In';
                                });
                            });
                        } else {
                            if (result.error && result.error.toLowerCase().includes('account not found')) {
                                showNotification('Account not found. Please create an account.', 'error');
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Sign In';
                                setTimeout(function() { 
                                    if (authModal) authModal.style.display = 'none';
                                    openModal('signup');
                                }, 1500);
                            } else {
                                showNotification(result.error || 'Sign in failed. Please try again.', 'error');
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Sign In';
                            }
                        }
                    }
                });
                
            // ============================================================
            // RESET PASSWORD
            // ============================================================
            } else if (currentMode === 'reset') {
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Checking email...';
                
                API_MANAGER.checkEmailExists(email).then(function(checkResult) {
                    if (!checkResult.success) {
                        showNotification('Email not registered. Please create an account.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        return;
                    }
                    
                    authSubmitBtn.textContent = 'Sending reset code...';
                    API_MANAGER.sendVerificationCode(email, 'reset').then(function(result) {
                        if (result.success) {
                            if (authModal) authModal.style.display = 'none';
                            showNotification('Verification code sent! Check your email.', 'success');
                            
                            openVerificationModal(email, 'reset', function(verifyResult, code) {
                                if (verifyResult.success) {
                                    showPasswordResetModal().then(function(newPassword) {
                                        if (newPassword === null) {
                                            showNotification('Password reset cancelled.', 'info');
                                            authSubmitBtn.disabled = false;
                                            authSubmitBtn.textContent = 'Send Reset Code';
                                            return;
                                        }
                                        
                                        authSubmitBtn.textContent = 'Resetting password...';
                                        
                                        API_MANAGER.resetPassword(email, newPassword, code).then(function(resetResponse) {
                                            if (resetResponse.success) {
                                                showNotification('Password reset successfully! Please sign in with your new password.', 'success');
                                                authSubmitBtn.disabled = false;
                                                authSubmitBtn.textContent = 'Send Reset Code';
                                                setTimeout(function() {
                                                    window.location.reload();
                                                }, 500);
                                            } else {
                                                showNotification(resetResponse.message || 'Failed to reset password. Please try again.', 'error');
                                                authSubmitBtn.disabled = false;
                                                authSubmitBtn.textContent = 'Send Reset Code';
                                            }
                                        }).catch(function(error) {
                                            if (error.data && error.data.message && error.data.message.toLowerCase().includes('different from your current')) {
                                                showNotification('New password must be different from your current password.', 'error');
                                            } else {
                                                showNotification(error.message || 'Failed to reset password. Please try again.', 'error');
                                            }
                                            authSubmitBtn.disabled = false;
                                            authSubmitBtn.textContent = 'Send Reset Code';
                                            setTimeout(function() {
                                                showPasswordResetModal().then(function(retryPassword) {
                                                    if (retryPassword !== null) {
                                                        API_MANAGER.resetPassword(email, retryPassword, code).then(function(retryResponse) {
                                                            if (retryResponse.success) {
                                                                showNotification('Password reset successfully! Please sign in with your new password.', 'success');
                                                                authSubmitBtn.disabled = false;
                                                                authSubmitBtn.textContent = 'Send Reset Code';
                                                                setTimeout(function() {
                                                                    window.location.reload();
                                                                }, 500);
                                                            } else {
                                                                showNotification(retryResponse.message || 'Failed to reset password. Please try again.', 'error');
                                                                authSubmitBtn.disabled = false;
                                                                authSubmitBtn.textContent = 'Send Reset Code';
                                                            }
                                                        }).catch(function(retryError) {
                                                            showNotification(retryError.message || 'Failed to reset password. Please try again.', 'error');
                                                            authSubmitBtn.disabled = false;
                                                            authSubmitBtn.textContent = 'Send Reset Code';
                                                        });
                                                    } else {
                                                        showNotification('Password reset cancelled.', 'info');
                                                        authSubmitBtn.disabled = false;
                                                        authSubmitBtn.textContent = 'Send Reset Code';
                                                    }
                                                });
                                            }, 1000);
                                        });
                                    });
                                } else {
                                    showNotification('Verification failed. Please try again.', 'error');
                                    authSubmitBtn.disabled = false;
                                    authSubmitBtn.textContent = 'Send Reset Code';
                                }
                            });
                        } else {
                            showNotification(result.message || 'Error sending reset code. Please try again.', 'error');
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Send Reset Code';
                        }
                    }).catch(function(error) {
                        showNotification('Error sending reset code. Please try again.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                    });
                }).catch(function(error) {
                    if (error.status === 404) {
                        showNotification('Email not registered. Please create an account.', 'error');
                    } else {
                        showNotification('Error checking email. Please try again.', 'error');
                    }
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                });
                
            // ============================================================
            // SIGN UP
            // ============================================================
            } else if (currentMode === 'signup') {
                var confirmPassword = $('authConfirmPassword') ? $('authConfirmPassword').value : '';
                var username = generateUsernameFromEmail(email);
                
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
                    showNotification('Invalid email address.', 'error');
                    return;
                }
                
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Creating account...';
                
                API_MANAGER.signup(email, password, username).then(function(response) {
                    if (response.success) {
                        authSubmitBtn.textContent = 'Sending verification code...';
                        API_MANAGER.sendVerificationCode(email, 'signup').then(function(codeResult) {
                            if (codeResult.success) {
                                if (authModal) authModal.style.display = 'none';
                                showNotification('Account created! Please verify your email.', 'success');
                                
                                openVerificationModal(email, 'signup', function(result, code) {
                                    if (result.success) {
                                        showNotification('Email verified! Please sign in.', 'success');
                                        setTimeout(function() {
                                            window.location.reload();
                                        }, 500);
                                    }
                                });
                            } else {
                                showNotification('Account created but verification failed. Please try signing in.', 'warning');
                                authSubmitBtn.disabled = false;
                                authSubmitBtn.textContent = 'Create Account';
                                if (authModal) authModal.style.display = 'none';
                                openModal('login');
                            }
                        });
                    } else {
                        if (response.message && response.message.toLowerCase().includes('already registered')) {
                            showNotification('Email already registered. Redirecting to Sign In...', 'error');
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Create Account';
                            setTimeout(function() {
                                if (authModal) authModal.style.display = 'none';
                                openModal('login');
                            }, 1500);
                        } else {
                            showNotification(response.message || 'Error creating account. Please try again.', 'error');
                            authSubmitBtn.disabled = false;
                            authSubmitBtn.textContent = 'Create Account';
                        }
                    }
                }).catch(function(error) {
                    var errorMsg = error.message || '';
                    if (errorMsg.toLowerCase().includes('already registered')) {
                        showNotification('Email already registered. Redirecting to Sign In...', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Create Account';
                        setTimeout(function() {
                            if (authModal) authModal.style.display = 'none';
                            openModal('login');
                        }, 1500);
                    } else {
                        showNotification(errorMsg || 'Error creating account. Please try again.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Create Account';
                    }
                });
            }
        });
    }

    // ============================================================
    // PROFILE MENU - FIXED: Better click/touch handling
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
                    '<strong style="color:var(--text-primary);font-size:0.9rem;">' + (currentUser.username || currentUser.email.split('@')[0]) + '</strong>' +
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
                var handler = function(e) {
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
                };
                item.addEventListener('click', handler);
                item.addEventListener('touchstart', handler, { passive: false });
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
        }, 50);
    }

    // ============================================================
    // LOGOUT
    // ============================================================
    function logoutUser() {
        API_MANAGER.logout().then(function() {
            API_MANAGER.setToken(null);
            localStorage.removeItem('cachedUser');
            localStorage.removeItem('cachedHistory');
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
        }).catch(function() {
            API_MANAGER.setToken(null);
            localStorage.removeItem('cachedUser');
            localStorage.removeItem('cachedHistory');
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
        });
    }

    // ============================================================
    // PROFILE MODAL
    // ============================================================
    function openProfileModal() {
        var user = currentUser || DATA_MANAGER.getCurrentUser();
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
                    '<h2>' + (user.username || user.email.split('@')[0]) + '</h2>' +
                    '<p>' + user.email + '</p>' +
                    '<span class="profile-badge">Verified Account</span>' +
                '</div>' +
                '<div class="profile-info">' +
                    '<div class="info-item"><strong>Username:</strong> ' + (user.username || user.email.split('@')[0]) + '</div>' +
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
    // ACCOUNT SETTINGS - COMPLETE FIXED
    // ============================================================
    function openAccountSettings() {
        var user = currentUser || DATA_MANAGER.getCurrentUser();
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
                        '<label>Username (Auto-generated)</label>' +
                        '<input type="text" id="settingsUsername" value="' + (user.username || user.email.split('@')[0]) + '" disabled style="opacity:0.7;cursor:not-allowed;">' +
                        '<small style="color: #888; font-size: 12px;">Username is auto-generated from email and cannot be changed</small>' +
                    '</div>' +
                    '<div class="settings-field">' +
                        '<label>Email</label>' +
                        '<input type="email" id="settingsEmail" value="' + user.email + '">' +
                        '<small style="color: #888; font-size: 12px;">Changing email will auto-update username and require re-verification</small>' +
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
        
        var saveBtn = modal.querySelector('#saveSettingsBtn');
        var deleteBtn = modal.querySelector('#deleteAccountBtn');
        
        bindClick(saveBtn, function() {
            var newEmail = $('settingsEmail').value;
            var currentPassword = $('settingsCurrentPassword').value;
            var newPassword = $('settingsNewPassword').value;
            var confirmPassword = $('settingsConfirmPassword').value;
            
            if (!currentPassword) {
                showNotification('Current password is required to save changes.', 'error');
                return;
            }
            
            if (newEmail && newEmail !== user.email) {
                if (!DATA_MANAGER.validateEmail(newEmail)) {
                    showNotification('Invalid email address.', 'error');
                    return;
                }
                
                saveBtn.disabled = true;
                saveBtn.textContent = 'Verifying password...';
                
                API_MANAGER.verifyPassword(currentPassword).then(function(verifyResult) {
                    if (!verifyResult.success) {
                        showNotification('Current password is incorrect.', 'error');
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Save Changes';
                        return;
                    }
                    
                    saveBtn.textContent = 'Checking email...';
                    API_MANAGER.checkEmailExists(newEmail).then(function(checkResult) {
                        if (checkResult.success) {
                            showNotification('Email already registered. Please use a different email.', 'error');
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save Changes';
                            return;
                        }
                        
                        saveBtn.textContent = 'Sending verification code...';
                        API_MANAGER.sendVerificationCode(newEmail, 'email').then(function(result) {
                            if (!result.success) {
                                showNotification('Failed to send verification code. Please try again.', 'error');
                                saveBtn.disabled = false;
                                saveBtn.textContent = 'Save Changes';
                                return;
                            }
                            
                            openVerificationModal(newEmail, 'email', function(verifyResult, code) {
                                if (verifyResult.success) {
                                    saveBtn.textContent = 'Updating email...';
                                    API_MANAGER.changeEmail(newEmail, currentPassword).then(function(response) {
                                        if (response.success) {
                                            showNotification('Email updated successfully! Username auto-updated.', 'success');
                                            user.email = newEmail;
                                            user.username = response.data.username || generateUsernameFromEmail(newEmail);
                                            localStorage.setItem('cachedUser', JSON.stringify({
                                                _id: user.id,
                                                email: user.email,
                                                username: user.username
                                            }));
                                            checkAuthStatus();
                                            saveBtn.disabled = false;
                                            saveBtn.textContent = 'Save Changes';
                                            modal.remove();
                                            setTimeout(function() {
                                                window.location.reload();
                                            }, 500);
                                        } else {
                                            showNotification(response.message || 'Failed to update email. Please try again.', 'error');
                                            saveBtn.disabled = false;
                                            saveBtn.textContent = 'Save Changes';
                                        }
                                    }).catch(function(error) {
                                        showNotification(error.message || 'Failed to update email. Please try again.', 'error');
                                        saveBtn.disabled = false;
                                        saveBtn.textContent = 'Save Changes';
                                    });
                                } else {
                                    showNotification('Verification failed. Please try again.', 'error');
                                    saveBtn.disabled = false;
                                    saveBtn.textContent = 'Save Changes';
                                }
                            });
                        });
                    }).catch(function(error) {
                        if (error.status === 404) {
                            saveBtn.textContent = 'Sending verification code...';
                            API_MANAGER.sendVerificationCode(newEmail, 'email').then(function(result) {
                                if (!result.success) {
                                    showNotification('Failed to send verification code. Please try again.', 'error');
                                    saveBtn.disabled = false;
                                    saveBtn.textContent = 'Save Changes';
                                    return;
                                }
                                
                                openVerificationModal(newEmail, 'email', function(verifyResult, code) {
                                    if (verifyResult.success) {
                                        saveBtn.textContent = 'Updating email...';
                                        API_MANAGER.changeEmail(newEmail, currentPassword).then(function(response) {
                                            if (response.success) {
                                                showNotification('Email updated successfully! Username auto-updated.', 'success');
                                                user.email = newEmail;
                                                user.username = response.data.username || generateUsernameFromEmail(newEmail);
                                                localStorage.setItem('cachedUser', JSON.stringify({
                                                    _id: user.id,
                                                    email: user.email,
                                                    username: user.username
                                                }));
                                                checkAuthStatus();
                                                saveBtn.disabled = false;
                                                saveBtn.textContent = 'Save Changes';
                                                modal.remove();
                                                setTimeout(function() {
                                                    window.location.reload();
                                                }, 500);
                                            } else {
                                                showNotification(response.message || 'Failed to update email. Please try again.', 'error');
                                                saveBtn.disabled = false;
                                                saveBtn.textContent = 'Save Changes';
                                            }
                                        }).catch(function(error) {
                                            showNotification(error.message || 'Failed to update email. Please try again.', 'error');
                                            saveBtn.disabled = false;
                                            saveBtn.textContent = 'Save Changes';
                                        });
                                    } else {
                                        showNotification('Verification failed. Please try again.', 'error');
                                        saveBtn.disabled = false;
                                        saveBtn.textContent = 'Save Changes';
                                    }
                                });
                            });
                        } else {
                            showNotification('Error checking email. Please try again.', 'error');
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save Changes';
                        }
                    });
                }).catch(function(error) {
                    showNotification('Current password is incorrect.', 'error');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Changes';
                });
                return;
            }
            
            if (newPassword || confirmPassword) {
                if (newPassword !== confirmPassword) {
                    showNotification('Passwords do not match!', 'error');
                    return;
                }
                if (newPassword === currentPassword) {
                    showNotification('New password must be different from current password.', 'error');
                    return;
                }
                if (newPassword.length < 8) {
                    showNotification('Password must be at least 8 characters.', 'error');
                    return;
                }
                var validation = DATA_MANAGER.validatePasswordStrength(newPassword);
                if (!validation.valid) {
                    showNotification(validation.message, 'error');
                    return;
                }
                
                saveBtn.disabled = true;
                saveBtn.textContent = 'Verifying current password...';
                
                API_MANAGER.verifyPassword(currentPassword).then(function(verifyResult) {
                    if (!verifyResult.success) {
                        showNotification('Current password is incorrect.', 'error');
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Save Changes';
                        return;
                    }
                    
                    saveBtn.textContent = 'Sending verification code...';
                    API_MANAGER.sendVerificationCode(user.email, 'password').then(function(result) {
                        if (!result.success) {
                            showNotification('Failed to send verification code. Please try again.', 'error');
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save Changes';
                            return;
                        }
                        
                        openVerificationModal(user.email, 'password', function(verifyResult, code) {
                            if (verifyResult.success) {
                                saveBtn.textContent = 'Updating password...';
                                API_MANAGER.changePassword(currentPassword, newPassword).then(function(response) {
                                    if (response.success) {
                                        showNotification('Password updated successfully!', 'success');
                                        saveBtn.disabled = false;
                                        saveBtn.textContent = 'Save Changes';
                                        modal.remove();
                                        setTimeout(function() {
                                            window.location.reload();
                                        }, 500);
                                    } else {
                                        showNotification(response.message || 'Failed to update password. Please try again.', 'error');
                                        saveBtn.disabled = false;
                                        saveBtn.textContent = 'Save Changes';
                                    }
                                }).catch(function(error) {
                                    showNotification(error.message || 'Failed to update password. Please try again.', 'error');
                                    saveBtn.disabled = false;
                                    saveBtn.textContent = 'Save Changes';
                                });
                            } else {
                                showNotification('Verification failed. Please try again.', 'error');
                                saveBtn.disabled = false;
                                saveBtn.textContent = 'Save Changes';
                            }
                        });
                    });
                }).catch(function(error) {
                    showNotification('Current password is incorrect.', 'error');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Changes';
                });
                return;
            }
            
            showNotification('No changes made.', 'info');
            modal.remove();
        });
        
        bindClick(deleteBtn, function() {
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
                    
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = 'Verifying password...';
                    
                    API_MANAGER.verifyPassword(password).then(function(verifyResult) {
                        if (!verifyResult.success) {
                            showNotification('Password is incorrect.', 'error');
                            deleteBtn.disabled = false;
                            deleteBtn.textContent = 'Delete Account';
                            return;
                        }
                        
                        deleteBtn.textContent = 'Sending verification code...';
                        API_MANAGER.sendVerificationCode(user.email, 'delete').then(function(result) {
                            if (!result.success) {
                                showNotification('Failed to send verification code. Please try again.', 'error');
                                deleteBtn.disabled = false;
                                deleteBtn.textContent = 'Delete Account';
                                return;
                            }
                            
                            deleteBtn.textContent = 'Verifying...';
                            openVerificationModal(user.email, 'delete', function(verifyResult, code) {
                                if (verifyResult.success) {
                                    deleteBtn.textContent = 'Deleting account...';
                                    API_MANAGER.deleteAccount(password).then(function(response) {
                                        if (response.success) {
                                            API_MANAGER.setToken(null);
                                            localStorage.removeItem('cachedUser');
                                            localStorage.removeItem('cachedHistory');
                                            showNotification('Account deleted successfully.', 'success');
                                            deleteBtn.disabled = false;
                                            deleteBtn.textContent = 'Delete Account';
                                            modal.remove();
                                            isLoggedIn = false;
                                            currentUser = null;
                                            var authBtn = $('authBtn');
                                            if (authBtn) {
                                                authBtn.innerHTML = '<i class="fas fa-user"></i> <span>Sign In</span>';
                                                removeClass(authBtn, 'logged-in');
                                            }
                                            var historyNavBtn = $('historyNavBtn');
                                            if (historyNavBtn) {
                                                historyNavBtn.style.display = 'none';
                                            }
                                            window.location.reload();
                                        } else {
                                            showNotification(response.message || 'Failed to delete account. Please try again.', 'error');
                                            deleteBtn.disabled = false;
                                            deleteBtn.textContent = 'Delete Account';
                                        }
                                    }).catch(function(error) {
                                        showNotification(error.message || 'Failed to delete account. Please try again.', 'error');
                                        deleteBtn.disabled = false;
                                        deleteBtn.textContent = 'Delete Account';
                                    });
                                } else {
                                    showNotification('Verification failed. Please try again.', 'error');
                                    deleteBtn.disabled = false;
                                    deleteBtn.textContent = 'Delete Account';
                                }
                            });
                        });
                    }).catch(function(error) {
                        showNotification('Password is incorrect.', 'error');
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = 'Delete Account';
                    });
                });
            });
        });
    }

    // ============================================================
    // HISTORY MODAL
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
                API_MANAGER.clearHistory().then(function(response) {
                    if (response.success) {
                        localStorage.removeItem('cachedHistory');
                        loadHistoryModal();
                        showNotification('All history deleted.', 'info');
                    } else {
                        showNotification(response.message || 'Error deleting history.', 'error');
                    }
                }).catch(function() {
                    showNotification('Error deleting history.', 'error');
                });
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
        
        API_MANAGER.getHistory().then(function(response) {
            if (response.success && response.data) {
                var history = response.data;
                if (!history || history.length === 0) {
                    historyList.innerHTML = '<p class="empty-history">No translations yet.</p>';
                    return;
                }
                var html = '';
                for (var i = 0; i < history.length; i++) {
                    var item = history[i];
                    var time = new Date(item.createdAt || item.timestamp).toLocaleString();
                    html += 
                        '<div class="history-item" data-id="' + (item._id || item.id) + '">' +
                            '<button class="h-delete" data-id="' + (item._id || item.id) + '" title="Delete this translation"><i class="fas fa-times"></i></button>' +
                            '<div class="h-source">' + getLanguageName(item.sourceLang || item.sourceLanguage) + ' → ' + getLanguageName(item.targetLang || item.targetLanguage) + '<span class="h-time">' + time + '</span></div>' +
                            '<div class="h-original">"' + (item.original || item.sourceText || '').substring(0, 60) + ((item.original || item.sourceText || '').length > 60 ? '...' : '') + '"</div>' +
                            '<div class="h-translation">"' + (item.translated || item.translatedText || '').substring(0, 60) + ((item.translated || item.translatedText || '').length > 60 ? '...' : '') + '"</div>' +
                        '</div>';
                }
                historyList.innerHTML = html;
                
                var deleteBtns = historyList.querySelectorAll('.h-delete');
                for (var j = 0; j < deleteBtns.length; j++) {
                    (function(btn) {
                        btn.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(this);
                        });
                        
                        btn.addEventListener('touchstart', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(this);
                        }, { passive: false });
                    })(deleteBtns[j]);
                }
                
                function handleDeleteClick(btnElement) {
                    var id = btnElement.getAttribute('data-id');
                    if (!id) {
                        var parent = btnElement.closest('.history-item');
                        if (parent) {
                            id = parent.getAttribute('data-id');
                        }
                    }
                    if (!id) {
                        showNotification('Error: Could not identify history item.', 'error');
                        return;
                    }
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
                        API_MANAGER.deleteHistoryItem(id).then(function(response) {
                            if (response.success) {
                                localStorage.removeItem('cachedHistory');
                                loadHistoryModal();
                                showNotification('History item deleted.', 'info');
                            } else {
                                showNotification(response.message || 'Error deleting history item.', 'error');
                            }
                        }).catch(function() {
                            showNotification('Error deleting history item.', 'error');
                        });
                    });
                }
            } else {
                historyList.innerHTML = '<p class="empty-history">Could not load history.</p>';
            }
        }).catch(function() {
            var cached = localStorage.getItem('cachedHistory');
            if (cached) {
                try {
                    var history = JSON.parse(cached);
                    if (!history || history.length === 0) {
                        historyList.innerHTML = '<p class="empty-history">No translations yet.</p>';
                        return;
                    }
                    var html = '';
                    for (var i = 0; i < history.length; i++) {
                        var item = history[i];
                        var time = new Date(item.createdAt || item.timestamp).toLocaleString();
                        html += 
                            '<div class="history-item" data-id="' + (item._id || item.id) + '">' +
                                '<button class="h-delete" data-id="' + (item._id || item.id) + '" title="Delete this translation"><i class="fas fa-times"></i></button>' +
                                '<div class="h-source">' + getLanguageName(item.sourceLang || item.sourceLanguage) + ' → ' + getLanguageName(item.targetLang || item.targetLanguage) + '<span class="h-time">' + time + '</span></div>' +
                                '<div class="h-original">"' + (item.original || item.sourceText || '').substring(0, 60) + ((item.original || item.sourceText || '').length > 60 ? '...' : '') + '"</div>' +
                                '<div class="h-translation">"' + (item.translated || item.translatedText || '').substring(0, 60) + ((item.translated || item.translatedText || '').length > 60 ? '...' : '') + '"</div>' +
                            '</div>';
                    }
                    historyList.innerHTML = html;
                } catch(e) {
                    historyList.innerHTML = '<p class="empty-history">Could not load history.</p>';
                }
            } else {
                historyList.innerHTML = '<p class="empty-history">Could not load history.</p>';
            }
        });
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
        API_MANAGER.saveHistory(entry).then(function(response) {
            if (response.success) {
                var cached = localStorage.getItem('cachedHistory');
                if (cached) {
                    try {
                        var history = JSON.parse(cached);
                        history.unshift(response.data || entry);
                        if (history.length > 100) {
                            history = history.slice(0, 100);
                        }
                        localStorage.setItem('cachedHistory', JSON.stringify(history));
                    } catch(e) {}
                }
            }
        }).catch(function() {});
    }

    // ============================================================
    // THEME TOGGLE
    // ============================================================
    function setupThemeToggle() {
        var themeToggle = $('themeToggle');
        if (themeToggle) {
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
        isProcessingRecording = false;
        lastSpeechTime = null;
        
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

        translateFromBtn = document.createElement('button');
        translateFromBtn.className = 'translate-from-btn';
        translateFromBtn.textContent = 'Translate from: ';
        translateFromContainer.appendChild(translateFromBtn);

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
                    ensureDifferentLanguages();
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
            
            ensureDifferentLanguages();
            
            var sourceLangCode = sourceLang ? sourceLang.value : 'en';
            var targetLangCode = targetLang ? targetLang.value : 'en';
            
            if (sourceLangCode === targetLangCode) {
                var allLangs = LANGUAGES.map(function(l) { return l.code; });
                for (var i = 0; i < allLangs.length; i++) {
                    if (allLangs[i] !== sourceLangCode) {
                        targetLangCode = allLangs[i];
                        targetLang.value = targetLangCode;
                        break;
                    }
                }
            }
            
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
            finalTranscript = '';
            interimTranscript = '';
        });

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
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                    silenceTimeout = null;
                }
                if (micBtn) {
                    removeClass(micBtn, 'recording');
                    micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                    if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                }
                resetTranslateFromBtn();
                if (finalTranscript.trim() && !isProcessingRecording) {
                    isProcessingRecording = true;
                    var text = finalTranscript.trim();
                    inputText.value = text;
                    finalTranscript = '';
                    interimTranscript = '';
                    performTranslation();
                    setTimeout(function() {
                        isProcessingRecording = false;
                    }, 500);
                }
                finalTranscript = '';
                interimTranscript = '';
                lastSpeechTime = null;
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
                recognition.maxAlternatives = 3;
                
                recognition.onstart = function() {
                    isRecording = true;
                    finalTranscript = '';
                    interimTranscript = '';
                    isProcessingRecording = false;
                    lastSpeechTime = Date.now();
                    
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                        silenceTimeout = null;
                    }
                    
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
                        recordingTimeout = null;
                    }
                };
                
                recognition.onresult = function(event) {
                    lastSpeechTime = Date.now();
                    
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                        silenceTimeout = null;
                    }
                    
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
                        if (finalTranscript) {
                            finalTranscript += ' ' + currentFinal;
                        } else {
                            finalTranscript = currentFinal;
                        }
                    }
                    
                    if (currentInterim || finalTranscript) {
                        var displayText = (finalTranscript + ' ' + currentInterim).trim();
                        if (inputText && !isProcessingRecording) {
                            inputText.value = displayText;
                        }
                        if (translateBtn && !isProcessingRecording) {
                            translateBtn.disabled = true;
                            translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
                        }
                        if (!isProcessingRecording) {
                            performTranslation();
                        }
                    }
                    
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                    }
                    silenceTimeout = setTimeout(function() {
                        if (isRecording && lastSpeechTime) {
                            var timeSinceLastSpeech = Date.now() - lastSpeechTime;
                            if (timeSinceLastSpeech >= 60000) {
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
                                    if (finalTranscript.trim() && !isProcessingRecording) {
                                        isProcessingRecording = true;
                                        var text = finalTranscript.trim();
                                        inputText.value = text;
                                        finalTranscript = '';
                                        interimTranscript = '';
                                        performTranslation();
                                        setTimeout(function() {
                                            isProcessingRecording = false;
                                        }, 500);
                                    }
                                    finalTranscript = '';
                                    interimTranscript = '';
                                    lastSpeechTime = null;
                                    showNotification('⏹ Recording stopped due to 60 seconds of silence.', 'info', 3000);
                                }
                            }
                        }
                        silenceTimeout = null;
                    }, 61000);
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
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                        silenceTimeout = null;
                    }
                    if (recordingTimeout) {
                        clearTimeout(recordingTimeout);
                        recordingTimeout = null;
                    }
                    
                    if (isRecording) {
                        isRecording = false;
                        if (micBtn) {
                            removeClass(micBtn, 'recording');
                            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                        }
                        if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                        resetTranslateFromBtn();
                        if (finalTranscript.trim() && !isProcessingRecording) {
                            isProcessingRecording = true;
                            var text = finalTranscript.trim();
                            inputText.value = text;
                            finalTranscript = '';
                            interimTranscript = '';
                            performTranslation();
                            setTimeout(function() {
                                isProcessingRecording = false;
                            }, 500);
                        }
                        finalTranscript = '';
                        interimTranscript = '';
                        lastSpeechTime = null;
                    } else {
                        if (micBtn) {
                            removeClass(micBtn, 'recording');
                            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                        }
                        if (recordingStatus) recordingStatus.textContent = 'Click mic to start';
                        resetTranslateFromBtn();
                        if (finalTranscript.trim() && !isProcessingRecording) {
                            isProcessingRecording = true;
                            var text = finalTranscript.trim();
                            inputText.value = text;
                            finalTranscript = '';
                            interimTranscript = '';
                            performTranslation();
                            setTimeout(function() {
                                isProcessingRecording = false;
                            }, 500);
                        }
                        finalTranscript = '';
                        interimTranscript = '';
                        lastSpeechTime = null;
                    }
                };
            }
            
            initRecognition();
            
            bindClick(micBtn, function() {
                if (isRecording) {
                    isRecording = false;
                    isProcessingRecording = false;
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                        silenceTimeout = null;
                    }
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
                    
                    if (finalTranscript.trim() && !isProcessingRecording) {
                        isProcessingRecording = true;
                        var text = finalTranscript.trim();
                        inputText.value = text;
                        finalTranscript = '';
                        interimTranscript = '';
                        performTranslation();
                        setTimeout(function() {
                            isProcessingRecording = false;
                        }, 500);
                    }
                    finalTranscript = '';
                    interimTranscript = '';
                    lastSpeechTime = null;
                } else {
                    var lang = sourceLang ? sourceLang.value || 'en' : 'en';
                    var langName = getLanguageName(lang);
                    currentRecordingLang = lang;
                    isProcessingRecording = false;
                    finalTranscript = '';
                    interimTranscript = '';
                    lastSpeechTime = Date.now();
                    
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                        silenceTimeout = null;
                    }
                    
                    if (recognition) {
                        recognition.lang = lang;
                        recognition.continuous = true;
                        try {
                            recognition.start();
                            showNotification('🎤 Listening in ' + langName + '...', 'info', 2000);
                        } catch (e) {
                            initRecognition();
                            if (recognition) {
                                recognition.lang = lang;
                                recognition.continuous = true;
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
                            recognition.continuous = true;
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
        console.log('🌐 API URL:', API_MANAGER.API_URL);
        console.log('🔐 Auth Token:', API_MANAGER.getToken() ? 'Present' : 'Not present');
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
