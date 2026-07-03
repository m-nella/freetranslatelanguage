// ============================================================
// 1. FIREBASE CONFIGURATION - CORRECT CONFIG FROM YOUR PROJECT
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyAFYtMeK7X7081EYZL6zakqyBtGu_hpou",
    authDomain: "firetranslate-60750.firebaseapp.com",
    projectId: "firetranslate-60750",
    storageBucket: "firetranslate-60750.firebasestorage.app",
    messagingSenderId: "7772857730",
    appId: "1:7772857730:web:60287d7e4e16281da1db9b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// 2. ALL LANGUAGES WITH AFRICAN LANGUAGES INCLUDED
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
// 3. DOM ELEMENTS
// ============================================================
const elements = {
    sourceLang: document.getElementById('sourceLang'),
    targetLang: document.getElementById('targetLang'),
    inputText: document.getElementById('inputText'),
    outputText: document.getElementById('outputText'),
    translateBtn: document.getElementById('translateBtn'),
    swapLang: document.getElementById('swapLang'),
    micBtn: document.getElementById('micBtn'),
    speakOutput: document.getElementById('speakOutput'),
    copyOutput: document.getElementById('copyOutput'),
    clearInput: document.getElementById('clearInput'),
    themeToggle: document.getElementById('themeToggle'),
    recordingStatus: document.getElementById('recordingStatus'),
    authBtn: document.getElementById('authBtn'),
    authModal: document.getElementById('authModal'),
    closeAuthModal: document.getElementById('closeAuthModal'),
    authForm: document.getElementById('authForm'),
    authFields: document.getElementById('authFields'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    authModalTitle: document.getElementById('authModalTitle'),
    authSwitchText: document.getElementById('authSwitchText'),
    authSwitchLink: document.getElementById('authSwitchLink'),
    forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),
    forgotPasswordLink: document.getElementById('forgotPasswordLink'),
    historySection: document.getElementById('historySection'),
    historyList: document.getElementById('historyList'),
    outputDisplay: document.getElementById('outputText'),
    notificationContainer: document.getElementById('notificationContainer'),
    deleteAllHistory: document.getElementById('deleteAllHistory'),
    aboutNavBtn: document.getElementById('aboutNavBtn'),
    aboutModal: document.getElementById('aboutModal'),
    closeAboutModal: document.getElementById('closeAboutModal')
};

// ============================================================
// 4. STATE MANAGEMENT
// ============================================================
let state = {
    isRecording: false,
    isDarkMode: false,
    isLoggedIn: false,
    currentUser: null,
    currentAuthMode: 'login',
    recognition: null,
    currentTranslation: ''
};

// ============================================================
// 5. LANGUAGE POPULATOR
// ============================================================
function populateLanguages() {
    const selects = [elements.sourceLang, elements.targetLang];
    selects.forEach(select => {
        select.innerHTML = '';
        LANGUAGES.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            select.appendChild(option);
        });
    });
    elements.sourceLang.value = 'en';
    elements.targetLang.value = 'rw';
}
populateLanguages();

// ============================================================
// 6. THEME TOGGLE
// ============================================================
function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
    elements.themeToggle.innerHTML = state.isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    state.isDarkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}
elements.themeToggle.addEventListener('click', toggleTheme);

// ============================================================
// 7. NOTIFICATION SYSTEM
// ============================================================
function showNotification(message, type = 'info', duration = 5000) {
    const container = elements.notificationContainer;
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
// 8. PASSWORD TOGGLE FUNCTION
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
    toggle.setAttribute('aria-label', 'Toggle password visibility');
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
// 9. STRONG PASSWORD VALIDATION
// ============================================================
function validateStrongPassword(password) {
    const requirements = [];
    if (password.length < 8) requirements.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) requirements.push('an uppercase letter');
    if (!/[a-z]/.test(password)) requirements.push('a lowercase letter');
    if (!/[0-9]/.test(password)) requirements.push('a number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) requirements.push('a special character');
    if (requirements.length === 0) {
        return { valid: true, message: 'Strong password!' };
    }
    return { valid: false, message: `Password must contain: ${requirements.join(', ')}` };
}

// ============================================================
// 10. TRANSLATION ENGINE
// ============================================================
async function translateWithMyMemory(text, sourceLang, targetLang) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.responseStatus === 200) {
            return data.responseData.translatedText;
        }
        return null;
    } catch (error) {
        console.warn('MyMemory failed:', error);
        return null;
    }
}

