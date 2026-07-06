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

// ============================================================
// DOM ELEMENTS
// ============================================================
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const authForm = document.getElementById('authForm');
const authFields = document.getElementById('authFields');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authModalTitle = document.getElementById('authModalTitle');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchLink = document.getElementById('authSwitchLink');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const notificationContainer = document.getElementById('notificationContainer');
const themeToggle = document.getElementById('themeToggle');
const aboutNavBtn = document.getElementById('aboutNavBtn');
const aboutModal = document.getElementById('aboutModal');
const closeAboutModal = document.getElementById('closeAboutModal');
const historyNavBtn = document.getElementById('historyNavBtn');

let profileMenu = null;
let settingsModal = null;
let historyModal = null;

// ============================================================
// NOTIFICATION SYSTEM
// ============================================================
let notificationTimeout = null;

function clearAllNotifications() {
    if (notificationContainer) {
        notificationContainer.innerHTML = '';
    }
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    const container = notificationContainer;
    if (!container) return;
    
    clearAllNotifications();
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notif-icon">${icons[type] || 'ℹ️'}</span>
        <span class="notif-content">${message}</span>
        <button class="notif-close">&times;</button>
    `;
    const closeBtn = notification.querySelector('.notif-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });
    container.appendChild(notification);
    
    notificationTimeout = setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
        notificationTimeout = null;
    }, duration);
}

// ============================================================
// PASSWORD TOGGLE
// ============================================================
function createPasswordField(id, placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    const input = document.createElement('input');
    input.type = 'password';
    input.id = id;
    input.placeholder = placeholder;
    input.required = true;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.innerHTML = '<i class="fas fa-eye"></i>';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
    wrapper.appendChild(input);
    wrapper.appendChild(toggle);
    return wrapper;
}

function bindPasswordToggles(container) {
    if (!container) return;
    const fields = container.querySelectorAll('.password-field');
    fields.forEach(wrapper => {
        const input = wrapper.querySelector('input');
        const toggle = wrapper.querySelector('.password-toggle');
        if (input && toggle) {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            newToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            });
        }
    });
}

// ============================================================
// CLEAR PASSWORD FIELDS
// ============================================================
function clearAllPasswordFields() {
    document.querySelectorAll('input[type="password"]').forEach(input => {
        input.value = '';
    });
}

// ============================================================
// VERIFICATION CODE SYSTEM
// ============================================================

async function sendVerificationCode(email, action = 'verification') {
    try {
        const result = await DATA_MANAGER.storeVerificationCode(email, action);
        
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
        const result = DATA_MANAGER.verifyCode(email, code, pendingAction);
        
        if (result.success) {
            return { 
                success: true, 
                token: 'local_' + email
            };
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

// Custom prompt modal for password confirmation
function showPasswordConfirmModal(title, message, inputPlaceholder = 'Enter your password', inputType = 'password') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
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
        
        const input = document.getElementById('promptPasswordInput');
        const confirmBtn = modal.querySelector('#promptConfirm');
        const cancelBtn = modal.querySelector('#promptCancel');
        
        input.focus();
        
        confirmBtn.addEventListener('click', () => {
            const value = input.value;
            modal.remove();
            resolve(value);
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.remove();
            resolve(null);
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const value = input.value;
                modal.remove();
                resolve(value);
            }
            if (e.key === 'Escape') {
                modal.remove();
                resolve(null);
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}

// Custom password reset modal
function showPasswordResetModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
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
        
        const newPassword = document.getElementById('resetNewPassword');
        const confirmPassword = document.getElementById('resetConfirmPassword');
        const confirmBtn = modal.querySelector('#resetConfirm');
        const cancelBtn = modal.querySelector('#resetCancel');
        
        newPassword.focus();
        
        confirmBtn.addEventListener('click', () => {
            const pass1 = newPassword.value;
            const pass2 = confirmPassword.value;
            
            if (!pass1 || pass1.length < 8) {
                showNotification('Password must be at least 8 characters.', 'error');
                return;
            }
            
            if (pass1 !== pass2) {
                showNotification('Passwords do not match!', 'error');
                return;
            }
            
            const validation = DATA_MANAGER.validatePasswordStrength(pass1);
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }
            
            modal.remove();
            resolve(pass1);
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.remove();
            resolve(null);
        });
        
        modal.addEventListener('click', (e) => {
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
function showConfirmationModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
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
        
        modal.querySelector('#cancelConfirm').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        modal.querySelector('#confirmAction').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
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
    
    const existing = document.getElementById('verificationModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'verificationModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content verification-content">
            <span class="close-modal close-verification">&times;</span>
            <h2>${action === 'signup' ? 'Verify Your Email' : action === 'signin' ? 'Verify Sign In' : action === 'delete' ? 'Confirm Delete Account' : action === 'email' ? 'Verify Email Change' : action === 'password' ? 'Verify Password Change' : action === 'reset' ? 'Reset Password' : 'Verification Required'}</h2>
            <p class="verification-desc">Enter the 6-digit verification code sent to your email.</p>
            <form id="verificationForm">
                <input type="text" id="verificationCode" placeholder="Enter 6-digit code" maxlength="6" autocomplete="off" required>
                <button type="submit" class="auth-submit-btn" id="verifySubmitBtn">Verify</button>
            </form>
            <p class="auth-switch">Didn't receive code? <a href="#" id="resendCodeBtn">Resend Code</a></p>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            e.stopPropagation();
        }
    });
    
    const closeBtn = modal.querySelector('.close-verification');
    closeBtn.addEventListener('click', () => {
        modal.remove();
        isVerifying = false;
        verificationDone = false;
    });
    
    const form = modal.querySelector('#verificationForm');
    const submitBtn = modal.querySelector('#verifySubmitBtn');
    const codeInput = document.getElementById('verificationCode');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (verificationDone) return;
        if (isVerifying) return;
        
        const code = codeInput.value.trim();
        if (!code || code.length !== 6) {
            showNotification('Please enter a valid 6-digit code.', 'error');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        isVerifying = true;
        
        try {
            const result = await verifyCode(email, code);
            
            if (result.success) {
                verificationDone = true;
                submitBtn.textContent = '✓ Verified';
                submitBtn.style.backgroundColor = '#4CAF50';
                codeInput.disabled = true;
                
                showNotification('Verification successful!', 'success');
                
                if (result.token) {
                    localStorage.setItem('authToken', result.token);
                }
                
                setTimeout(() => {
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
    
    const resendBtn = modal.querySelector('#resendCodeBtn');
    resendBtn.addEventListener('click', async (e) => {
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
        
        const result = await sendVerificationCode(email, pendingAction);
        if (result.success) {
            showNotification('New code sent! Check your email.', 'success');
        } else {
            showNotification('Error sending code. Please try again.', 'error');
        }
    });
    
    setTimeout(() => {
        codeInput.focus();
    }, 200);
}

// ============================================================
// AUTH STATE
// ============================================================
async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        isLoggedIn = false;
        currentUser = null;
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        authBtn.classList.remove('logged-in');
        if (historyNavBtn) historyNavBtn.style.display = 'none';
        return;
    }
    
    const user = DATA_MANAGER.getCurrentUser();
    if (user) {
        currentUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        };
        isLoggedIn = true;
        authBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.username}`;
        authBtn.classList.add('logged-in');
        if (historyNavBtn) historyNavBtn.style.display = 'flex';
    } else {
        localStorage.removeItem('authToken');
        isLoggedIn = false;
        currentUser = null;
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        authBtn.classList.remove('logged-in');
        if (historyNavBtn) historyNavBtn.style.display = 'none';
    }
}

