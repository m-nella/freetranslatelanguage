// ============================================================
// FREE TRANSLATE LANGUAGE - Complete Application
// FULLY MOBILE COMPATIBLE
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
// SAFE DOM HELPERS - Works on all browsers
// ============================================================
function $(id) {
    return document.getElementById(id);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function on(element, event, handler) {
    if (!element) return;
    // Handle both click and touch on mobile
    if (event === 'click') {
        element.addEventListener('click', handler);
        element.addEventListener('touchstart', function(e) {
            // Prevent ghost clicks
            e.preventDefault();
            handler(e);
        }, { passive: false });
    } else {
        element.addEventListener(event, handler);
    }
}

function show(element) {
    if (element) element.style.display = 'block';
}

function hide(element) {
    if (element) element.style.display = 'none';
}

// ============================================================
// POPULATE LANGUAGES
// ============================================================
function populateLanguageDropdowns() {
    console.log('🔄 Populating languages...');
    
    var sourceLang = $('sourceLang');
    var targetLang = $('targetLang');
    
    if (!sourceLang || !targetLang) {
        console.error('❌ Dropdowns not found, retrying...');
        setTimeout(populateLanguageDropdowns, 200);
        return;
    }
    
    // Clear existing options
    sourceLang.innerHTML = '';
    targetLang.innerHTML = '';
    
    // Populate dropdowns
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
    
    console.log('✅ Languages populated!');
}

// ============================================================
// NOTIFICATION SYSTEM
// ============================================================
var notificationTimeout = null;

function showNotification(message, type, duration) {
    type = type || 'info';
    duration = duration || 5000;
    
    var container = $('notificationContainer');
    if (!container) return;
    
    // Clear old notifications
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
    
    var icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    var notification = document.createElement('div');
    notification.className = 'notification ' + type;
    notification.innerHTML = `
        <span class="notif-icon">${icons[type] || 'ℹ️'}</span>
        <span class="notif-content">${message}</span>
        <button class="notif-close">&times;</button>
    `;
    
    container.innerHTML = '';
    container.appendChild(notification);
    
    var closeBtn = notification.querySelector('.notif-close');
    on(closeBtn, 'click', function(e) {
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
    } catch (e) {
        console.warn('Speech synthesis error:', e);
    }
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
// PASSWORD TOGGLE - Mobile compatible
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
    
    on(toggle, 'click', function(e) {
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
            on(newToggle, 'click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var inp = this.parentNode.querySelector('input');
                var isPassword = inp.type === 'password';
                inp.type = isPassword ? 'text' : 'password';
                this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            });
        }
    }
}

// ============================================================
// VERIFICATION CODE SYSTEM
// ============================================================
async function sendVerificationCode(email, action) {
    try {
        var result = await DATA_MANAGER.storeVerificationCode(email, action);
        if (result.success) {
            showNotification('📧 Verification code sent! Check your email and spam folder.', 'success');
            return { success: true, code: result.code };
        } else {
            showNotification('⚠️ Error sending code. Please try again.', 'error');
            return { success: false };
        }
    } catch (error) {
        showNotification('⚠️ Error sending code. Please try again.', 'error');
        return { success: false };
    }
}

async function verifyCode(email, code) {
    isVerifying = true;
    try {
        var result = DATA_MANAGER.verifyCode(email, code, pendingAction);
        if (result.success) {
            return { success: true, token: 'local_' + email };
        } else {
            return { success: false, error: result.error || 'Invalid code.' };
        }
    } catch (error) {
        return { success: false, error: 'Verification error.' };
    } finally {
        isVerifying = false;
    }
}

// ============================================================
// MODAL FUNCTIONS
// ============================================================
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
        
        on(modal.querySelector('#cancelConfirm'), 'click', function() {
            modal.remove();
            resolve(false);
        });
        
        on(modal.querySelector('#confirmAction'), 'click', function() {
            modal.remove();
            resolve(true);
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
        
        var newPassword = $('resetNewPassword');
        var confirmPassword = $('resetConfirmPassword');
        var confirmBtn = modal.querySelector('#resetConfirm');
        var cancelBtn = modal.querySelector('#resetCancel');
        
        on(confirmBtn, 'click', function() {
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
        
        on(cancelBtn, 'click', function() {
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
    on(closeBtn, 'click', function() {
        modal.remove();
        isVerifying = false;
        verificationDone = false;
    });
    
    var form = $('verificationForm');
    var submitBtn = $('verifySubmitBtn');
    var codeInput = $('verificationCode');
    
    on(form, 'submit', async function(e) {
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
                showNotification(result.error || 'Invalid code.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify';
                submitBtn.style.backgroundColor = '';
                isVerifying = false;
                codeInput.value = '';
                codeInput.focus();
            }
        } catch (error) {
            showNotification('Verification error.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify';
            submitBtn.style.backgroundColor = '';
            isVerifying = false;
        }
    });
    
    var resendBtn = $('resendCodeBtn');
    on(resendBtn, 'click', async function(e) {
        e.preventDefault();
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
        }
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
function setupAuthButton() {
    var authBtn = $('authBtn');
    if (!authBtn) return;
    
    on(authBtn, 'click', function() {
        if (isLoggedIn) {
            toggleProfileMenu();
        } else {
            openModal('login');
        }
    });
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
    
    var authBtn = $('authBtn');
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
    
    var items = profileMenu.querySelectorAll('.user-menu-item');
    for (var i = 0; i < items.length; i++) {
        (function(item) {
            on(item, 'click', function() {
                var action = this.dataset.action;
                if (profileMenu) {
                    profileMenu.remove();
                    profileMenu = null;
                }
                if (action === 'profile') openProfileModal();
                else if (action === 'account') openAccountSettings();
                else if (action === 'logout') logoutUser();
            });
        })(items[i]);
    }
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
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        authBtn.classList.remove('logged-in');
    }
    if (historyNavBtn) historyNavBtn.style.display = 'none';
    showNotification('Logged out.', 'info');
    if (profileMenu) profileMenu.remove();
}

// ============================================================
// PROFILE MODAL
// ============================================================
function openProfileModal() {
    var user = DATA_MANAGER.getCurrentUser();
    if (!user) {
        showNotification('Please sign in.', 'warning');
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
    
    on(modal.querySelector('.close-profile'), 'click', function() { modal.remove(); });
    on(modal.querySelector('#goToSettingsBtn'), 'click', function() {
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
        showNotification('Please sign in.', 'warning');
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
                    <small style="color: #888; font-size: 12px;">Username is auto-generated</small>
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
    
    on(modal.querySelector('.close-settings'), 'click', function() { modal.remove(); });
    
    on(modal.querySelector('#saveSettingsBtn'), 'click', async function() {
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
            var result = await sendVerificationCode(newEmail, 'email');
            if (!result.success) {
                showNotification('Error sending code.', 'error');
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
                    showNotification('Email updated!', 'success');
                    user.email = newEmail;
                    user.username = newEmail.split('@')[0];
                    modal.remove();
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
            var result = await sendVerificationCode(user.email, 'password');
            if (!result.success) {
                showNotification('Error sending code.', 'error');
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
                return;
            }
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            openVerificationModal(user.email, 'password', async function(token) {
                var updateResult = DATA_MANAGER.changePassword(user.id, currentPassword, newPassword);
                if (updateResult.success) {
                    showNotification('Password updated!', 'success');
                    modal.remove();
                } else {
                    showNotification('Error updating password.', 'error');
                }
            });
            return;
        }
        showNotification('No changes made.', 'info');
        modal.remove();
    });
    
    on(modal.querySelector('#deleteAccountBtn'), 'click', async function() {
        var confirmed = await showConfirmationModal(
            'Delete Account',
            'Are you sure? This cannot be undone.',
            'Delete Account',
            'Cancel'
        );
        if (!confirmed) return;
        var password = prompt('Enter your password to confirm:');
        if (password === null) return;
        if (!password || password.trim() === '') {
            showNotification('Password is required.', 'error');
            return;
        }
        if (!DATA_MANAGER.verifyPassword(password, user.password)) {
            showNotification('Incorrect password.', 'error');
            return;
        }
        var deleteBtn = $('deleteAccountBtn');
        var originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Sending code...';
        deleteBtn.disabled = true;
        var result = await sendVerificationCode(user.email, 'delete');
        if (!result.success) {
            showNotification('Error sending code.', 'error');
            deleteBtn.textContent = originalText;
            deleteBtn.disabled = false;
            return;
        }
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
        openVerificationModal(user.email, 'delete', async function(token) {
            var deleteResult = DATA_MANAGER.deleteAccount(user.id, password);
            if (deleteResult.success) {
                localStorage.removeItem('authToken');
                showNotification('Account deleted.', 'info');
                modal.remove();
                window.location.reload();
            } else {
                showNotification('Error deleting account.', 'error');
            }
        });
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
        authFields.appendChild(email);
        
        var password = createPasswordField('authPassword', 'Password');
        authFields.appendChild(password);
        bindPasswordToggles(authModal);
        
        forgotPasswordLink.style.display = 'block';
        on(forgotPasswordBtn, 'click', function(e) {
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
        authFields.appendChild(email);
        
        var password = createPasswordField('authPassword', 'Password (min 8 chars)');
        authFields.appendChild(password);
        var confirm = createPasswordField('authConfirmPassword', 'Confirm password');
        authFields.appendChild(confirm);
        bindPasswordToggles(authModal);
        
        var hint = document.createElement('small');
        hint.textContent = 'Password: 8+ chars, uppercase, lowercase, number, special';
        authFields.appendChild(hint);
        forgotPasswordLink.style.display = 'none';
    }
    
    var switchLink = $('authSwitchLink');
    if (switchLink) {
        on(switchLink, 'click', function(e) {
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
// CLOSE MODAL
// ============================================================
function setupCloseModal() {
    var closeAuthModal = $('closeAuthModal');
    var authModal = $('authModal');
    
    if (closeAuthModal) {
        on(closeAuthModal, 'click', function() {
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
    
    on(authForm, 'submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var email = $('authEmail').value;
        var password = $('authPassword')?.value || '';
        
        try {
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
                var codeResult = await sendVerificationCode(email, 'signin');
                if (!codeResult.success) {
                    showNotification('Error sending code.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                    return;
                }
                if (authModal) authModal.style.display = 'none';
                openVerificationModal(email, 'signin', async function(token) {
                    showNotification('Signed in!', 'success');
                    await checkAuthStatus();
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
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
                var codeResult = await sendVerificationCode(email, 'reset');
                if (!codeResult.success) {
                    showNotification('Error sending code.', 'error');
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
                        showNotification('Cancelled.', 'info');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        pendingResetEmail = '';
                        pendingResetUser = null;
                        return;
                    }
                    if (DATA_MANAGER.verifyPassword(newPassword, pendingResetUser.password)) {
                        showNotification('Must be different from current.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        pendingResetEmail = '';
                        pendingResetUser = null;
                        return;
                    }
                    var users = DATA_MANAGER.loadUsers();
                    var index = users.findIndex(function(u) { return u.id === pendingResetUser.id; });
                    if (index === -1) {
                        showNotification('User not found.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Send Reset Code';
                        pendingResetEmail = '';
                        pendingResetUser = null;
                        return;
                    }
                    users[index].password = DATA_MANAGER.hashPassword(newPassword);
                    DATA_MANAGER.saveUsers(users);
                    showNotification('Password reset! Please sign in.', 'success');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    pendingResetEmail = '';
                    pendingResetUser = null;
                    setTimeout(function() { openModal('login'); }, 2000);
                });
            } else if (currentMode === 'signup') {
                var confirmPassword = $('authConfirmPassword')?.value || '';
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
                var codeResult = await sendVerificationCode(email, 'signup');
                if (!codeResult.success) {
                    showNotification('Error sending code.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    return;
                }
                if (authModal) authModal.style.display = 'none';
                openVerificationModal(email, 'signup', async function(token) {
                    showNotification('Account created!', 'success');
                    await checkAuthStatus();
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                });
            }
        } catch (error) {
            showNotification('An error occurred.', 'error');
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
    var historyNavBtn = $('historyNavBtn');
    if (historyNavBtn) {
        on(historyNavBtn, 'click', function() {
            openHistoryModal();
        });
    }
}

function openHistoryModal() {
    if (!isLoggedIn || !currentUser) {
        showNotification('Please sign in.', 'warning');
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
    
    on(historyModal.querySelector('.close-history'), 'click', function() {
        historyModal.style.display = 'none';
    });
    
    loadHistoryModal();
    
    on(historyModal.querySelector('#deleteAllHistory'), 'click', async function() {
        if (!isLoggedIn || !currentUser) {
            showNotification('Please sign in.', 'warning');
            return;
        }
        var confirmed = await showConfirmationModal(
            'Delete All History',
            'Are you sure? This cannot be undone.',
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
            html += `
                <div class="history-item" data-id="${item.id}">
                    <button class="h-delete" data-id="${item.id}" title="Delete">
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
        }
        historyList.innerHTML = html;
        var deleteBtns = historyList.querySelectorAll('.h-delete');
        for (var j = 0; j < deleteBtns.length; j++) {
            (function(btn) {
                on(btn, 'click', async function() {
                    var id = this.dataset.id;
                    var confirmed = await showConfirmationModal(
                        'Delete History',
                        'Delete this translation?',
                        'Delete',
                        'Cancel'
                    );
                    if (!confirmed) return;
                    var result = DATA_MANAGER.deleteHistoryItem(currentUser.email, id);
                    if (result.success) {
                        await loadHistoryModal();
                        showNotification('Deleted.', 'info');
                    } else {
                        showNotification('Error deleting.', 'error');
                    }
                });
            })(deleteBtns[j]);
        }
    } catch (error) {
        historyList.innerHTML = '<p class="empty-history">Could not load history.</p>';
    }
}

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
// SAVE TO HISTORY
// ============================================================
function saveToHistory(original, translated, sourceLang, targetLang) {
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
    
    // Create Translate From Container
    translateFromContainer = document.createElement('div');
    translateFromContainer.className = 'translate-from-container';
    translateFromContainer.style.display = 'none';
    translateFromContainer.style.marginTop = '6px';
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

    on(translateFromBtn, 'click', function() {
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

    // Add Speaker Icon to Input Field
    var inputSpeakerBtn = document.createElement('button');
    inputSpeakerBtn.className = 'action-btn input-speaker-btn';
    inputSpeakerBtn.style.cssText = 'background:transparent;border:none;color:var(--text-light);padding:4px 8px;border-radius:6px;cursor:pointer;transition:var(--transition);font-size:0.85rem;';
    inputSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    inputSpeakerBtn.title = 'Read input text aloud';

    var inputBoxActions = inputBox?.querySelector('.box-actions');
    if (inputBoxActions) {
        inputBoxActions.appendChild(inputSpeakerBtn);
    }

    on(inputSpeakerBtn, 'click', function() {
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
        on(newOutputSpeaker, 'click', function() {
            var text = outputDisplay ? outputDisplay.textContent : '';
            if (text && !text.includes('placeholder') && !text.includes('Please enter') && !text.includes('Translating') && !text.includes('Error')) {
                stopSpeech();
                speakText(text, targetLang ? targetLang.value : 'en');
                showNotification('🔊 Reading translation...', 'info', 2000);
            }
        });
    }

    // Translation functions
    function updateTranslateFromBtn(detectedLang, text) {
        if (!text || text.length < 2 || isRecording) {
            translateFromContainer.style.display = 'none';
            translateFromBtn.dataset.lang = '';
            return;
        }
        var selectedLang = sourceLang ? sourceLang.value : 'en';
        if (detectedLang && detectedLang !== 'auto' && detectedLang !== selectedLang) {
            var langName = getLanguageName(detectedLang);
            translateFromBtn.textContent = 'Translate from: ' + langName;
            translateFromBtn.dataset.lang = detectedLang;
            translateFromContainer.style.display = 'block';
        } else {
            translateFromContainer.style.display = 'none';
            translateFromBtn.dataset.lang = '';
        }
    }

    function resetTranslateFromBtn() {
        translateFromContainer.style.display = 'none';
        translateFromBtn.dataset.lang = '';
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
            var result = '';
            for (var i = 0; i < data[0].length; i++) {
                result += data[0][i][0];
            }
            return result;
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
                saveToHistory(text, translated, sourceLangCode, targetLangCode);
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
    on(translateBtn, 'click', function() {
        if (!isTranslating) {
            performTranslation();
        }
    });

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

    on(swapBtn, 'click', function() {
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

    on(copyOutputBtn, 'click', async function() {
        var text = outputDisplay ? outputDisplay.textContent : '';
        if (text && !text.includes('placeholder') && !text.includes('Please enter') && !text.includes('Translating') && !text.includes('Error')) {
            try {
                await navigator.clipboard.writeText(text);
                showNotification('Copied!', 'success');
            } catch (e) {
                // Fallback
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

    on(clearInputBtn, 'click', function() {
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

    // MIC - Recording System
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
                    showNotification('Microphone access denied.', 'error');
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
        
        on(micBtn, 'click', function() {
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
                                showNotification('Error starting mic.', 'error');
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
                            showNotification('Error starting mic.', 'error');
                        }
                    }
                }
            }
        });
        
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
    var themeToggle = $('themeToggle');
    if (themeToggle) {
        on(themeToggle, 'click', function() {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            this.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
        });
        
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
    var aboutNavBtn = $('aboutNavBtn');
    var aboutModal = $('aboutModal');
    var closeAboutModal = $('closeAboutModal');
    
    if (aboutNavBtn) {
        on(aboutNavBtn, 'click', function() {
            if (aboutModal) aboutModal.style.display = 'flex';
        });
    }
    
    if (closeAboutModal) {
        on(closeAboutModal, 'click', function() {
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
// INITIALIZATION
// ============================================================
function initApp() {
    console.log('🚀 FreeTranslateLanguage starting...');
    console.log('📱 Device:', navigator.userAgent);
    
    // Populate languages
    populateLanguageDropdowns();
    
    // Setup features
    setupAuthButton();
    setupCloseModal();
    setupAuthForm();
    setupHistoryButton();
    setupTranslation();
    setupThemeToggle();
    setupAboutModal();
    
    // Check auth
    checkAuthStatus();
    
    console.log('✅ All features initialized!');
}

// ============================================================
// START APP
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Run again on load for safety
window.addEventListener('load', function() {
    var sourceLang = $('sourceLang');
    if (sourceLang && sourceLang.options.length === 0) {
        populateLanguageDropdowns();
    }
});