async function translateWithGoogle(text, sourceLang, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data[0]) {
            return data[0].map(item => item[0]).join('');
        }
        throw new Error('Google translation failed');
    } catch (error) {
        console.error('Google translation failed:', error);
        throw new Error('Translation service unavailable. Please try again.');
    }
}

async function translateText(text, sourceLang, targetLang) {
    if (!text.trim()) throw new Error('Please enter some text to translate.');
    if (sourceLang === targetLang) return text;
    let result = await translateWithMyMemory(text, sourceLang, targetLang);
    if (!result) result = await translateWithGoogle(text, sourceLang, targetLang);
    return result;
}

// ============================================================
// 11. CORE TRANSLATION FUNCTION
// ============================================================
async function performTranslation() {
    const sourceLang = elements.sourceLang.value;
    const targetLang = elements.targetLang.value;
    const text = elements.inputText.value.trim();
    if (!text) {
        elements.outputDisplay.innerHTML = '<span class="placeholder">⚠️ Please enter text to translate.</span>';
        return;
    }
    elements.translateBtn.disabled = true;
    elements.translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    elements.outputDisplay.innerHTML = '<span class="placeholder">⏳ Translating...</span>';
    try {
        const translated = await translateText(text, sourceLang, targetLang);
        elements.outputDisplay.textContent = translated;
        state.currentTranslation = translated;
        if (state.isLoggedIn && state.currentUser) {
            await saveToHistory(text, translated, sourceLang, targetLang);
            await loadHistory();
        }
        elements.outputDisplay.style.color = 'var(--success)';
        setTimeout(() => { elements.outputDisplay.style.color = 'var(--text-primary)'; }, 300);
    } catch (error) {
        elements.outputDisplay.innerHTML = `<span class="placeholder">❌ ${error.message}</span>`;
        console.error('Translation error:', error);
    } finally {
        elements.translateBtn.disabled = false;
        elements.translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
    }
}

// ============================================================
// 12. SPEECH RECOGNITION
// ============================================================
function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        elements.recordingStatus.textContent = '⚠️ Speech recognition not supported';
        elements.micBtn.disabled = true;
        return null;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = elements.sourceLang.value;
    recognition.onstart = () => {
        state.isRecording = true;
        elements.micBtn.classList.add('recording');
        elements.recordingStatus.textContent = '🎤 Listening... Speak now!';
        elements.micBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    };
    recognition.onresult = (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalText += event.results[i][0].transcript;
            }
        }
        if (finalText) {
            elements.inputText.value = finalText;
            setTimeout(performTranslation, 500);
        }
    };
    recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        elements.recordingStatus.textContent = `❌ Error: ${event.error}`;
        stopRecording();
    };
    recognition.onend = () => { stopRecording(); };
    return recognition;
}

function stopRecording() {
    state.isRecording = false;
    elements.micBtn.classList.remove('recording');
    elements.recordingStatus.textContent = 'Click mic to speak';
    elements.micBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak';
    if (state.recognition) {
        try { state.recognition.stop(); } catch (e) {}
    }
}

elements.micBtn.addEventListener('click', () => {
    if (!state.recognition) {
        state.recognition = initializeSpeechRecognition();
        if (!state.recognition) return;
    }
    if (state.isRecording) {
        stopRecording();
    } else {
        state.recognition.lang = elements.sourceLang.value;
        state.recognition.start();
    }
});

elements.sourceLang.addEventListener('change', () => {
    if (state.recognition) state.recognition.lang = elements.sourceLang.value;
});

// ============================================================
// 13. TEXT-TO-SPEECH
// ============================================================
function speakText(text, language) {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(voice => voice.lang.startsWith(language.split('-')[0]));
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
    elements.speakOutput.style.color = 'var(--accent)';
    setTimeout(() => { elements.speakOutput.style.color = ''; }, 1000);
}

if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
}

// ============================================================
// 14. COPY TO CLIPBOARD
// ============================================================
async function copyText(text) {
    if (!text) { showNotification('No text to copy!', 'warning'); return; }
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard! ✅', 'success');
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Copied to clipboard! ✅', 'success');
    }
}

