// ============================================================
// FREE TRANSLATE LANGUAGE - Complete Application
// ============================================================

// ============================================================
// STATE
// ============================================================
let currentMode = 'login';
let currentUser = null;
let isLoggedIn = false;
let pendingEmail = '';
let pendingAction = '';
let pendingCallback = null;
let isVerifying = false;
let verificationDone = false;
let pendingResetEmail = '';
let pendingResetUser = null;
let isRecording = false;
let isTranslating = false;
let translateQueue = false;
let currentSpeech = null;
let recognition = null;

// ============================================================
// LANGUAGE LIST
// ============================================================
const LANGUAGES = [
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
// POPULATE LANGUAGES - GLOBAL FUNCTION
// ============================================================
function populateLanguageDropdowns() {
    console.log('🔄 Populating language dropdowns...');
    
    var sourceLang = document.getElementById('sourceLang');
    var targetLang = document.getElementById('targetLang');
    
    if (!sourceLang || !targetLang) {
        console.error('❌ Language dropdowns not found! Retrying...');
        setTimeout(populateLanguageDropdowns, 100);
        return;
    }
    
    // Clear existing options
    sourceLang.innerHTML = '';
    targetLang.innerHTML = '';
    
    // Populate source language dropdown
    LANGUAGES.forEach(function(lang) {
        var option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        sourceLang.appendChild(option);
    });
    sourceLang.value = 'rw';
    
    // Populate target language dropdown
    LANGUAGES.forEach(function(lang) {
        var option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        targetLang.appendChild(option);
    });
    targetLang.value = 'en';
    
    console.log('✅ Languages populated! Source:', sourceLang.options.length, 'Target:', targetLang.options.length);
}

// ============================================================
// DOM ELEMENTS - Get after DOM load
// ============================================================
function getDOMElements() {
    return {
        authBtn: document.getElementById('authBtn'),
        authModal: document.getElementById('authModal'),
        closeAuthModal: document.getElementById('closeAuthModal'),
        authForm: document.getElementById('authForm'),
        authFields: document.getElementById('authFields'),
        authSubmitBtn: document.getElementById('authSubmitBtn'),
        authModalTitle: document.getElementById('authModalTitle'),
        authSwitchText: document.getElementById('authSwitchText'),
        authSwitchLink: document.getElementById('authSwitchLink'),
        forgotPasswordLink: document.getElementById('forgotPasswordLink'),
        forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),
        notificationContainer: document.getElementById('notificationContainer'),
        themeToggle: document.getElementById('themeToggle'),
        aboutNavBtn: document.getElementById('aboutNavBtn'),
        aboutModal: document.getElementById('aboutModal'),
        closeAboutModal: document.getElementById('closeAboutModal'),
        historyNavBtn: document.getElementById('historyNavBtn'),
        translateBtn: document.getElementById('translateBtn'),
        inputText: document.getElementById('inputText'),
        outputDisplay: document.getElementById('outputText'),
        sourceLang: document.getElementById('sourceLang'),
        targetLang: document.getElementById('targetLang'),
        micBtn: document.getElementById('micBtn'),
        recordingStatus: document.getElementById('recordingStatus'),
        swapBtn: document.getElementById('swapLang'),
        clearInputBtn: document.getElementById('clearInput'),
        copyOutputBtn: document.getElementById('copyOutput'),
        speakOutputBtn: document.getElementById('speakOutput')
    };
}

// ============================================================
// SPEECH FUNCTION
// ============================================================
function speakText(text, lang) {
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
}

function stopSpeech() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        currentSpeech = null;
    }
}

// ============================================================
// NOTIFICATION SYSTEM
// ============================================================
var notificationTimeout = null;

function clearAllNotifications() {
    var container = document.getElementById('notificationContainer');
    if (container) {
        container.innerHTML = '';
    }
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
}

function showNotification(message, type, duration) {
    type = type || 'info';
    duration = duration || 5000;
    
    var container = document.getElementById('notificationContainer');
    if (!container) return;
    
    clearAllNotifications();
    
    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    var notification = document.createElement('div');
    notification.className = 'notification ' + type;
    notification.innerHTML = `
        <span class="notif-icon">${icons[type] || 'ℹ️'}</span>
        <span class="notif-content">${message}</span>
        <button class="notif-close">&times;</button>
    `;
    
    var closeBtn = notification.querySelector('.notif-close');
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        notification.remove();
    });
    closeBtn.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        notification.remove();
    }, { passive: false });
    
    container.appendChild(notification);
    
    notificationTimeout = setTimeout(function() {
        if (notification.parentNode) {
            notification.remove();
        }
        notificationTimeout = null;
    }, duration);
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
    
    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
    toggle.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    }, { passive: false });
    
    wrapper.appendChild(input);
    wrapper.appendChild(toggle);
    return wrapper;
}

function bindPasswordToggles(container) {
    if (!container) return;
    var fields = container.querySelectorAll('.password-field');
    fields.forEach(function(wrapper) {
        var input = wrapper.querySelector('input');
        var toggle = wrapper.querySelector('.password-toggle');
        if (input && toggle) {
            var newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            newToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            });
            newToggle.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            }, { passive: false });
        }
    });
}

function clearAllPasswordFields() {
    var inputs = document.querySelectorAll('input[type="password"]');
    inputs.forEach(function(input) {
        input.value = '';
    });
}

// ============================================================
// VERIFICATION CODE SYSTEM
// ============================================================
async function sendVerificationCode(email, action) {
    try {
        var result = await DATA_MANAGER.storeVerificationCode(email, action);
        if (result.success) {
            showNotification('📧 Verification code sent to your email. Please check your inbox and spam folder.', 'success');
            return { success: true, code: result.code };
        } else {
            showNotification('⚠️ Error sending verification code. Please try again.', 'error');
            return { success: false };
        }
    } catch (error) {
        showNotification('⚠️ There was an issue sending the code. Please try again.', 'error');
        return { success: false };
    }
}

async function verifyCode(email, code) {
    if (isVerifying) {
        isVerifying = false;
    }
    isVerifying = true;
    try {
        var result = DATA_MANAGER.verifyCode(email, code, pendingAction);
        if (result.success) {
            return { success: true, token: 'local_' + email };
        } else {
            return { success: false, error: result.error || 'Invalid code. Please try again.' };
        }
    } catch (error) {
        return { success: false, error: 'An error occurred during verification.' };
    } finally {
        isVerifying = false;
    }
}

