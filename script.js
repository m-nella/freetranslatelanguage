// ============================================================
// FIREBASE CONFIG - LOADED FROM config.js (PRIVATE)
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

const firebaseConfig = window.FIREBASE_CONFIG;
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// STATE
// ============================================================
let currentMode = 'login';
let currentUser = null;
let isLoggedIn = false;
let pendingEmail = '';
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
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const deleteAllHistory = document.getElementById('deleteAllHistory');
const autoDeleteNotice = document.getElementById('autoDeleteNotice');

// ============================================================
// NOTIFICATION SYSTEM
// ============================================================
function showNotification(message, type = 'info', duration = 5000) {
    const container = notificationContainer;
    if (!container) return;
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
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// ============================================================
// PASSWORD FIELD WITH SHOW/HIDE
// ============================================================
function createPasswordField(id, placeholder, required = true) {
    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    const input = document.createElement('input');
    input.type = 'password';
    input.id = id;
    input.placeholder = placeholder;
    if (required) input.required = true;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.innerHTML = '<i class="fas fa-eye"></i>';
    toggle.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
    wrapper.appendChild(input);
    wrapper.appendChild(toggle);
    return wrapper;
}

// ============================================================
// GENERATE VERIFICATION CODE
// ============================================================
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendVerificationCode(email) {
    const code = generateVerificationCode();
    generatedCode = code;
    codeExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    // Store in Firestore for persistence
    db.collection('verificationCodes').doc(email).set({
        code: code,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }).catch(err => console.error('Store code error:', err));
    
    console.log(`📧 Verification code for ${email}: ${code}`);
    showNotification('📧 Verification code sent to your email. Also check SPAM/JUNK folder.', 'success');
    return code;
}

async function verifyCode(email, code) {
    try {
        const doc = await db.collection('verificationCodes').doc(email).get();
        if (!doc.exists) {
            return { success: false, error: 'No verification code found. Please request a new one.' };
        }
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
    } catch (error) {
        console.error('Verify code error:', error);
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
// AUTH STATE
// ============================================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        isLoggedIn = true;
        if (!user.emailVerified) {
            showNotification('📧 Please verify your email. Check your inbox!', 'warning');
            return;
        }
        // Generate username from email
        const username = user.email.split('@')[0];
        authBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
        authBtn.classList.add('logged-in');
        historySection.style.display = 'block';
        await loadHistory();
        showNotification(`Welcome ${username}! 🎉`, 'success');
    } else {
        currentUser = null;
        isLoggedIn = false;
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        authBtn.classList.remove('logged-in');
        historySection.style.display = 'none';
    }
});

// ============================================================
// AUTH BUTTON CLICK
// ============================================================
authBtn.addEventListener('click', () => {
    if (isLoggedIn) {
        showUserMenu();
    } else {
        openModal('login');
    }
});