// ============================================================
// 15. EVENT LISTENERS
// ============================================================
elements.translateBtn.addEventListener('click', performTranslation);
elements.inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        performTranslation();
    }
});

elements.swapLang.addEventListener('click', () => {
    const sourceVal = elements.sourceLang.value;
    const targetVal = elements.targetLang.value;
    elements.sourceLang.value = targetVal;
    elements.targetLang.value = sourceVal;
    elements.outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
    state.currentTranslation = '';
});

elements.speakOutput.addEventListener('click', () => {
    const text = state.currentTranslation || elements.outputDisplay.textContent;
    const targetLang = elements.targetLang.value;
    speakText(text, targetLang);
});

elements.copyOutput.addEventListener('click', () => {
    const text = state.currentTranslation || elements.outputDisplay.textContent;
    copyText(text);
});

elements.clearInput.addEventListener('click', () => {
    elements.inputText.value = '';
    elements.outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
    state.currentTranslation = '';
});

// ============================================================
// 16. AUTH UI - Using Firebase Built-in Verification
// ============================================================

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Check if email is verified
        if (!user.emailVerified) {
            showNotification('Please verify your email. Check your inbox! 📧', 'warning');
            await auth.signOut();
            return;
        }
        state.isLoggedIn = true;
        state.currentUser = user;
        elements.authBtn.innerHTML = `<i class="fas fa-user-check"></i> ${user.email}`;
        elements.historySection.style.display = 'block';
        await loadHistory();
        showNotification(`Welcome back, ${user.email}! 🎉`, 'success');
    } else {
        state.isLoggedIn = false;
        state.currentUser = null;
        elements.authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
        elements.historySection.style.display = 'none';
    }
});

elements.authBtn.addEventListener('click', () => {
    if (state.isLoggedIn) {
        auth.signOut().then(() => {
            showNotification('Logged out successfully! 👋', 'info');
        }).catch((error) => {
            console.error('Logout error:', error);
            showNotification('Error logging out.', 'error');
        });
    } else {
        openAuthModal('login');
    }
});

function openAuthModal(mode) {
    state.currentAuthMode = mode;
    elements.authModal.style.display = 'flex';
    elements.forgotPasswordLink.style.display = 'none';
    
    if (mode === 'login') {
        elements.authModalTitle.textContent = 'Sign In';
        elements.authSubmitBtn.textContent = 'Sign In';
        elements.authSwitchText.innerHTML = `Don't have an account? <a href="#" id="authSwitchLink">Sign Up</a>`;
        elements.authFields.innerHTML = '';
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'authEmail';
        emailInput.placeholder = 'Email address';
        emailInput.required = true;
        elements.authFields.appendChild(emailInput);
        const passwordWrapper = createPasswordField('authPassword', 'Password');
        elements.authFields.appendChild(passwordWrapper);
        elements.forgotPasswordLink.style.display = 'block';
        const forgotBtn = document.getElementById('forgotPasswordBtn');
        if (forgotBtn) {
            forgotBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openAuthModal('reset');
            });
        }
    } else if (mode === 'reset') {
        elements.authModalTitle.textContent = 'Reset Password';
        elements.authSubmitBtn.textContent = 'Send Reset Link';
        elements.authSwitchText.innerHTML = `Remember your password? <a href="#" id="authSwitchLink">Sign In</a>`;
        elements.authFields.innerHTML = '';
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'authEmail';
        emailInput.placeholder = 'Email address';
        emailInput.required = true;
        elements.authFields.appendChild(emailInput);
        elements.forgotPasswordLink.style.display = 'none';
    } else {
        elements.authModalTitle.textContent = 'Sign Up';
        elements.authSubmitBtn.textContent = 'Create Account';
        elements.authSwitchText.innerHTML = `Already have an account? <a href="#" id="authSwitchLink">Sign In</a>`;
        elements.authFields.innerHTML = '';
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'authEmail';
        emailInput.placeholder = 'Email address';
        emailInput.required = true;
        elements.authFields.appendChild(emailInput);
        const passwordWrapper = createPasswordField('authPassword', 'Password (min 8 chars)');
        elements.authFields.appendChild(passwordWrapper);
        const confirmWrapper = createPasswordField('authConfirmPassword', 'Confirm password');
        elements.authFields.appendChild(confirmWrapper);
        const hint = document.createElement('small');
        hint.textContent = 'Password must have: 8+ chars, uppercase, lowercase, number, special character';
        elements.authFields.appendChild(hint);
        elements.forgotPasswordLink.style.display = 'none';
    }
    
    const switchLink = document.getElementById('authSwitchLink');
    if (switchLink) {
        switchLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (mode === 'login' || mode === 'reset') {
                openAuthModal('signup');
            } else {
                openAuthModal('login');
            }
        });
    }
}