// ============================================================
// CUSTOM MODALS
// ============================================================
function showPasswordConfirmModal(title, message, inputPlaceholder, inputType) {
    inputPlaceholder = inputPlaceholder || 'Enter your password';
    return new Promise(function(resolve) {
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content prompt-content" style="max-width: 420px;">
                <h2 style="text-align: center; color: #ef4444; margin-bottom: 12px;">${title}</h2>
                <p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">${message}</p>
                <div class="settings-field">
                    <label>Password</label>
                    ${createPasswordField('promptPasswordInput', inputPlaceholder).outerHTML}
                </div>
                <div class="confirmation-buttons" style="margin-top: 16px;">
                    <button class="auth-submit-btn cancel-btn" id="promptCancel" style="flex:1;">Cancel</button>
                    <button class="auth-submit-btn delete-btn" id="promptConfirm" style="flex:1;">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        bindPasswordToggles(modal);
        
        var input = document.getElementById('promptPasswordInput');
        var confirmBtn = modal.querySelector('#promptConfirm');
        var cancelBtn = modal.querySelector('#promptCancel');
        
        input.focus();
        
        confirmBtn.addEventListener('click', function() {
            var value = input.value;
            modal.remove();
            resolve(value);
        });
        confirmBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var value = input.value;
            modal.remove();
            resolve(value);
        }, { passive: false });
        
        cancelBtn.addEventListener('click', function() {
            modal.remove();
            resolve(null);
        });
        cancelBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            modal.remove();
            resolve(null);
        }, { passive: false });
        
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
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}

function showPasswordResetModal() {
    return new Promise(function(resolve) {
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content prompt-content" style="max-width: 440px;">
                <h2 style="text-align: center; margin-bottom: 12px;">Reset Password</h2>
                <p style="text-align: center; color: var(--text-secondary); margin-bottom: 16px;">Enter your new password below.</p>
                <div class="settings-field">
                    <label>New Password (min 8 chars)</label>
                    ${createPasswordField('resetNewPassword', 'Enter new password').outerHTML}
                </div>
                <div class="settings-field">
                    <label>Confirm New Password</label>
                    ${createPasswordField('resetConfirmPassword', 'Confirm new password').outerHTML}
                </div>
                <div class="confirmation-buttons" style="margin-top: 16px;">
                    <button class="auth-submit-btn cancel-btn" id="resetCancel" style="flex:1;">Cancel</button>
                    <button class="auth-submit-btn" id="resetConfirm" style="flex:1; background: var(--accent);">Reset Password</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        bindPasswordToggles(modal);
        
        var newPassword = document.getElementById('resetNewPassword');
        var confirmPassword = document.getElementById('resetConfirmPassword');
        var confirmBtn = modal.querySelector('#resetConfirm');
        var cancelBtn = modal.querySelector('#resetCancel');
        
        newPassword.focus();
        
        confirmBtn.addEventListener('click', function() {
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
        confirmBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
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
        }, { passive: false });
        
        cancelBtn.addEventListener('click', function() {
            modal.remove();
            resolve(null);
        });
        cancelBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            modal.remove();
            resolve(null);
        }, { passive: false });
    });
}