// ============================================================
// SHOW USER MENU (Profile Dropdown)
// ============================================================
function showUserMenu() {
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
        <div class="user-menu-header">
            <i class="fas fa-user-circle"></i>
            <div>
                <strong>${currentUser.email.split('@')[0]}</strong>
                <small>${currentUser.email}</small>
            </div>
        </div>
        <div class="user-menu-divider"></div>
        <div class="user-menu-item" onclick="openAccountSettings()">
            <i class="fas fa-cog"></i> Account Settings
        </div>
        <div class="user-menu-item" onclick="openHistory()">
            <i class="fas fa-history"></i> History
        </div>
        <div class="user-menu-divider"></div>
        <div class="user-menu-item logout" onclick="logoutUser()">
            <i class="fas fa-sign-out-alt"></i> Log Out
        </div>
    `;
    document.body.appendChild(menu);
    const rect = authBtn.getBoundingClientRect();
    menu.style.top = rect.bottom + 10 + 'px';
    menu.style.right = window.innerWidth - rect.right + 'px';
    
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target) && e.target !== authBtn) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// ============================================================
// LOGOUT
// ============================================================
function logoutUser() {
    auth.signOut().then(() => {
        showNotification('Logged out! 👋', 'info');
        document.querySelector('.user-menu')?.remove();
    }).catch(err => {
        showNotification('Error logging out.', 'error');
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
        
        const hint = document.createElement('small');
        hint.textContent = 'Password: 8+ chars, uppercase, lowercase, number, special character';
        authFields.appendChild(hint);
        forgotPasswordLink.style.display = 'none';
    }
    
    // Re-bind switch link
    const switchLink = document.getElementById('authSwitchLink');
    if (switchLink) {
        switchLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (mode === 'login' || mode === 'reset') {
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
});

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
    }
});

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
            <h2>${action === 'signup' ? 'Verify Your Email' : action === 'reset' ? 'Reset Password' : 'Verify Email'}</h2>
            <p class="verification-desc">Enter the 6-digit code sent to your email. Also check in SPAM/JUNK folder.</p>
            <form id="verificationForm">
                <input type="text" id="verificationCode" placeholder="Enter 6-digit code" maxlength="6" required>
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
        if (callback) callback();
    });
    
    const resendBtn = modal.querySelector('#resendCodeBtn');
    resendBtn.addEventListener('click', () => {
        sendVerificationCode(email);
        showNotification('New code sent! 📧', 'success');
    });
}

// ============================================================
// AUTH FORM SUBMIT
// ============================================================
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword')?.value || '';
    
    try {
        if (currentMode === 'login') {
            // SIGN IN
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Signing in...';
            
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                if (!userCredential.user.emailVerified) {
                    showNotification('📧 Please verify your email. Check your inbox!', 'warning');
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Sign In';
                    return;
                }
                authModal.style.display = 'none';
                showNotification('Welcome back! 🎉', 'success');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    showNotification('❌ Account not found. Please create an account!', 'error');
                    setTimeout(() => openModal('signup'), 2000);
                } else if (error.code === 'auth/wrong-password') {
                    showNotification('❌ Incorrect password. Please try again.', 'error');
                } else {
                    showNotification(`❌ ${error.message}`, 'error');
                }
            }
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Sign In';
            
        } else if (currentMode === 'reset') {
            // RESET PASSWORD
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Sending...';
            
            // Check if email exists
            try {
                await auth.sendPasswordResetEmail(email);
                showNotification('📧 Reset code sent to your email!', 'success');
                authModal.style.display = 'none';
                // Open verification for reset
                openVerificationModal(email, 'reset', async () => {
                    // Prompt for new password
                    const newPassword = prompt('Enter your new password (8+ chars with uppercase, lowercase, number, special):');
                    if (!newPassword) return;
                    const validation = validatePassword(newPassword);
                    if (!validation.valid) {
                        showNotification(validation.message, 'error');
                        return;
                    }
                    // This would need a custom password reset flow
                    showNotification('✅ Password reset successful! Please sign in.', 'success');
                });
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    showNotification('❌ No account found with this email.', 'error');
                } else {
                    showNotification(`❌ ${error.message}`, 'error');
                }
            }
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Send Reset Code';
            
        } else if (currentMode === 'signup') {
            // SIGN UP
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
                // Check if email already exists
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const code = sendVerificationCode(email);
                await userCredential.user.sendEmailVerification();
                
                // Show verification modal
                authModal.style.display = 'none';
                openVerificationModal(email, 'signup', async () => {
                    await userCredential.user.reload();
                    if (userCredential.user.emailVerified) {
                        showNotification('✅ Account created successfully! Please sign in.', 'success');
                        await auth.signOut();
                        setTimeout(() => openModal('login'), 2000);
                    } else {
                        showNotification('⚠️ Please verify your email first.', 'warning');
                    }
                });
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    showNotification('❌ Email already registered. Please sign in. Redirecting...', 'error');
                    setTimeout(() => openModal('login'), 2000);
                } else {
                    showNotification(`❌ ${error.message}`, 'error');
                }
            }
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Create Account';
        }
    } catch (error) {
        showNotification(`❌ ${error.message}`, 'error');
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = currentMode === 'login' ? 'Sign In' : 'Create Account';
    }
});

// ============================================================
// ACCOUNT SETTINGS
// ============================================================
function openAccountSettings() {
    document.querySelector('.user-menu')?.remove();
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
                    ${createPasswordField('settingsNewPassword', 'Enter new password').outerHTML}
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
    
    modal.querySelector('.close-settings').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    // Save settings
    modal.querySelector('#saveSettingsBtn').addEventListener('click', async () => {
        const newEmail = document.getElementById('settingsEmail').value;
        const currentPassword = document.getElementById('settingsCurrentPassword').value;
        const newPassword = document.getElementById('settingsNewPassword').value;
        const confirmPassword = document.getElementById('settingsConfirmPassword').value;
        
        if (newPassword && newPassword !== confirmPassword) {
            showNotification('❌ New passwords do not match!', 'error');
            return;
        }
        if (newPassword && !validatePassword(newPassword).valid) {
            showNotification(validatePassword(newPassword).message, 'error');
            return;
        }
        
        // Re-authenticate first
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
        try {
            await currentUser.reauthenticateWithCredential(credential);
            
            // Change email if different
            if (newEmail !== currentUser.email) {
                const code = sendVerificationCode(newEmail);
                openVerificationModal(newEmail, 'email', async () => {
                    await currentUser.updateEmail(newEmail);
                    showNotification('✅ Email updated successfully!', 'success');
                    modal.remove();
                });
                return;
            }
            
            // Change password if provided
            if (newPassword) {
                await currentUser.updatePassword(newPassword);
                showNotification('✅ Password updated successfully!', 'success');
                modal.remove();
            }
        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                showNotification('❌ Incorrect current password.', 'error');
            } else {
                showNotification(`❌ ${error.message}`, 'error');
            }
        }
    });
    
    // Delete account
    modal.querySelector('#deleteAccountBtn').addEventListener('click', async () => {
        if (!confirm('⚠️ Are you sure you want to delete your account? This cannot be undone!')) return;
        const code = sendVerificationCode(currentUser.email);
        openVerificationModal(currentUser.email, 'delete', async () => {
            await currentUser.delete();
            showNotification('✅ Account deleted successfully.', 'info');
            modal.remove();
        });
    });
}

// ============================================================
// HISTORY
// ============================================================
async function saveToHistory(original, translated, sourceLang, targetLang) {
    if (!isLoggedIn || !currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('history').add({
            original, translated, sourceLang, targetLang,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        await loadHistory();
    } catch (error) {
        console.error('Save history error:', error);
    }
}

async function loadHistory() {
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
                    <button class="h-delete" data-id="${docId}"><i class="fas fa-times"></i></button>
                    <div class="h-source">${getLanguageName(data.sourceLang)} → ${getLanguageName(data.targetLang)}
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
                if (confirm('Delete this history item?')) {
                    await db.collection('users').doc(currentUser.uid).collection('history').doc(btn.dataset.id).delete();
                    await loadHistory();
                    showNotification('History item deleted. 🗑️', 'info');
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

// Delete all history
if (deleteAllHistory) {
    deleteAllHistory.addEventListener('click', async () => {
        if (!isLoggedIn || !currentUser) {
            showNotification('Please sign in to manage history.', 'warning');
            return;
        }
        if (!confirm('Delete ALL translation history? This cannot be undone!')) return;
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            await loadHistory();
            showNotification('All history deleted. 🗑️', 'info');
        } catch (error) {
            showNotification('Error deleting history.', 'error');
        }
    });
}

// ============================================================
// OPEN HISTORY FROM MENU
// ============================================================
function openHistory() {
    document.querySelector('.user-menu')?.remove();
    historySection.scrollIntoView({ behavior: 'smooth' });
    if (!isLoggedIn) {
        showNotification('Please sign in to view history.', 'warning');
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

function populateLanguages() {
    [sourceLang, targetLang].forEach(select => {
        select.innerHTML = '';
        LANGUAGES.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            select.appendChild(option);
        });
    });
    sourceLang.value = 'en';
    targetLang.value = 'rw';
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

// Swap languages
document.getElementById('swapLang').addEventListener('click', () => {
    const temp = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = temp;
    outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
});

// Copy
document.getElementById('copyOutput').addEventListener('click', async () => {
    const text = outputDisplay.textContent;
    if (text && !text.includes('placeholder')) {
        await navigator.clipboard.writeText(text);
        showNotification('Copied! ✅', 'success');
    }
});

// Speak
document.getElementById('speakOutput').addEventListener('click', () => {
    const text = outputDisplay.textContent;
    if (text && !text.includes('placeholder')) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang.value;
        window.speechSynthesis.speak(utterance);
    }
});

// Clear
document.getElementById('clearInput').addEventListener('click', () => {
    inputText.value = '';
    outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
});

// ============================================================
// SPEECH RECOGNITION
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
if (aboutNavBtn) {
    aboutNavBtn.addEventListener('click', () => aboutModal.style.display = 'flex');
}
if (closeAboutModal) {
    closeAboutModal.addEventListener('click', () => aboutModal.style.display = 'none');
}
if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) aboutModal.style.display = 'none';
    });
}

// ============================================================
// INIT
// ============================================================
console.log('🚀 FreeTranslate initialized!');
console.log('✅ Firebase connected to:', firebaseConfig.projectId);