// ============================================================
// 17. CLOSE MODALS
// ============================================================
elements.closeAuthModal.addEventListener('click', () => {
    elements.authModal.style.display = 'none';
});

elements.authModal.addEventListener('click', (e) => {
    if (e.target === elements.authModal) {
        elements.authModal.style.display = 'none';
    }
});

// About Modal
if (elements.aboutNavBtn) {
    elements.aboutNavBtn.addEventListener('click', () => {
        elements.aboutModal.style.display = 'flex';
    });
}

if (elements.closeAboutModal) {
    elements.closeAboutModal.addEventListener('click', () => {
        elements.aboutModal.style.display = 'none';
    });
}

if (elements.aboutModal) {
    elements.aboutModal.addEventListener('click', (e) => {
        if (e.target === elements.aboutModal) {
            elements.aboutModal.style.display = 'none';
        }
    });
}

// ============================================================
// 18. AUTH FORM SUBMIT - Using Firebase Built-in Verification
// ============================================================
elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const passwordInput = document.getElementById('authPassword');
    const password = passwordInput ? passwordInput.value : '';
    
    try {
        if (state.currentAuthMode === 'login') {
            elements.authSubmitBtn.disabled = true;
            elements.authSubmitBtn.textContent = 'Signing in...';
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            
            if (!userCredential.user.emailVerified) {
                showNotification('Please verify your email first. Check your inbox! 📧', 'warning');
                await auth.signOut();
                elements.authSubmitBtn.disabled = false;
                elements.authSubmitBtn.textContent = 'Sign In';
                return;
            }
            
            elements.authModal.style.display = 'none';
            showNotification('Welcome back! 🎉', 'success');
            elements.authSubmitBtn.textContent = 'Sign In';
            elements.authSubmitBtn.disabled = false;
            
        } else if (state.currentAuthMode === 'reset') {
            elements.authSubmitBtn.disabled = true;
            elements.authSubmitBtn.textContent = 'Sending reset link...';
            
            await auth.sendPasswordResetEmail(email);
            showNotification('Password reset link sent to your email! 📧', 'success');
            elements.authModal.style.display = 'none';
            elements.authSubmitBtn.disabled = false;
            elements.authSubmitBtn.textContent = 'Send Reset Link';
            
        } else {
            // Sign Up
            const confirmPasswordInput = document.getElementById('authConfirmPassword');
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match! ❌', 'error');
                return;
            }
            
            const validation = validateStrongPassword(password);
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }
            
            elements.authSubmitBtn.disabled = true;
            elements.authSubmitBtn.textContent = 'Creating account...';
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Send verification email
            await userCredential.user.sendEmailVerification();
            
            showNotification('Verification email sent! Please check your inbox. 📧', 'success');
            await auth.signOut();
            elements.authModal.style.display = 'none';
            elements.authSubmitBtn.disabled = false;
            elements.authSubmitBtn.textContent = 'Create Account';
        }
        
    } catch (error) {
        console.error('Auth error:', error);
        let errorMessage = error.message;
        // Clean up Firebase error messages
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please sign in.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email. Please sign up.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Please try again later.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address. Please check and try again.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please use a stronger password.';
        }
        showNotification(`Error: ${errorMessage}`, 'error');
        elements.authSubmitBtn.disabled = false;
        elements.authSubmitBtn.textContent = state.currentAuthMode === 'login' ? 'Sign In' : 'Create Account';
    }
});

// ============================================================
// 19. FIRESTORE - TRANSLATION HISTORY
// ============================================================