function showConfirmationModal(title, message, confirmText, cancelText) {
    confirmText = confirmText || 'Confirm';
    cancelText = cancelText || 'Cancel';
    return new Promise(function(resolve) {
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content confirmation-content">
                <h2>${title}</h2>
                <p>${message}</p>
                <div class="confirmation-buttons">
                    <button class="auth-submit-btn cancel-btn" id="cancelConfirm">${cancelText}</button>
                    <button class="auth-submit-btn delete-btn" id="confirmAction">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('#cancelConfirm').addEventListener('click', function() {
            modal.remove();
            resolve(false);
        });
        modal.querySelector('#cancelConfirm').addEventListener('touchstart', function(e) {
            e.preventDefault();
            modal.remove();
            resolve(false);
        }, { passive: false });
        
        modal.querySelector('#confirmAction').addEventListener('click', function() {
            modal.remove();
            resolve(true);
        });
        modal.querySelector('#confirmAction').addEventListener('touchstart', function(e) {
            e.preventDefault();
            modal.remove();
            resolve(true);
        }, { passive: false });
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
    
    var existing = document.getElementById('verificationModal');
    if (existing) existing.remove();
    
    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'verificationModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content verification-content">
            <span class="close-modal close-verification">&times;</span>
            <h2>${action === 'signup' ? 'Verify Your Email' : action === 'signin' ? 'Verify Sign In' : action === 'delete' ? 'Confirm Delete Account' : action === 'email' ? 'Verify Email Change' : action === 'password' ? 'Verify Password Change' : action === 'reset' ? 'Reset Password' : 'Verification Required'}</h2>
            <p class="verification-desc">Enter the 6-digit verification code sent to your email. Also check SPAM/JUNK folder.</p>
            <form id="verificationForm">
                <input type="text" id="verificationCode" placeholder="Enter 6-digit code" maxlength="6" autocomplete="off" required>
                <button type="submit" class="auth-submit-btn" id="verifySubmitBtn">Verify</button>
            </form>
            <p class="auth-switch">Didn't receive code? <a href="#" id="resendCodeBtn">Resend Code</a></p>
        </div>
    `;
    document.body.appendChild(modal);
    
    var closeBtn = modal.querySelector('.close-verification');
    closeBtn.addEventListener('click', function() {
        modal.remove();
        isVerifying = false;
        verificationDone = false;
    });
    closeBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        modal.remove();
        isVerifying = false;
        verificationDone = false;
    }, { passive: false });
    
    var form = modal.querySelector('#verificationForm');
    var submitBtn = modal.querySelector('#verifySubmitBtn');
    var codeInput = document.getElementById('verificationCode');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (verificationDone) return;
        if (isVerifying) return;
        var code = codeInput.value.trim();
        if (!code || code.length !== 6) {
            showNotification('Please enter a valid 6-digit code.', 'error');
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        isVerifying = true;
        try {
            var result = await verifyCode(email, code);
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
                showNotification(result.error || 'Invalid code. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify';
                submitBtn.style.backgroundColor = '';
                isVerifying = false;
                codeInput.value = '';
                codeInput.focus();
            }
        } catch (error) {
            showNotification('An error occurred during verification.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify';
            submitBtn.style.backgroundColor = '';
            isVerifying = false;
        }
    });
    
    var resendBtn = modal.querySelector('#resendCodeBtn');
    resendBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        clearAllNotifications();
        verificationDone = false;
        isVerifying = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify';
        submitBtn.style.backgroundColor = '';
        codeInput.disabled = false;
        codeInput.value = '';
        codeInput.focus();
        var result = await sendVerificationCode(email, pendingAction);
        if (result.success) {
            showNotification('New code sent! Check your email.', 'success');
        } else {
            showNotification('Error sending code. Please try again.', 'error');
        }
    });
    resendBtn.addEventListener('touchstart', async function(e) {
        e.preventDefault();
        clearAllNotifications();
        verificationDone = false;
        isVerifying = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify';
        submitBtn.style.backgroundColor = '';
        codeInput.disabled = false;
        codeInput.value = '';
        codeInput.focus();
        var result = await sendVerificationCode(email, pendingAction);
        if (result.success) {
            showNotification('New code sent! Check your email.', 'success');
        } else {
            showNotification('Error sending code. Please try again.', 'error');
        }
    }, { passive: false });
}

// ============================================================
// AUTH STATE
// ============================================================
async function checkAuthStatus() {
    var token = localStorage.getItem('authToken');
    var authBtn = document.getElementById('authBtn');
    var historyNavBtn = document.getElementById('historyNavBtn');
    
    if (!token) {
        isLoggedIn = false;
        currentUser = null;
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
            authBtn.classList.remove('logged-in');
        }
        if (historyNavBtn) historyNavBtn.style.display = 'none';
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
            authBtn.innerHTML = '<i class="fas fa-user-circle"></i> ' + currentUser.username;
            authBtn.classList.add('logged-in');
        }
        if (historyNavBtn) historyNavBtn.style.display = 'flex';
    } else {
        localStorage.removeItem('authToken');
        isLoggedIn = false;
        currentUser = null;
        if (authBtn) {
            authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
            authBtn.classList.remove('logged-in');
        }
        if (historyNavBtn) historyNavBtn.style.display = 'none';
    }
}

// ============================================================
// AUTH BUTTON
// ============================================================
function setupAuthButton(authBtn) {
    if (!authBtn) return;
    
    authBtn.addEventListener('click', function() {
        if (isLoggedIn) {
            toggleProfileMenu();
        } else {
            openModal('login');
        }
    });
    authBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (isLoggedIn) {
            toggleProfileMenu();
        } else {
            openModal('login');
        }
    }, { passive: false });
}

// ============================================================
// PROFILE MENU
// ============================================================
var profileMenu = null;

function toggleProfileMenu() {
    if (profileMenu) {
        profileMenu.remove();
        profileMenu = null;
        return;
    }
    if (!currentUser) return;
    
    profileMenu = document.createElement('div');
    profileMenu.className = 'user-menu';
    profileMenu.innerHTML = `
        <div class="user-menu-header">
            <i class="fas fa-user-circle"></i>
            <div>
                <strong>${currentUser.username}</strong>
                <small>${currentUser.email}</small>
            </div>
        </div>
        <div class="user-menu-divider"></div>
        <div class="user-menu-item" data-action="profile">
            <i class="fas fa-user"></i> Profile
        </div>
        <div class="user-menu-item" data-action="account">
            <i class="fas fa-cog"></i> Account Settings
        </div>
        <div class="user-menu-divider"></div>
        <div class="user-menu-item logout" data-action="logout">
            <i class="fas fa-sign-out-alt"></i> Log Out
        </div>
    `;
    document.body.appendChild(profileMenu);
    
    var authBtn = document.getElementById('authBtn');
    var rect = authBtn ? authBtn.getBoundingClientRect() : { bottom: 0, right: 0 };
    profileMenu.style.top = rect.bottom + 10 + 'px';
    profileMenu.style.right = window.innerWidth - rect.right + 'px';
    
    setTimeout(function() {
        document.addEventListener('click', function closeMenu(e) {
            if (profileMenu && !profileMenu.contains(e.target) && e.target !== authBtn) {
                profileMenu.remove();
                profileMenu = null;
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
    
    profileMenu.querySelectorAll('.user-menu-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var action = this.dataset.action;
            if (profileMenu) {
                profileMenu.remove();
                profileMenu = null;
            }
            if (action === 'profile') openProfileModal();
            else if (action === 'account') openAccountSettings();
            else if (action === 'logout') logoutUser();
        });
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var action = this.dataset.action;
            if (profileMenu) {
                profileMenu.remove();
                profileMenu = null;
            }
            if (action === 'profile') openProfileModal();
            else if (action === 'account') openAccountSettings();
            else if (action === 'logout') logoutUser();
        }, { passive: false });
    });
}

// ============================================================
// LOGOUT
// ============================================================
function logoutUser() {
    DATA_MANAGER.logout();
    localStorage.removeItem('authToken');
    isLoggedIn = false;
    currentUser = null;
    var authBtn = document.getElementById('authBtn');
    var historyNavBtn = document.getElementById('historyNavBtn');
    if (authBtn) {
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        authBtn.classList.remove('logged-in');
    }
    if (historyNavBtn) historyNavBtn.style.display = 'none';
    showNotification('Logged out successfully.', 'info');
    clearAllPasswordFields();
    if (profileMenu) profileMenu.remove();
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
    modal.innerHTML = `
        <div class="modal-content settings-content">
            <span class="close-modal close-profile">&times;</span>
            <div class="profile-header">
                <i class="fas fa-user-circle profile-icon"></i>
                <h2>${user.username}</h2>
                <p>${user.email}</p>
                <span class="profile-badge">Verified Account</span>
            </div>
            <div class="profile-info">
                <div class="info-item"><strong>Username:</strong> ${user.username}</div>
                <div class="info-item"><strong>Email:</strong> ${user.email}</div>
                <div class="info-item"><strong>Member Since:</strong> ${new Date(user.createdAt).toLocaleDateString()}</div>
                <div class="info-item"><strong>Last Login:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First time'}</div>
            </div>
            <button class="auth-submit-btn" id="goToSettingsBtn">Account Settings</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.close-profile').addEventListener('click', function() { modal.remove(); });
    modal.querySelector('.close-profile').addEventListener('touchstart', function(e) { e.preventDefault(); modal.remove(); }, { passive: false });
    
    modal.querySelector('#goToSettingsBtn').addEventListener('click', function() {
        modal.remove();
        openAccountSettings();
    });
    modal.querySelector('#goToSettingsBtn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        modal.remove();
        openAccountSettings();
    }, { passive: false });
}

// ============================================================
// ACCOUNT SETTINGS
// ============================================================
var settingsModal = null;

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
    modal.innerHTML = `
        <div class="modal-content settings-content">
            <span class="close-modal close-settings">&times;</span>
            <h2><i class="fas fa-cog"></i> Account Settings</h2>
            <div class="settings-body">
                <div class="settings-field">
                    <label>Username</label>
                    <input type="text" value="${user.username}" disabled>
                    <small style="color: #888; font-size: 12px;">Username is auto-generated and cannot be changed</small>
                </div>
                <div class="settings-field">
                    <label>Email</label>
                    <input type="email" id="settingsEmail" value="${user.email}">
                </div>
                <div class="settings-field">
                    <label>Current Password</label>
                    ${createPasswordField('settingsCurrentPassword', 'Enter current password').outerHTML}
                </div>
                <div class="settings-field">
                    <label>New Password</label>
                    ${createPasswordField('settingsNewPassword', 'Enter new password (8+ chars)').outerHTML}
                </div>
                <div class="settings-field">
                    <label>Confirm New Password</label>
                    ${createPasswordField('settingsConfirmPassword', 'Confirm new password').outerHTML}
                </div>
                <button id="saveSettingsBtn" class="auth-submit-btn">Save Changes</button>
                <button id="deleteAccountBtn" class="auth-submit-btn delete-btn">Delete Account</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    bindPasswordToggles(modal);
    
    modal.querySelector('.close-settings').addEventListener('click', function() { modal.remove(); });
    modal.querySelector('.close-settings').addEventListener('touchstart', function(e) { e.preventDefault(); modal.remove(); }, { passive: false });
    
    modal.querySelector('#saveSettingsBtn').addEventListener('click', async function() {
        var newEmail = document.getElementById('settingsEmail').value;
        var currentPassword = document.getElementById('settingsCurrentPassword').value;
        var newPassword = document.getElementById('settingsNewPassword').value;
        var confirmPassword = document.getElementById('settingsConfirmPassword').value;
        
        if (!currentPassword) {
            showNotification('Please enter your current password.', 'error');
            return;
        }
        if (!DATA_MANAGER.verifyPassword(currentPassword, user.password)) {
            showNotification('Current password is incorrect.', 'error');
            return;
        }
        if (newEmail && newEmail !== user.email) {
            var existing = DATA_MANAGER.findUserByEmail(newEmail);
            if (existing && existing.id !== user.id) {
                showNotification('Email already in use by another account.', 'error');
                return;
            }
            var saveBtn = document.getElementById('saveSettingsBtn');
            var originalText = saveBtn.textContent;
            saveBtn.textContent = 'Sending code...';
            saveBtn.disabled = true;
            var result = await sendVerificationCode(newEmail, 'email');
            if (!result.success) {
                showNotification('Error sending verification code.', 'error');
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
                return;
            }
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            openVerificationModal(newEmail, 'email', async function(token) {
                var updateResult = DATA_MANAGER.updateProfile(user.id, { 
                    email: newEmail,
                    username: newEmail.split('@')[0]
                });
                if (updateResult.success) {
                    showNotification('Email updated successfully!', 'success');
                    user.email = newEmail;
                    user.username = newEmail.split('@')[0];
                    modal.remove();
                    clearAllPasswordFields();
                    await checkAuthStatus();
                    setTimeout(function() { openProfileModal(); }, 500);
                } else {
                    showNotification('Error updating email.', 'error');
                }
            });
            return;
        }
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                showNotification('New passwords do not match!', 'error');
                return;
            }
            if (newPassword === currentPassword) {
                showNotification('New password must be different from your current password.', 'error');
                return;
            }
            var validation = DATA_MANAGER.validatePasswordStrength(newPassword);
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }
            var saveBtn = document.getElementById('saveSettingsBtn');
            var originalText = saveBtn.textContent;
            saveBtn.textContent = 'Sending code...';
            saveBtn.disabled = true;
            var result = await sendVerificationCode(user.email, 'password');
            if (!result.success) {
                showNotification('Error sending verification code.', 'error');
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
                return;
            }
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            openVerificationModal(user.email, 'password', async function(token) {
                var updateResult = DATA_MANAGER.changePassword(user.id, currentPassword, newPassword);
                if (updateResult.success) {
                    showNotification('Password updated successfully!', 'success');
                    modal.remove();
                    clearAllPasswordFields();
                } else {
                    showNotification('Error updating password.', 'error');
                }
            });
            return;
        }
        showNotification('No changes made.', 'info');
        modal.remove();
        clearAllPasswordFields();
    });
    modal.querySelector('#saveSettingsBtn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        this.click();
    }, { passive: false });
    
    modal.querySelector('#deleteAccountBtn').addEventListener('click', async function() {
        var confirmed = await showConfirmationModal(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            'Delete Account',
            'Cancel'
        );
        if (!confirmed) return;
        var password = await showPasswordConfirmModal(
            'Confirm Deletion',
            'Enter your password to confirm account deletion:',
            'Enter your password',
            'password'
        );
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
        var deleteBtn = document.getElementById('deleteAccountBtn');
        var originalDeleteText = deleteBtn.textContent;
        deleteBtn.textContent = 'Sending code...';
        deleteBtn.disabled = true;
        var result = await sendVerificationCode(user.email, 'delete');
        if (!result.success) {
            showNotification('Error sending verification code.', 'error');
            deleteBtn.textContent = originalDeleteText;
            deleteBtn.disabled = false;
            return;
        }
        deleteBtn.textContent = originalDeleteText;
        deleteBtn.disabled = false;
        openVerificationModal(user.email, 'delete', async function(token) {
            var deleteResult = DATA_MANAGER.deleteAccount(user.id, password);
            if (deleteResult.success) {
                localStorage.removeItem('authToken');
                showNotification('Account deleted successfully.', 'info');
                modal.remove();
                clearAllPasswordFields();
                window.location.reload();
            } else {
                showNotification('Error deleting account.', 'error');
            }
        });
    });
    modal.querySelector('#deleteAccountBtn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        this.click();
    }, { passive: false });
}

// ============================================================
// OPEN AUTH MODAL
// ============================================================
function openModal(mode) {
    currentMode = mode;
    var authModal = document.getElementById('authModal');
    var authFields = document.getElementById('authFields');
    var forgotPasswordLink = document.getElementById('forgotPasswordLink');
    var authModalTitle = document.getElementById('authModalTitle');
    var authSubmitBtn = document.getElementById('authSubmitBtn');
    var authSwitchText = document.getElementById('authSwitchText');
    var forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    
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
        authFields.appendChild(email);
        
        var password = createPasswordField('authPassword', 'Password');
        authFields.appendChild(password);
        bindPasswordToggles(authModal);
        
        forgotPasswordLink.style.display = 'block';
        forgotPasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal('reset');
        });
        forgotPasswordBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            openModal('reset');
        }, { passive: false });
        
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
        authFields.appendChild(email);
        
        var password = createPasswordField('authPassword', 'Password (min 8 chars)');
        authFields.appendChild(password);
        var confirm = createPasswordField('authConfirmPassword', 'Confirm password');
        authFields.appendChild(confirm);
        bindPasswordToggles(authModal);
        
        var hint = document.createElement('small');
        hint.textContent = 'Password must contain: 8+ characters, uppercase, lowercase, number, special character';
        authFields.appendChild(hint);
        forgotPasswordLink.style.display = 'none';
    }
    
    var switchLink = document.getElementById('authSwitchLink');
    if (switchLink) {
        switchLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (mode === 'reset') {
                openModal('login');
            } else if (mode === 'login') {
                openModal('signup');
            } else {
                openModal('login');
            }
        });
        switchLink.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (mode === 'reset') {
                openModal('login');
            } else if (mode === 'login') {
                openModal('signup');
            } else {
                openModal('login');
            }
        }, { passive: false });
    }
}

// ============================================================
// CLOSE MODAL
// ============================================================
function setupCloseModal() {
    var closeAuthModal = document.getElementById('closeAuthModal');
    var authModal = document.getElementById('authModal');
    
    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', function() {
            if (authModal) authModal.style.display = 'none';
            clearAllPasswordFields();
        });
        closeAuthModal.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (authModal) authModal.style.display = 'none';
            clearAllPasswordFields();
        }, { passive: false });
    }
}

// ============================================================
// AUTH FORM SUBMIT
// ============================================================
function setupAuthForm() {
    var authForm = document.getElementById('authForm');
    var authSubmitBtn = document.getElementById('authSubmitBtn');
    var authModal = document.getElementById('authModal');
    
    if (!authForm) return;
    
    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var email = document.getElementById('authEmail').value;
        var password = document.getElementById('authPassword')?.value || '';
        
        try {
            if (currentMode === 'login') {
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Signing in...';
                var result = DATA_MANAGER.login(email, password);
                if (!result.success) {
                    if (result.error === 'Account not found. Please create an account.') {
                        showNotification('Account not found. Redirecting to Create Account...', 'error');
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
                var codeResult = await sendVerificationCode(email, 'signin');
                if (!codeResult.success) {
                    showNotification('Error sending verification code.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                    return;
                }
                if (authModal) authModal.style.display = 'none';
                openVerificationModal(email, 'signin', async function(token) {
                    showNotification('Sign in successful!', 'success');
                    await checkAuthStatus();
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                    clearAllPasswordFields();
                });
            } else if (currentMode === 'reset') {
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Sending reset code...';
                var userExists = DATA_MANAGER.findUserByEmail(email);
                if (!userExists) {
                    showNotification('No account found with this email.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    return;
                }
                var codeResult = await sendVerificationCode(email, 'reset');
                if (!codeResult.success) {
                    showNotification('Error sending reset code.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    return;
                }
                pendingResetEmail = email;
                pendingResetUser = userExists;
                if (authModal) authModal.style.display = 'none';
                openVerificationModal(email, 'reset', async function(token) {
                    var newPassword = await showPasswordResetModal();
                    if (newPassword === null) {
                        showNotification('Password reset cancelled.', 'info');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        pendingResetEmail = '';
                        pendingResetUser = null;
                        return;
                    }
                    if (DATA_MANAGER.verifyPassword(newPassword, pendingResetUser.password)) {
                        showNotification('New password must be different from your current password.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        pendingResetEmail = '';
                        pendingResetUser = null;
                        return;
                    }
                    var users = DATA_MANAGER.loadUsers();
                    var index = users.findIndex(function(u) { return u.id === pendingResetUser.id; });
                    if (index === -1) {
                        showNotification('User not found. Please try again.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        pendingResetEmail = '';
                        pendingResetUser = null;
                        return;
                    }
                    users[index].password = DATA_MANAGER.hashPassword(newPassword);
                    DATA_MANAGER.saveUsers(users);
                    showNotification('Password reset successfully! Please sign in.', 'success');
                    clearAllPasswordFields();
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    pendingResetEmail = '';
                    pendingResetUser = null;
                    setTimeout(function() { openModal('login'); }, 2000);
                });
            } else if (currentMode === 'signup') {
                var confirmPassword = document.getElementById('authConfirmPassword')?.value || '';
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
                    showNotification('Invalid email format.', 'error');
                    return;
                }
                authSubmitBtn.disabled = true;
                authSubmitBtn.textContent = 'Creating account...';
                var result = DATA_MANAGER.createUser(email, password, username);
                if (!result.success) {
                    if (result.error === 'Email already registered. Please sign in.') {
                        showNotification('Email already registered. Redirecting to Sign In...', 'error');
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
                var codeResult = await sendVerificationCode(email, 'signup');
                if (!codeResult.success) {
                    showNotification('Error sending verification code.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    return;
                }
                if (authModal) authModal.style.display = 'none';
                openVerificationModal(email, 'signup', async function(token) {
                    showNotification('Account created successfully!', 'success');
                    await checkAuthStatus();
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    clearAllPasswordFields();
                });
            }
        } catch (error) {
            showNotification('An error occurred. Please try again.', 'error');
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = currentMode === 'login' ? 'Sign In' : 'Create Account';
        }
    });
}

// ============================================================
// HISTORY MODAL
// ============================================================
var historyModal = null;

function setupHistoryButton() {
    var historyNavBtn = document.getElementById('historyNavBtn');
    if (historyNavBtn) {
        historyNavBtn.addEventListener('click', function() {
            openHistoryModal();
        });
        historyNavBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            openHistoryModal();
        }, { passive: false });
    }
}

function openHistoryModal() {
    if (!isLoggedIn || !currentUser) {
        showNotification('Please sign in to view history.', 'warning');
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
    historyModal.innerHTML = `
        <div class="modal-content history-modal-content">
            <span class="close-modal close-history">&times;</span>
            <h2><i class="fas fa-history"></i> Translation History</h2>
            <div class="history-header">
                <div class="history-actions">
                    <button id="deleteAllHistory" class="delete-all-btn"><i class="fas fa-trash"></i> Delete All</button>
                </div>
            </div>
            <div id="historyListModal" class="history-list-modal">
                <p class="empty-history">Loading history...</p>
            </div>
        </div>
    `;
    document.body.appendChild(historyModal);
    
    historyModal.querySelector('.close-history').addEventListener('click', function() {
        historyModal.style.display = 'none';
    });
    historyModal.querySelector('.close-history').addEventListener('touchstart', function(e) {
        e.preventDefault();
        historyModal.style.display = 'none';
    }, { passive: false });
    
    loadHistoryModal();
    
    historyModal.querySelector('#deleteAllHistory').addEventListener('click', async function() {
        if (!isLoggedIn || !currentUser) {
            showNotification('Please sign in to manage history.', 'warning');
            return;
        }
        var confirmed = await showConfirmationModal(
            'Delete All History',
            'Are you sure you want to delete ALL your translation history? This action cannot be undone.',
            'Delete All',
            'Cancel'
        );
        if (!confirmed) return;
        var result = DATA_MANAGER.clearHistory(currentUser.email);
        if (result.success) {
            await loadHistoryModal();
            showNotification('All history deleted.', 'info');
        } else {
            showNotification('Error deleting history.', 'error');
        }
    });
    historyModal.querySelector('#deleteAllHistory').addEventListener('touchstart', function(e) {
        e.preventDefault();
        this.click();
    }, { passive: false });
}

async function loadHistoryModal() {
    var historyList = document.getElementById('historyListModal');
    if (!historyList) return;
    if (!isLoggedIn || !currentUser) {
        historyList.innerHTML = '<p class="empty-history">Sign in to see your history.</p>';
        return;
    }
    try {
        var history = DATA_MANAGER.getHistory(currentUser.email);
        if (!history || history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No translations yet. Start translating!</p>';
            return;
        }
        var html = '';
        history.forEach(function(item) {
            var time = new Date(item.createdAt).toLocaleString();
            html += `
                <div class="history-item" data-id="${item.id}">
                    <button class="h-delete" data-id="${item.id}" title="Delete this translation">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="h-source">
                        ${getLanguageName(item.sourceLang)} → ${getLanguageName(item.targetLang)}
                        <span class="h-time">${time}</span>
                    </div>
                    <div class="h-original">"${item.original.substring(0, 60)}${item.original.length > 60 ? '...' : ''}"</div>
                    <div class="h-translation">"${item.translated.substring(0, 60)}${item.translated.length > 60 ? '...' : ''}"</div>
                </div>
            `;
        });
        historyList.innerHTML = html;
        document.querySelectorAll('.h-delete').forEach(function(btn) {
            btn.addEventListener('click', async function() {
                var id = this.dataset.id;
                var confirmed = await showConfirmationModal(
                    'Delete History Item',
                    'Are you sure you want to delete this translation history item?',
                    'Delete',
                    'Cancel'
                );
                if (!confirmed) return;
                var result = DATA_MANAGER.deleteHistoryItem(currentUser.email, id);
                if (result.success) {
                    await loadHistoryModal();
                    showNotification('History item deleted.', 'info');
                } else {
                    showNotification('Error deleting history item.', 'error');
                }
            });
            btn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.click();
            }, { passive: false });
        });
    } catch (error) {
        historyList.innerHTML = '<p class="empty-history">Could not load history.</p>';
    }
}

function getLanguageName(code) {
    var languages = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
        'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
        'rw': 'Kinyarwanda', 'rn': 'Kirundi', 'sw': 'Swahili', 'zu': 'Zulu',
        'yo': 'Yoruba', 'ig': 'Igbo', 'ha': 'Hausa', 'ak': 'Akan',
        'am': 'Amharic', 'so': 'Somali', 'mg': 'Malagasy', 'xh': 'Xhosa',
        'af': 'Afrikaans', 'wo': 'Wolof', 'ki': 'Kikuyu', 'lg': 'Luganda',
        'ny': 'Chichewa'
    };
    return languages[code] || code.toUpperCase();
}

// ============================================================
// SAVE TO HISTORY
// ============================================================
async function saveToHistory(original, translated, sourceLang, targetLang) {
    if (!isLoggedIn || !currentUser) return;
    var entry = {
        original: original,
        translated: translated,
        sourceLang: sourceLang,
        targetLang: targetLang
    };
    DATA_MANAGER.saveHistory(currentUser.email, entry);
}

// ============================================================
// TRANSLATION ENGINE
// ============================================================
var translateFromContainer = null;
var translateFromBtn = null;

function setupTranslation() {
    var sourceLang = document.getElementById('sourceLang');
    var targetLang = document.getElementById('targetLang');
    var inputText = document.getElementById('inputText');
    var outputDisplay = document.getElementById('outputText');
    var translateBtn = document.getElementById('translateBtn');
    var micBtn = document.getElementById('micBtn');
    var recordingStatus = document.getElementById('recordingStatus');
    var swapBtn = document.getElementById('swapLang');
    var clearInputBtn = document.getElementById('clearInput');
    var copyOutputBtn = document.getElementById('copyOutput');
    var speakOutputBtn = document.getElementById('speakOutput');
    
    // Create Translate From Container
    translateFromContainer = document.createElement('div');
    translateFromContainer.className = 'translate-from-container';
    translateFromContainer.style.cssText = 'display: none; margin-top: 6px; padding: 0 4px;';
    
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
    translateFromBtn.style.cssText = `
        font-size: 0.7rem;
        color: #1a73e8;
        cursor: pointer;
        padding: 3px 12px;
        border-radius: 14px;
        background: #e8f0fe;
        border: 1px solid #dadce0;
        transition: all 0.2s ease;
        user-select: none;
        font-family: var(--font);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        letter-spacing: 0.3px;
    `;
    translateFromBtn.textContent = 'Translate from: ';
    translateFromContainer.appendChild(translateFromBtn);

    translateFromBtn.addEventListener('click', function() {
        var detectedLang = this.dataset.lang;
        if (detectedLang && detectedLang !== 'auto') {
            if (sourceLang) sourceLang.value = detectedLang;
            translateFromContainer.style.display = 'none';
            this.dataset.lang = '';
            var text = inputText ? inputText.value.trim() : '';
            if (text) {
                performTranslation();
            }
            showNotification('Switched to: ' + getLanguageName(detectedLang), 'success', 2000);
        }
    });
    translateFromBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        var detectedLang = this.dataset.lang;
        if (detectedLang && detectedLang !== 'auto') {
            if (sourceLang) sourceLang.value = detectedLang;
            translateFromContainer.style.display = 'none';
            this.dataset.lang = '';
            var text = inputText ? inputText.value.trim() : '';
            if (text) {
                performTranslation();
            }
            showNotification('Switched to: ' + getLanguageName(detectedLang), 'success', 2000);
        }
    }, { passive: false });

    // Add Speaker Icon to Input Field
    var inputSpeakerBtn = document.createElement('button');
    inputSpeakerBtn.className = 'action-btn input-speaker-btn';
    inputSpeakerBtn.style.cssText = `
        background: transparent;
        border: none;
        color: var(--text-light);
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: var(--transition);
        font-size: 0.85rem;
    `;
    inputSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    inputSpeakerBtn.title = 'Read input text aloud';

    var inputBoxActions = inputBox?.querySelector('.box-actions');
    if (inputBoxActions) {
        inputBoxActions.appendChild(inputSpeakerBtn);
    }

    inputSpeakerBtn.addEventListener('click', function() {
        var text = inputText ? inputText.value.trim() : '';
        if (text) {
            stopSpeech();
            var lang = sourceLang ? sourceLang.value || 'en' : 'en';
            speakText(text, lang);
            showNotification('🔊 Reading input text...', 'info', 2000);
        } else {
            showNotification('No text to read.', 'warning', 2000);
        }
    });
    inputSpeakerBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        this.click();
    }, { passive: false });

    // Update output speaker
    if (speakOutputBtn) {
        var newOutputSpeaker = speakOutputBtn.cloneNode(true);
        speakOutputBtn.parentNode.replaceChild(newOutputSpeaker, speakOutputBtn);
        newOutputSpeaker.addEventListener('click', function() {
            var text = outputDisplay ? outputDisplay.textContent : '';
            if (text && !text.includes('placeholder') && !text.includes('Please enter') && !text.includes('Translating') && !text.includes('Error')) {
                stopSpeech();
                speakText(text, targetLang ? targetLang.value : 'en');
                showNotification('🔊 Reading translation...', 'info', 2000);
            }
        });
        newOutputSpeaker.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.click();
        }, { passive: false });
    }

    // Translation functions
    function updateTranslateFromBtn(detectedLang, text) {
        if (!text || text.length < 2 || isRecording) {
            if (translateFromContainer) translateFromContainer.style.display = 'none';
            if (translateFromBtn) translateFromBtn.dataset.lang = '';
            return;
        }
        var selectedLang = sourceLang ? sourceLang.value : 'en';
        if (detectedLang && detectedLang !== 'auto' && detectedLang !== selectedLang) {
            var langName = LANGUAGES.find(function(l) { return l.code === detectedLang; })?.name || detectedLang;
            if (translateFromBtn) {
                translateFromBtn.textContent = 'Translate from: ' + langName;
                translateFromBtn.dataset.lang = detectedLang;
            }
            if (translateFromContainer) translateFromContainer.style.display = 'block';
        } else {
            if (translateFromContainer) translateFromContainer.style.display = 'none';
            if (translateFromBtn) translateFromBtn.dataset.lang = '';
        }
    }

    function resetTranslateFromBtn() {
        if (translateFromContainer) translateFromContainer.style.display = 'none';
        if (translateFromBtn) translateFromBtn.dataset.lang = '';
    }

    async function detectLanguage(text) {
        if (!text || text.length < 3) return 'en';
        try {
            var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' + encodeURIComponent(text);
            var response = await fetch(url);
            var data = await response.json();
            if (data && data[2]) {
                return data[2];
            }
            return 'en';
        } catch (error) {
            return 'en';
        }
    }

    async function translateText(text, sourceLangCode, targetLangCode) {
        if (!text || text.trim().length === 0) {
            return '';
        }
        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + sourceLangCode + '&tl=' + targetLangCode + '&dt=t&q=' + encodeURIComponent(text);
        var response = await fetch(url);
        var data = await response.json();
        if (data && data[0]) {
            return data[0].map(function(item) { return item[0]; }).join('');
        }
        throw new Error('Translation failed');
    }

    async function performTranslation() {
        var text = inputText ? inputText.value.trim() : '';
        if (!text) {
            if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                translateBtn.disabled = false;
            }
            resetTranslateFromBtn();
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
        try {
            var detectedLang = null;
            if (!isRecording && text.length > 3) {
                detectedLang = await detectLanguage(text);
            }
            if (!isRecording && detectedLang && detectedLang !== 'auto') {
                updateTranslateFromBtn(detectedLang, text);
            } else {
                resetTranslateFromBtn();
            }
            var sourceLangCode = sourceLang ? sourceLang.value : 'en';
            var targetLangCode = targetLang ? targetLang.value : 'en';
            var translated = await translateText(text, sourceLangCode, targetLangCode);
            if (outputDisplay) outputDisplay.textContent = translated;
            if (isLoggedIn && currentUser) {
                await saveToHistory(text, translated, sourceLangCode, targetLangCode);
            }
        } catch (error) {
            if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Error: ' + error.message + '</span>';
        } finally {
            isTranslating = false;
            if (translateBtn) {
                translateBtn.disabled = false;
                translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
            }
            if (translateQueue) {
                setTimeout(function() { performTranslation(); }, 30);
            }
        }
    }

    // Event listeners
    if (translateBtn) {
        translateBtn.addEventListener('click', function() {
            if (!isTranslating) {
                performTranslation();
            }
        });
        translateBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (!isTranslating) {
                performTranslation();
            }
        }, { passive: false });
    }

    if (inputText) {
        inputText.addEventListener('input', function() {
            var text = inputText.value.trim();
            if (!text) {
                stopSpeech();
            }
            if (text) {
                if (translateBtn) {
                    translateBtn.disabled = true;
                    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
                }
                if (!isRecording && text.length > 3) {
                    detectLanguage(text).then(function(detectedLang) {
                        if (detectedLang && detectedLang !== 'auto') {
                            updateTranslateFromBtn(detectedLang, text);
                        }
                        performTranslation();
                    }).catch(function() {
                        performTranslation();
                    });
                } else {
                    resetTranslateFromBtn();
                    performTranslation();
                }
            } else {
                if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
                if (translateBtn) {
                    translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                    translateBtn.disabled = false;
                }
                resetTranslateFromBtn();
            }
        });
    }

    if (sourceLang) {
        sourceLang.addEventListener('change', function() {
            stopRecordingIfActive();
            resetTranslateFromBtn();
            stopSpeech();
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
            var text = inputText ? inputText.value.trim() : '';
            if (text) {
                performTranslation();
            }
        });
    }

    if (swapBtn) {
        swapBtn.addEventListener('click', function() {
            stopRecordingIfActive();
            stopSpeech();
            var temp = sourceLang ? sourceLang.value : 'rw';
            if (sourceLang) sourceLang.value = targetLang ? targetLang.value : 'en';
            if (targetLang) targetLang.value = temp;
            if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
            if (inputText) inputText.value = '';
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                translateBtn.disabled = false;
            }
            resetTranslateFromBtn();
        });
        swapBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            stopRecordingIfActive();
            stopSpeech();
            var temp = sourceLang ? sourceLang.value : 'rw';
            if (sourceLang) sourceLang.value = targetLang ? targetLang.value : 'en';
            if (targetLang) targetLang.value = temp;
            if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
            if (inputText) inputText.value = '';
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                translateBtn.disabled = false;
            }
            resetTranslateFromBtn();
        }, { passive: false });
    }

    if (copyOutputBtn) {
        copyOutputBtn.addEventListener('click', async function() {
            var text = outputDisplay ? outputDisplay.textContent : '';
            if (text && !text.includes('placeholder') && !text.includes('Please enter') && !text.includes('Translating') && !text.includes('Error')) {
                await navigator.clipboard.writeText(text);
                showNotification('Copied!', 'success');
            }
        });
        copyOutputBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.click();
        }, { passive: false });
    }

    if (clearInputBtn) {
        clearInputBtn.addEventListener('click', function() {
            stopRecordingIfActive();
            stopSpeech();
            if (inputText) inputText.value = '';
            if (outputDisplay) outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
                translateBtn.disabled = false;
            }
            resetTranslateFromBtn();
        });
        clearInputBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.click();
        }, { passive: false });
    }

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
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                if (recordingStatus) recordingStatus.textContent = 'Click mic to speak';
            }
            resetTranslateFromBtn();
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
            recognition.lang = sourceLang ? sourceLang.value || 'en' : 'en';
            recognition.maxAlternatives = 1;
            
            recognition.onstart = function() {
                isRecording = true;
                if (micBtn) {
                    micBtn.classList.add('recording');
                    micBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                }
                if (recordingStatus) recordingStatus.textContent = '🎤 Recording... Click to stop';
                resetTranslateFromBtn();
            };
            
            recognition.onresult = function(event) {
                var finalText = '';
                var interimText = '';
                for (var i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalText += event.results[i][0].transcript;
                    } else {
                        interimText += event.results[i][0].transcript;
                    }
                }
                if (interimText && inputText) {
                    inputText.value = finalText + interimText;
                    if (translateBtn) {
                        translateBtn.disabled = true;
                        translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
                    }
                    performTranslation();
                }
                if (finalText && inputText) {
                    var currentText = inputText.value;
                    if (currentText.includes(finalText) || currentText === finalText) {
                        inputText.value = finalText;
                    } else {
                        inputText.value = currentText + ' ' + finalText;
                    }
                    performTranslation();
                }
            };
            
            recognition.onerror = function(event) {
                if (event.error === 'no-speech') return;
                if (event.error === 'not-allowed') {
                    showNotification('Microphone access denied. Please allow microphone access.', 'error');
                }
                if (!isRecording) {
                    if (micBtn) {
                        micBtn.classList.remove('recording');
                        micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                    }
                    if (recordingStatus) recordingStatus.textContent = 'Click mic to speak';
                    resetTranslateFromBtn();
                }
            };
            
            recognition.onend = function() {
                if (isRecording) {
                    try {
                        recognition.lang = sourceLang ? sourceLang.value || 'en' : 'en';
                        recognition.start();
                    } catch (e) {
                        isRecording = false;
                        if (micBtn) {
                            micBtn.classList.remove('recording');
                            micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                        }
                        if (recordingStatus) recordingStatus.textContent = 'Click mic to speak';
                        resetTranslateFromBtn();
                    }
                } else {
                    if (micBtn) {
                        micBtn.classList.remove('recording');
                        micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                    }
                    if (recordingStatus) recordingStatus.textContent = 'Click mic to speak';
                    resetTranslateFromBtn();
                }
            };
        }
        
        initRecognition();
        
        if (micBtn) {
            micBtn.addEventListener('click', function() {
                if (isRecording) {
                    isRecording = false;
                    try {
                        if (recognition) {
                            recognition.stop();
                        }
                    } catch (e) {}
                    micBtn.classList.remove('recording');
                    micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
                    if (recordingStatus) recordingStatus.textContent = 'Click mic to speak';
                    showNotification('⏹ Recording stopped.', 'info', 2000);
                    var text = inputText ? inputText.value.trim() : '';
                    if (text && text.length > 3) {
                        detectLanguage(text).then(function(detectedLang) {
                            if (detectedLang && detectedLang !== 'auto') {
                                updateTranslateFromBtn(detectedLang, text);
                            }
                        }).catch(function() {});
                    }
                } else {
                    var lang = sourceLang ? sourceLang.value || 'en' : 'en';
                    if (recognition) {
                        recognition.lang = lang;
                        try {
                            recognition.start();
                        } catch (e) {
                            initRecognition();
                            if (recognition) {
                                recognition.lang = lang;
                                try {
                                    recognition.start();
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
                            } catch (e) {
                                showNotification('Error starting microphone. Please try again.', 'error');
                            }
                        }
                    }
                }
            });
            micBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.click();
            }, { passive: false });
        }
        
        // Update recognition language when source language changes
        if (sourceLang) {
            sourceLang.addEventListener('change', function() {
                if (recognition && isRecording) {
                    recognition.lang = sourceLang.value || 'en';
                }
            });
        }
        
    } else {
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.title = 'Speech recognition not supported';
        }
        if (recordingStatus) {
            recordingStatus.textContent = '⚠️ Not supported';
        }
    }
}

// ============================================================
// THEME TOGGLE
// ============================================================
function setupThemeToggle() {
    var themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            this.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
        });
        themeToggle.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            this.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
        }, { passive: false });
        
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
}

// ============================================================
// ABOUT MODAL
// ============================================================
function setupAboutModal() {
    var aboutNavBtn = document.getElementById('aboutNavBtn');
    var aboutModal = document.getElementById('aboutModal');
    var closeAboutModal = document.getElementById('closeAboutModal');
    
    if (aboutNavBtn) {
        aboutNavBtn.addEventListener('click', function() {
            if (aboutModal) aboutModal.style.display = 'flex';
        });
        aboutNavBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (aboutModal) aboutModal.style.display = 'flex';
        }, { passive: false });
    }
    
    if (closeAboutModal) {
        closeAboutModal.addEventListener('click', function() {
            if (aboutModal) aboutModal.style.display = 'none';
        });
        closeAboutModal.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (aboutModal) aboutModal.style.display = 'none';
        }, { passive: false });
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
// INIT ALL
// ============================================================
function initApp() {
    console.log('✅ FreeTranslate Language initialized on:', navigator.userAgent);
    console.log('📱 Screen size:', window.innerWidth, 'x', window.innerHeight);
    
    // Populate languages immediately
    populateLanguageDropdowns();
    
    // Setup all features
    setupAuthButton(document.getElementById('authBtn'));
    setupCloseModal();
    setupAuthForm();
    setupHistoryButton();
    setupTranslation();
    setupThemeToggle();
    setupAboutModal();
    
    // Check auth status
    checkAuthStatus();
    
    console.log('✅ All features initialized!');
}

// ============================================================
// START APPLICATION
// ============================================================
// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Also run when window loads (for safety)
window.addEventListener('load', function() {
    // Ensure languages are populated
    var sourceLang = document.getElementById('sourceLang');
    if (sourceLang && sourceLang.options.length === 0) {
        populateLanguageDropdowns();
    }
});
