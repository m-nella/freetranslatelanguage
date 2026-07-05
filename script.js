// ============================================================
// CALL VERCEL FUNCTION TO SEND EMAIL (SECURE)
// ============================================================

// Your Vercel function URL (replace with your actual Vercel URL)
const VERCEL_FUNCTION_URL = 'https://freetranslatelanguage.vercel.app/';

async function sendVerificationEmail(email, code, action = 'verification') {
    try {
        const response = await fetch(VERCEL_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                code: code,
                action: action
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('✅ Email sent successfully to:', email);
            return { success: true };
        } else {
            console.error('❌ Error sending email:', result);
            return { success: false, error: result.error || 'Failed to send email' };
        }
    } catch (error) {
        console.error('❌ Fetch error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

if (typeof window.FIREBASE_CONFIG === 'undefined') {
    console.error('❌ config.js not loaded!');
    alert('⚠️ Configuration error. Please contact support.');
    window.FIREBASE_CONFIG = {
        apiKey: "AIzaSyCtTMIuO9HeHC8GFJT0igAnUsMDD6ZSEV8",
        authDomain: "freetranslatelanguage.firebaseapp.com",
        projectId: "freetranslatelanguage",
        storageBucket: "freetranslatelanguage.firebasestorage.app",
        messagingSenderId: "240202183999",
        appId: "1:240202183999:web:dcc227607059c7773dcf8a"
    };
}

const config = window.FIREBASE_CONFIG;
firebase.initializeApp(config);
const auth = firebase.auth();
const db = firebase.firestore();

console.log('✅ Firebase initialized!');

// ============================================================
// STATE
// ============================================================
let currentMode = 'login';
let currentUser = null;
let isLoggedIn = false;
let pendingEmail = '';
let pendingPassword = '';
let pendingAction = '';
let generatedCode = '';
let codeExpiry = null;

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
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationCode(email, action = 'verification') {
    const code = generateVerificationCode();
    generatedCode = code;
    codeExpiry = Date.now() + 15 * 60 * 1000;
    
    try {
        await db.collection('verificationCodes').doc(email).set({
            code: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });
        console.log(`📧 Verification code for ${email}: ${code}`);
    } catch (error) {
        console.error('Firestore save error:', error);
    }
    
    const emailResult = await sendVerificationEmail(email, code, action);
    
    if (emailResult.success) {
        showNotification('📧 Verification code sent to your email. Also check SPAM/JUNK folder.', 'success');
    } else {
        console.error('❌ Error sending code:', emailResult.error);
        showNotification('⚠️ Failed to send code. Please try again.', 'error');
    }
    
    return { success: true, code: code };
}

async function verifyCode(email, code) {
    try {
        const doc = await db.collection('verificationCodes').doc(email).get();
        if (doc.exists) {
            const data = doc.data();
            const now = Date.now();
            const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : new Date(data.expiresAt).getTime();
            if (now > expiresAt) {
                await db.collection('verificationCodes').doc(email).delete();
                return { success: false, error: 'Code has expired. Please request a new one.' };
            }
            if (data.code !== code) {
                return { success: false, error: 'Invalid code. Please try again.' };
            }
            await db.collection('verificationCodes').doc(email).delete();
            return { success: true };
        }
        if (generatedCode === code && codeExpiry && Date.now() < codeExpiry) {
            return { success: true };
        }
        return { success: false, error: 'No verification code found. Please request a new one.' };
    } catch (error) {
        console.error('Verify code error:', error);
        if (generatedCode === code && codeExpiry && Date.now() < codeExpiry) {
            return { success: true };
        }
        return { success: false, error: error.message };
    }
}

// ============================================================
// PASSWORD STRENGTH VALIDATION
// ============================================================
function validatePassword(password) {
    const requirements = [];
    if (password.length < 8) requirements.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) requirements.push('an uppercase letter');
    if (!/[a-z]/.test(password)) requirements.push('a lowercase letter');
    if (!/[0-9]/.test(password)) requirements.push('a number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) requirements.push('a special character');
    if (requirements.length === 0) return { valid: true };
    return { valid: false, message: `Password must contain: ${requirements.join(', ')}` };
}

// ============================================================
// CUSTOM CONFIRMATION MODAL
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
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'verificationModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content verification-content">
            <span class="close-modal close-verification">&times;</span>
            <h2>${action === 'signup' ? 'Verify Your Email' : action === 'reset' ? 'Reset Password' : action === 'delete' ? 'Delete Account' : action === 'email' ? 'Change Email' : action === 'password' ? 'Change Password' : 'Verify Email'}</h2>
            <p class="verification-desc">Enter the 6-digit code sent to your email. Also check in SPAM/JUNK folder.</p>
            <form id="verificationForm">
                <input type="text" id="verificationCode" placeholder="Enter the 6-digit code sent to your email. Also check in SPAM/JUNK folder." maxlength="6" autocomplete="off" required>
                <button type="submit" class="auth-submit-btn">Verify</button>
            </form>
            <p class="auth-switch">Didn't receive code? <a href="#" id="resendCodeBtn">Resend Code</a></p>
        </div>
    `;
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close-verification');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    const form = modal.querySelector('#verificationForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('verificationCode').value.trim();
        if (!code || code.length !== 6) {
            showNotification('Please enter a valid 6-digit code.', 'error');
            return;
        }
        const result = await verifyCode(email, code);
        if (!result.success) {
            showNotification(result.error, 'error');
            return;
        }
        modal.remove();
        showNotification('✅ Verification successful!', 'success');
        if (callback) callback();
    });
    
    const resendBtn = modal.querySelector('#resendCodeBtn');
    resendBtn.addEventListener('click', async () => {
        clearAllNotifications();
        const result = await sendVerificationCode(email, pendingAction);
        if (result.success) {
            showNotification('New code sent! 📧', 'success');
        } else {
            showNotification('Error sending code. Please try again.', 'error');
        }
    });
}

// ============================================================
// AUTH STATE
// ============================================================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        isLoggedIn = true;
        if (!user.emailVerified) {
            showNotification('📧 Please verify your email using the code sent to your inbox.', 'warning');
            return;
        }
        const username = user.email.split('@')[0];
        authBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
        authBtn.classList.add('logged-in');
        if (historyNavBtn) historyNavBtn.style.display = 'flex';
        showNotification(`Welcome ${username}! 🎉`, 'success');
    } else {
        currentUser = null;
        isLoggedIn = false;
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        authBtn.classList.remove('logged-in');
        if (historyNavBtn) historyNavBtn.style.display = 'none';
    }
});

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
    
    profileMenu = document.createElement('div');
    profileMenu.className = 'user-menu';
    profileMenu.innerHTML = `
        <div class="user-menu-header">
            <i class="fas fa-user-circle"></i>
            <div>
                <strong>${currentUser.email.split('@')[0]}</strong>
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
    auth.signOut().then(() => {
        showNotification('Logged out successfully! 👋', 'info');
        clearAllPasswordFields();
    }).catch(err => {
        showNotification('Error logging out.', 'error');
    });
}

// ============================================================
// PROFILE MODAL
// ============================================================
function openProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content settings-content">
            <span class="close-modal close-profile">&times;</span>
            <div class="profile-header">
                <i class="fas fa-user-circle profile-icon"></i>
                <h2>${currentUser.email.split('@')[0]}</h2>
                <p>${currentUser.email}</p>
                <span class="profile-badge">Account Verified</span>
            </div>
            <div class="profile-info">
                <div class="info-item"><strong>Username:</strong> ${currentUser.email.split('@')[0]}</div>
                <div class="info-item"><strong>Email:</strong> ${currentUser.email}</div>
                <div class="info-item"><strong>Account Created:</strong> ${new Date(currentUser.metadata.creationTime).toLocaleDateString()}</div>
            </div>
            <button class="auth-submit-btn" id="goToSettingsBtn">Account Settings</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.close-profile').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    modal.querySelector('#goToSettingsBtn').addEventListener('click', () => {
        modal.remove();
        openAccountSettings();
    });
}