async function saveToHistory(original, translated, sourceLang, targetLang) {
    if (!state.isLoggedIn || !state.currentUser) return;
    try {
        await db.collection('users').doc(state.currentUser.uid).collection('history').add({
            original: original,
            translated: translated,
            sourceLang: sourceLang,
            targetLang: targetLang,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Save history error:', error);
    }
}

async function loadHistory() {
    if (!state.isLoggedIn || !state.currentUser) {
        elements.historyList.innerHTML = '<p class="empty-history">Sign in to see your history.</p>';
        return;
    }
    try {
        const snapshot = await db
            .collection('users')
            .doc(state.currentUser.uid)
            .collection('history')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        if (snapshot.empty) {
            elements.historyList.innerHTML = '<p class="empty-history">No translations yet. Start translating!</p>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const time = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'Just now';
            const docId = doc.id;
            html += `
                <div class="history-item" data-id="${docId}">
                    <button class="h-delete" data-id="${docId}" title="Delete this history item">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="h-source">
                        ${getLanguageName(data.sourceLang)} → ${getLanguageName(data.targetLang)}
                        <span style="float: right; font-size: 0.65rem; color: var(--text-light);">${time}</span>
                    </div>
                    <div class="h-original" style="color: var(--text-light); font-size: 0.8rem; margin-top: 2px;">
                        "${data.original.substring(0, 50)}${data.original.length > 50 ? '...' : ''}"
                    </div>
                    <div class="h-translation" style="font-weight: 500; margin-top: 2px;">
                        "${data.translated.substring(0, 50)}${data.translated.length > 50 ? '...' : ''}"
                    </div>
                </div>
            `;
        });
        elements.historyList.innerHTML = html;
        document.querySelectorAll('.h-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const docId = btn.dataset.id;
                if (confirm('Delete this history item?')) {
                    await deleteHistoryItem(docId);
                }
            });
        });
    } catch (error) {
        console.error('Load history error:', error);
        elements.historyList.innerHTML = '<p class="empty-history">⚠️ Could not load history. Please refresh.</p>';
    }
}

async function deleteHistoryItem(docId) {
    if (!state.isLoggedIn || !state.currentUser) return;
    try {
        await db.collection('users').doc(state.currentUser.uid).collection('history').doc(docId).delete();
        showNotification('History item deleted. 🗑️', 'info');
        await loadHistory();
    } catch (error) {
        console.error('Delete history error:', error);
        showNotification('Error deleting history item.', 'error');
    }
}

elements.deleteAllHistory.addEventListener('click', async () => {
    if (!state.isLoggedIn || !state.currentUser) {
        showNotification('Please sign in to manage history.', 'warning');
        return;
    }
    if (!confirm('Delete ALL translation history? This cannot be undone!')) return;
    try {
        const snapshot = await db.collection('users').doc(state.currentUser.uid).collection('history').get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => { batch.delete(doc.ref); });
        await batch.commit();
        showNotification('All history deleted successfully. 🗑️', 'info');
        await loadHistory();
    } catch (error) {
        console.error('Delete all history error:', error);
        showNotification('Error deleting history.', 'error');
    }
});

function getLanguageName(code) {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? lang.name : code.toUpperCase();
}

// ============================================================
// 20. KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        performTranslation();
    }
    if (e.key === 'Escape') {
        if (elements.authModal) elements.authModal.style.display = 'none';
        if (elements.aboutModal) elements.aboutModal.style.display = 'none';
    }
});

// ============================================================
// 21. INITIALIZATION
// ============================================================

console.log('🚀 FreeTranslate initialized!');
console.log('📝 Type text or use speech to translate.');
console.log('🔐 Sign in to save translation history.');
console.log('🌍 Supporting 30+ languages including African languages!');

elements.inputText.placeholder = 'Type your text here...';
elements.outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';

if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
}

window.addEventListener('online', () => {
    console.log('🌐 Back online!');
    showNotification('Back online! 🌐', 'success');
});

window.addEventListener('offline', () => {
    console.warn('📡 Offline - translation may not work');
    showNotification('You are offline. Please check your internet connection.', 'warning');
});

console.log('✅ FreeTranslate is ready!');
console.log('📖 Tip: Press Ctrl+Shift+T (or Cmd+Shift+T) for quick translation.');