// ============================================================
// AUTH BUTTON
// ============================================================
authBtn.addEventListener('click', () => {
    if (isLoggedIn) {
        toggleProfileMenu();
    } else {
        openModal('login');
    }
});

// ============================================================
// PROFILE MENU
// ============================================================
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
    
    const rect = authBtn.getBoundingClientRect();
    profileMenu.style.top = rect.bottom + 10 + 'px';
    profileMenu.style.right = window.innerWidth - rect.right + 'px';
    
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (profileMenu && !profileMenu.contains(e.target) && e.target !== authBtn) {
                profileMenu.remove();
                profileMenu = null;
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
    
    profileMenu.querySelectorAll('.user-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            if (profileMenu) {
                profileMenu.remove();
                profileMenu = null;
            }
            if (action === 'profile') openProfileModal();
            else if (action === 'account') openAccountSettings();
            else if (action === 'logout') logoutUser();
        });
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
    authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
    authBtn.classList.remove('logged-in');
    if (historyNavBtn) historyNavBtn.style.display = 'none';
    showNotification('Logged out successfully.', 'info');
    clearAllPasswordFields();
    if (profileMenu) profileMenu.remove();
}

// ============================================================
// PROFILE MODAL
// ============================================================
function openProfileModal() {
    const user = DATA_MANAGER.getCurrentUser();
    if (!user) {
        showNotification('Please sign in to view profile.', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
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
    
    modal.querySelector('.close-profile').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    modal.querySelector('#goToSettingsBtn').addEventListener('click', () => {
        modal.remove();
        openAccountSettings();
    });
}

// ============================================================
// ACCOUNT SETTINGS
// ============================================================
function openAccountSettings() {
    const user = DATA_MANAGER.getCurrentUser();
    if (!user) {
        showNotification('Please sign in to access settings.', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
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
    
    modal.querySelector('.close-settings').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    modal.querySelector('#saveSettingsBtn').addEventListener('click', async () => {
        const newEmail = document.getElementById('settingsEmail').value;
        const currentPassword = document.getElementById('settingsCurrentPassword').value;
        const newPassword = document.getElementById('settingsNewPassword').value;
        const confirmPassword = document.getElementById('settingsConfirmPassword').value;
        
        if (!currentPassword) {
            showNotification('Please enter your current password.', 'error');
            return;
        }
        
        if (!DATA_MANAGER.verifyPassword(currentPassword, user.password)) {
            showNotification('Current password is incorrect.', 'error');
            return;
        }
        
        if (newEmail && newEmail !== user.email) {
            const existing = DATA_MANAGER.findUserByEmail(newEmail);
            if (existing && existing.id !== user.id) {
                showNotification('Email already in use by another account.', 'error');
                return;
            }
            
            const result = await sendVerificationCode(newEmail, 'email');
            if (!result.success) {
                showNotification('Error sending verification code.', 'error');
                return;
            }
            
            openVerificationModal(newEmail, 'email', async (token) => {
                const updateResult = DATA_MANAGER.updateProfile(user.id, { 
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
                    setTimeout(() => openProfileModal(), 500);
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
            
            const validation = DATA_MANAGER.validatePasswordStrength(newPassword);
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }
            
            const result = await sendVerificationCode(user.email, 'password');
            if (!result.success) {
                showNotification('Error sending verification code.', 'error');
                return;
            }
            
            openVerificationModal(user.email, 'password', async (token) => {
                const updateResult = DATA_MANAGER.changePassword(user.id, currentPassword, newPassword);
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
    
    modal.querySelector('#deleteAccountBtn').addEventListener('click', async () => {
        const confirmed = await showConfirmationModal(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            'Delete Account',
            'Cancel'
        );
        if (!confirmed) return;
        
        const password = await showPasswordConfirmModal(
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
        
        const result = await sendVerificationCode(user.email, 'delete');
        if (!result.success) {
            showNotification('Error sending verification code.', 'error');
            return;
        }
        
        openVerificationModal(user.email, 'delete', async (token) => {
            const deleteResult = DATA_MANAGER.deleteAccount(user.id, password);
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
}

// ============================================================
// OPEN AUTH MODAL
// ============================================================
function openModal(mode) {
    currentMode = mode;
    authModal.style.display = 'flex';
    authFields.innerHTML = '';
    forgotPasswordLink.style.display = 'none';
    
    if (mode === 'login') {
        authModalTitle.textContent = 'Sign In';
        authSubmitBtn.textContent = 'Sign In';
        authSwitchText.innerHTML = `Don't have an account? <a href="#" id="authSwitchLink">Create Account</a>`;
        
        const email = document.createElement('input');
        email.type = 'email';
        email.id = 'authEmail';
        email.placeholder = 'Email address';
        email.required = true;
        authFields.appendChild(email);
        
        const password = createPasswordField('authPassword', 'Password');
        authFields.appendChild(password);
        bindPasswordToggles(authModal);
        
        forgotPasswordLink.style.display = 'block';
        forgotPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('reset');
        });
        
    } else if (mode === 'reset') {
        authModalTitle.textContent = 'Reset Password';
        authSubmitBtn.textContent = 'Send Reset Code';
        authSwitchText.innerHTML = `Remember password? <a href="#" id="authSwitchLink">Sign In</a>`;
        
        const email = document.createElement('input');
        email.type = 'email';
        email.id = 'authEmail';
        email.placeholder = 'Email address';
        email.required = true;
        authFields.appendChild(email);
        forgotPasswordLink.style.display = 'none';
        
    } else if (mode === 'signup') {
        authModalTitle.textContent = 'Create Account';
        authSubmitBtn.textContent = 'Create Account';
        authSwitchText.innerHTML = `Already have an account? <a href="#" id="authSwitchLink">Sign In</a>`;
        
        const email = document.createElement('input');
        email.type = 'email';
        email.id = 'authEmail';
        email.placeholder = 'Email address';
        email.required = true;
        authFields.appendChild(email);
        
        const password = createPasswordField('authPassword', 'Password (min 8 chars)');
        authFields.appendChild(password);
        const confirm = createPasswordField('authConfirmPassword', 'Confirm password');
        authFields.appendChild(confirm);
        bindPasswordToggles(authModal);
        
        const hint = document.createElement('small');
        hint.textContent = 'Password must contain: 8+ characters, uppercase, lowercase, number, special character';
        authFields.appendChild(hint);
        forgotPasswordLink.style.display = 'none';
    }
    
    const switchLink = document.getElementById('authSwitchLink');
    if (switchLink) {
        switchLink.addEventListener('click', (e) => {
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
closeAuthModal.addEventListener('click', () => {
    authModal.style.display = 'none';
    clearAllPasswordFields();
});

// ============================================================
// AUTH FORM SUBMIT
// ============================================================
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword')?.value || '';
    
    try {
        if (currentMode === 'login') {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Signing in...';
            
            const result = DATA_MANAGER.login(email, password);
            
            if (!result.success) {
                if (result.error === 'Account not found. Please create an account.') {
                    showNotification('Account not found. Redirecting to Create Account...', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                    setTimeout(() => openModal('signup'), 1500);
                    return;
                } else {
                    showNotification(result.error, 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                    return;
                }
            }
            
            const codeResult = await sendVerificationCode(email, 'signin');
            if (!codeResult.success) {
                showNotification('Error sending verification code.', 'error');
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Sign In';
                return;
            }
            
            authModal.style.display = 'none';
            
            openVerificationModal(email, 'signin', async (token) => {
                showNotification('Sign in successful!', 'success');
                await checkAuthStatus();
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Sign In';
                clearAllPasswordFields();
            });
            
        } else if (currentMode === 'reset') {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Sending reset code...';
            
            const userExists = DATA_MANAGER.findUserByEmail(email);
            if (!userExists) {
                showNotification('No account found with this email.', 'error');
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Send Reset Code';
                return;
            }
            
            const codeResult = await sendVerificationCode(email, 'reset');
            if (!codeResult.success) {
                showNotification('Error sending reset code.', 'error');
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Send Reset Code';
                return;
            }
            
            pendingResetEmail = email;
            pendingResetUser = userExists;
            
            authModal.style.display = 'none';
            
            openVerificationModal(email, 'reset', async (token) => {
                const newPassword = await showPasswordResetModal();
                
                if (newPassword === null) {
                    showNotification('Password reset cancelled.', 'info');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    return;
                }
                
                // Check if new password is same as old password
                if (DATA_MANAGER.verifyPassword(newPassword, pendingResetUser.password)) {
                    showNotification('New password must be different from your current password.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    pendingResetEmail = '';
                    pendingResetUser = null;
                    return;
                }
                
                const result = DATA_MANAGER.changePassword(pendingResetUser.id, pendingResetUser.password, newPassword);
                if (result.success) {
                    showNotification('Password reset successfully! Please sign in.', 'success');
                    clearAllPasswordFields();
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    pendingResetEmail = '';
                    pendingResetUser = null;
                    setTimeout(() => openModal('login'), 2000);
                } else {
                    showNotification('Error resetting password. Please try again.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                }
            });
            
        } else if (currentMode === 'signup') {
            const confirmPassword = document.getElementById('authConfirmPassword')?.value || '';
            const username = email.split('@')[0];
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match!', 'error');
                return;
            }
            
            const validation = DATA_MANAGER.validatePasswordStrength(password);
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
            
            const result = DATA_MANAGER.createUser(email, password, username);
            
            if (!result.success) {
                if (result.error === 'Email already registered. Please sign in.') {
                    showNotification('Email already registered. Redirecting to Sign In...', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    setTimeout(() => openModal('login'), 1500);
                    return;
                } else {
                    showNotification(result.error, 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    return;
                }
            }
            
            const codeResult = await sendVerificationCode(email, 'signup');
            if (!codeResult.success) {
                showNotification('Error sending verification code.', 'error');
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Create Account';
                return;
            }
            
            authModal.style.display = 'none';
            
            openVerificationModal(email, 'signup', async (token) => {
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

// ============================================================
// HISTORY MODAL
// ============================================================
if (historyNavBtn) {
    historyNavBtn.addEventListener('click', () => {
        openHistoryModal();
    });
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
    
    historyModal.querySelector('.close-history').addEventListener('click', () => {
        historyModal.style.display = 'none';
    });
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.style.display = 'none';
        }
    });
    
    loadHistoryModal();
    
    historyModal.querySelector('#deleteAllHistory').addEventListener('click', async () => {
        if (!isLoggedIn || !currentUser) {
            showNotification('Please sign in to manage history.', 'warning');
            return;
        }
        const confirmed = await showConfirmationModal(
            'Delete All History',
            'Are you sure you want to delete ALL your translation history? This action cannot be undone.',
            'Delete All',
            'Cancel'
        );
        if (!confirmed) return;
        
        const result = DATA_MANAGER.clearHistory(currentUser.email);
        if (result.success) {
            await loadHistoryModal();
            showNotification('All history deleted.', 'info');
        } else {
            showNotification('Error deleting history.', 'error');
        }
    });
}

async function loadHistoryModal() {
    const historyList = document.getElementById('historyListModal');
    if (!historyList) return;
    
    if (!isLoggedIn || !currentUser) {
        historyList.innerHTML = '<p class="empty-history">Sign in to see your history.</p>';
        return;
    }
    
    try {
        const history = DATA_MANAGER.getHistory(currentUser.email);
        
        if (!history || history.length === 0) {
            historyList.innerHTML = `
                <p class="empty-history">No translations yet. Start translating!</p>
            `;
            return;
        }
        
        let html = '';
        history.forEach(item => {
            const time = new Date(item.createdAt).toLocaleString();
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
        
        document.querySelectorAll('.h-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const confirmed = await showConfirmationModal(
                    'Delete History Item',
                    'Are you sure you want to delete this translation history item?',
                    'Delete',
                    'Cancel'
                );
                if (!confirmed) return;
                
                const result = DATA_MANAGER.deleteHistoryItem(currentUser.email, id);
                if (result.success) {
                    await loadHistoryModal();
                    showNotification('History item deleted.', 'info');
                } else {
                    showNotification('Error deleting history item.', 'error');
                }
            });
        });
    } catch (error) {
        historyList.innerHTML = '<p class="empty-history">Could not load history.</p>';
    }
}

function getLanguageName(code) {
    const languages = {
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
    
    const entry = {
        original: original,
        translated: translated,
        sourceLang: sourceLang,
        targetLang: targetLang
    };
    
    DATA_MANAGER.saveHistory(currentUser.email, entry);
}

// ============================================================
// TRANSLATION
// ============================================================
const translateBtn = document.getElementById('translateBtn');
const inputText = document.getElementById('inputText');
const outputDisplay = document.getElementById('outputText');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');

const LANGUAGES = [
    { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' }, { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' }, { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' }, { code: 'hi', name: 'Hindi' },
    { code: 'rw', name: 'Kinyarwanda' }, { code: 'rn', name: 'Kirundi' },
    { code: 'sw', name: 'Swahili' }, { code: 'zu', name: 'Zulu' },
    { code: 'yo', name: 'Yoruba' }, { code: 'ig', name: 'Igbo' },
    { code: 'ha', name: 'Hausa' }, { code: 'ak', name: 'Akan' },
    { code: 'am', name: 'Amharic' }, { code: 'so', name: 'Somali' },
    { code: 'mg', name: 'Malagasy' }, { code: 'xh', name: 'Xhosa' },
    { code: 'af', name: 'Afrikaans' }, { code: 'wo', name: 'Wolof' },
    { code: 'ki', name: 'Kikuyu' }, { code: 'lg', name: 'Luganda' },
    { code: 'ny', name: 'Chichewa' }
];

function populateLanguages() {
    [sourceLang, targetLang].forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        LANGUAGES.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            select.appendChild(option);
        });
    });
    if (sourceLang) sourceLang.value = 'en';
    if (targetLang) targetLang.value = 'rw';
}
populateLanguages();

async function translateWithGoogle(text, sourceLang, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[0]) return data[0].map(item => item[0]).join('');
    throw new Error('Translation failed');
}

async function performTranslation() {
    const text = inputText.value.trim();
    if (!text) {
        outputDisplay.innerHTML = '<span class="placeholder">Please enter text to translate.</span>';
        return;
    }
    translateBtn.disabled = true;
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    outputDisplay.innerHTML = '<span class="placeholder">Translating...</span>';
    try {
        const translated = await translateWithGoogle(text, sourceLang.value, targetLang.value);
        outputDisplay.textContent = translated;
        if (isLoggedIn && currentUser) {
            await saveToHistory(text, translated, sourceLang.value, targetLang.value);
        }
    } catch (error) {
        outputDisplay.innerHTML = `<span class="placeholder">Error: ${error.message}</span>`;
    } finally {
        translateBtn.disabled = false;
        translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
    }
}

translateBtn.addEventListener('click', performTranslation);

inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') performTranslation();
});

document.getElementById('swapLang').addEventListener('click', () => {
    const temp = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = temp;
    outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
});

document.getElementById('copyOutput').addEventListener('click', async () => {
    const text = outputDisplay.textContent;
    if (text && !text.includes('placeholder')) {
        await navigator.clipboard.writeText(text);
        showNotification('Copied!', 'success');
    }
});

document.getElementById('speakOutput').addEventListener('click', () => {
    const text = outputDisplay.textContent;
    if (text && !text.includes('placeholder')) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang.value;
        window.speechSynthesis.speak(utterance);
    }
});

document.getElementById('clearInput').addEventListener('click', () => {
    inputText.value = '';
    outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
});

// ============================================================
// MIC
// ============================================================
const micBtn = document.getElementById('micBtn');
const recordingStatus = document.getElementById('recordingStatus');
let recognition = null;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en';
    
    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        recordingStatus.textContent = 'Listening... Speak now!';
        micBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    };
    
    recognition.onresult = (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalText += event.results[i][0].transcript;
            }
        }
        if (finalText) {
            inputText.value = finalText;
            setTimeout(performTranslation, 500);
        }
    };
    
    recognition.onerror = () => {
        recordingStatus.textContent = 'Error. Click mic again.';
        micBtn.classList.remove('recording');
        micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
        isRecording = false;
    };
    
    recognition.onend = () => {
        micBtn.classList.remove('recording');
        micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
        recordingStatus.textContent = 'Click mic to speak';
        isRecording = false;
    };
    
    micBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.lang = sourceLang.value;
            recognition.start();
        }
    });
} else {
    micBtn.disabled = true;
    recordingStatus.textContent = 'Not supported';
}

// ============================================================
// THEME TOGGLE
// ============================================================
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// ============================================================
// ABOUT MODAL
// ============================================================
aboutNavBtn.addEventListener('click', () => aboutModal.style.display = 'flex');
closeAboutModal.addEventListener('click', () => aboutModal.style.display = 'none');
aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.style.display = 'none';
});

// ============================================================
// INIT
// ============================================================
checkAuthStatus();