// ============================================================
// ACCOUNT SETTINGS
// ============================================================
function openAccountSettings() {
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
                    <input type="text" value="${currentUser.email.split('@')[0]}" disabled>
                </div>
                <div class="settings-field">
                    <label>Email</label>
                    <input type="email" id="settingsEmail" value="${currentUser.email}">
                </div>
                <div class="settings-field">
                    <label>Current Password</label>
                    ${createPasswordField('settingsCurrentPassword', 'Enter current password').outerHTML}
                </div>
                <div class="settings-field">
                    <label>New Password</label>
                    ${createPasswordField('settingsNewPassword', 'Enter new password (8+ chars, different from current)').outerHTML}
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
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    modal.querySelector('#saveSettingsBtn').addEventListener('click', async () => {
        const newEmail = document.getElementById('settingsEmail').value;
        const currentPassword = document.getElementById('settingsCurrentPassword').value;
        const newPassword = document.getElementById('settingsNewPassword').value;
        const confirmPassword = document.getElementById('settingsConfirmPassword').value;
        
        if (!currentPassword) {
            showNotification('❌ Please enter your current password.', 'error');
            return;
        }
        
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                showNotification('❌ New passwords do not match!', 'error');
                return;
            }
            if (newPassword === currentPassword) {
                showNotification('❌ New password must be different from your current password.', 'error');
                return;
            }
            const validation = validatePassword(newPassword);
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }
        }
        
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
        try {
            await currentUser.reauthenticateWithCredential(credential);
            
            if (newEmail !== currentUser.email) {
                const result = await sendVerificationCode(newEmail, 'email');
                if (!result.success) {
                    showNotification('❌ Error sending verification code. Please try again.', 'error');
                    return;
                }
                openVerificationModal(newEmail, 'email', async () => {
                    await currentUser.updateEmail(newEmail);
                    showNotification('✅ Email updated successfully!', 'success');
                    modal.remove();
                    clearAllPasswordFields();
                    setTimeout(() => openProfileModal(), 500);
                });
                return;
            }
            
            if (newPassword) {
                const result = await sendVerificationCode(currentUser.email, 'password');
                if (!result.success) {
                    showNotification('❌ Error sending verification code. Please try again.', 'error');
                    return;
                }
                openVerificationModal(currentUser.email, 'password', async () => {
                    await currentUser.updatePassword(newPassword);
                    showNotification('✅ Password updated successfully!', 'success');
                    modal.remove();
                    clearAllPasswordFields();
                });
                return;
            }
            
            showNotification('✅ No changes made.', 'info');
            modal.remove();
            clearAllPasswordFields();
        } catch (error) {
            console.error('Settings error:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showNotification('❌ Incorrect current password. Please try again.', 'error');
            } else {
                showNotification(`❌ ${error.message}`, 'error');
            }
        }
    });
    
    modal.querySelector('#deleteAccountBtn').addEventListener('click', async () => {
        const confirmed = await showConfirmationModal(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently lost.',
            'Delete Account',
            'Cancel'
        );
        if (!confirmed) return;
        
        const result = await sendVerificationCode(currentUser.email, 'delete');
        if (!result.success) {
            showNotification('❌ Error sending verification code. Please try again.', 'error');
            return;
        }
        openVerificationModal(currentUser.email, 'delete', async () => {
            await currentUser.delete();
            showNotification('✅ Account deleted successfully.', 'info');
            modal.remove();
            clearAllPasswordFields();
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
            openModal(mode === 'login' || mode === 'reset' ? 'signup' : 'login');
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

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
        clearAllPasswordFields();
    }
});

// ============================================================
// AUTH FORM SUBMIT
// ============================================================
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword')?.value || '';
    
    try {
        if (currentMode === 'login') {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Signing in...';
            
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                if (!userCredential.user.emailVerified) {
                    const result = await sendVerificationCode(email, 'signin');
                    if (!result.success) {
                        showNotification('❌ Error sending verification code. Please try again.', 'error');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                        return;
                    }
                    authModal.style.display = 'none';
                    openVerificationModal(email, 'login', async () => {
                        await userCredential.user.sendEmailVerification();
                        showNotification('✅ Sign in successful!', 'success');
                        authSubmitBtn.disabled = false;
                        authSubmitBtn.textContent = 'Sign In';
                        clearAllPasswordFields();
                    });
                    return;
                }
                authModal.style.display = 'none';
                showNotification('Welcome back! 🎉', 'success');
                clearAllPasswordFields();
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Sign In';
            } catch (error) {
                console.error('Sign in error:', error);
                if (error.code === 'auth/user-not-found') {
                    showNotification('❌ Account not found. Redirecting to Create Account...', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                    setTimeout(() => openModal('signup'), 1500);
                } else if (error.code === 'auth/wrong-password') {
                    showNotification('❌ Incorrect password. Please try again.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                } else if (error.code === 'auth/invalid-email') {
                    showNotification('❌ Invalid email address. Please check and try again.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                } else if (error.code === 'auth/too-many-requests') {
                    showNotification('❌ Too many failed attempts. Please try again later.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                } else {
                    showNotification(`❌ ${error.message}`, 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                }
            }
            
        } else if (currentMode === 'reset') {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Sending code...';
            
            try {
                const methods = await auth.fetchSignInMethodsForEmail(email);
                if (methods.length === 0) {
                    showNotification('❌ No account found with this email. Please create an account.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    return;
                }
                
                const result = await sendVerificationCode(email, 'reset');
                if (!result.success) {
                    showNotification('❌ Error sending verification code. Please try again.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Send Reset Code';
                    return;
                }
                
                authModal.style.display = 'none';
                openVerificationModal(email, 'reset', async () => {
                    await auth.sendPasswordResetEmail(email);
                    showNotification('✅ Password reset link sent to your email!', 'success');
                    clearAllPasswordFields();
                });
                
            } catch (error) {
                console.error('Reset error:', error);
                if (error.code === 'auth/user-not-found') {
                    showNotification('❌ No account found with this email.', 'error');
                } else {
                    showNotification(`❌ ${error.message}`, 'error');
                }
            }
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Send Reset Code';
            
        } else if (currentMode === 'signup') {
            const confirmPassword = document.getElementById('authConfirmPassword')?.value || '';
            
            if (password !== confirmPassword) {
                showNotification('❌ Passwords do not match!', 'error');
                return;
            }
            
            const validation = validatePassword(password);
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }
            
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Creating account...';
            
            try {
                const methods = await auth.fetchSignInMethodsForEmail(email);
                if (methods.length > 0) {
                    showNotification('❌ Email already registered. Redirecting to Sign In...', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    setTimeout(() => openModal('login'), 1500);
                    return;
                }
                
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const result = await sendVerificationCode(email, 'signup');
                if (!result.success) {
                    showNotification('❌ Error sending verification code. Please try again.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    return;
                }
                authModal.style.display = 'none';
                openVerificationModal(email, 'signup', async () => {
                    await userCredential.user.sendEmailVerification();
                    showNotification('✅ Account created! Please sign in.', 'success');
                    await auth.signOut();
                    clearAllPasswordFields();
                    setTimeout(() => openModal('login'), 2000);
                });
            } catch (error) {
                console.error('Sign up error:', error);
                if (error.code === 'auth/email-already-in-use') {
                    showNotification('❌ Email already registered. Redirecting to Sign In...', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                    setTimeout(() => openModal('login'), 1500);
                } else if (error.code === 'auth/invalid-email') {
                    showNotification('❌ Invalid email address. Please check and try again.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                } else if (error.code === 'auth/weak-password') {
                    showNotification('❌ Password is too weak. Please use a stronger password.', 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                } else {
                    showNotification(`❌ ${error.message}`, 'error');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Create Account';
                }
            }
        }
    } catch (error) {
        console.error('Form error:', error);
        showNotification(`❌ ${error.message}`, 'error');
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = currentMode === 'login' ? 'Sign In' : 'Create Account';
    }
});

// ============================================================
// HISTORY POPUP MODAL
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
                    <span class="auto-delete-notice">⚠️ History auto-deletes after 30 days</span>
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
        
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            await loadHistoryModal();
            showNotification('All history deleted. 🗑️', 'info');
        } catch (error) {
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
        const snapshot = await db
            .collection('users').doc(currentUser.uid).collection('history')
            .orderBy('timestamp', 'desc').limit(50).get();
        
        if (snapshot.empty) {
            historyList.innerHTML = `
                <p class="empty-history">No translations yet. Start translating!</p>
                <p class="auto-delete-note">⚠️ History auto-deletes after 30 days</p>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const time = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'Just now';
            const docId = doc.id;
            html += `
                <div class="history-item" data-id="${docId}">
                    <button class="h-delete" data-id="${docId}" title="Delete this translation">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="h-source">
                        ${getLanguageName(data.sourceLang)} → ${getLanguageName(data.targetLang)}
                        <span class="h-time">${time}</span>
                    </div>
                    <div class="h-original">"${data.original.substring(0, 60)}${data.original.length > 60 ? '...' : ''}"</div>
                    <div class="h-translation">"${data.translated.substring(0, 60)}${data.translated.length > 60 ? '...' : ''}"</div>
                </div>
            `;
        });
        html += `<p class="auto-delete-note">⚠️ History auto-deletes after 30 days</p>`;
        historyList.innerHTML = html;
        
        document.querySelectorAll('.h-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const docId = btn.dataset.id;
                const confirmed = await showConfirmationModal(
                    'Delete History Item',
                    'Are you sure you want to delete this translation history item?',
                    'Delete',
                    'Cancel'
                );
                if (!confirmed) return;
                
                try {
                    await db.collection('users').doc(currentUser.uid).collection('history').doc(docId).delete();
                    await loadHistoryModal();
                    showNotification('History item deleted. 🗑️', 'info');
                } catch (error) {
                    showNotification('Error deleting history item.', 'error');
                }
            });
        });
    } catch (error) {
        console.error('Load history error:', error);
        historyList.innerHTML = '<p class="empty-history">⚠️ Could not load history.</p>';
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
    try {
        await db.collection('users').doc(currentUser.uid).collection('history').add({
            original, translated, sourceLang, targetLang,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Save history error:', error);
    }
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
        outputDisplay.innerHTML = '<span class="placeholder">⚠️ Please enter text to translate.</span>';
        return;
    }
    translateBtn.disabled = true;
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    outputDisplay.innerHTML = '<span class="placeholder">⏳ Translating...</span>';
    try {
        const translated = await translateWithGoogle(text, sourceLang.value, targetLang.value);
        outputDisplay.textContent = translated;
        if (isLoggedIn && currentUser) {
            await saveToHistory(text, translated, sourceLang.value, targetLang.value);
        }
    } catch (error) {
        outputDisplay.innerHTML = `<span class="placeholder">❌ ${error.message}</span>`;
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
        showNotification('Copied! ✅', 'success');
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
        recordingStatus.textContent = '🎤 Listening... Speak now!';
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
        recordingStatus.textContent = '❌ Error. Click mic again.';
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
    recordingStatus.textContent = '⚠️ Not supported';
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
console.log('✅ FreeTranslate initialized!');
console.log('📁 Project:', config.projectId);
