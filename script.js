// ============================================================
// FIREBASE CONFIG - CORRECT VERSION
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAFVTmeK7X708lEYZLE6zakqYbTGu_hpoU",
  authDomain: "freetranslate-60750.firebaseapp.com",
  projectId: "freetranslate-60750",
  storageBucket: "freetranslate-60750.firebasestorage.app",
  messagingSenderId: "7772857730",
  appId: "1:7772857730:web:60287d7e4e16281da1db9b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// TEST: Check if Firebase is connected
// ============================================================
console.log('🔍 Testing Firebase connection...');
console.log('✅ Firebase initialized with project:', firebaseConfig.projectId);
console.log('✅ API Key:', firebaseConfig.apiKey.substring(0, 10) + '...');

// ============================================================
// SIMPLE AUTH - WORKING VERSION
// ============================================================

// DOM Elements
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const authForm = document.getElementById('authForm');
const authFields = document.getElementById('authFields');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authModalTitle = document.getElementById('authModalTitle');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchLink = document.getElementById('authSwitchLink');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const notificationContainer = document.getElementById('notificationContainer');

let currentMode = 'login'; // 'login' or 'signup' or 'reset'

// ============================================================
// NOTIFICATION
// ============================================================
function showNotification(message, type = 'info') {
    const container = notificationContainer;
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
    }, 5000);
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
// AUTH STATE
// ============================================================
auth.onAuthStateChanged((user) => {
    console.log('👤 Auth state changed:', user ? `Logged in as ${user.email}` : 'Logged out');
    if (user) {
        if (!user.emailVerified) {
            showNotification('📧 Please verify your email. Check your inbox!', 'warning');
            authBtn.innerHTML = '<i class="fas fa-user"></i> Verify Email';
            return;
        }
        authBtn.innerHTML = `<i class="fas fa-user-check"></i> ${user.email}`;
        showNotification(`Welcome ${user.email}! 🎉`, 'success');
    } else {
        authBtn.innerHTML = '<i class="fas fa-user"></i> Sign In';
    }
});

// ============================================================
// OPEN AUTH MODAL
// ============================================================
authBtn.addEventListener('click', () => {
    if (auth.currentUser) {
        auth.signOut().then(() => {
            showNotification('Logged out! 👋', 'info');
        }).catch((error) => {
            showNotification('Error logging out.', 'error');
        });
    } else {
        openModal('login');
    }
});

function openModal(mode) {
    currentMode = mode;
    authModal.style.display = 'flex';
    authFields.innerHTML = '';
    forgotPasswordLink.style.display = 'none';
    
    if (mode === 'login') {
        authModalTitle.textContent = 'Sign In';
        authSubmitBtn.textContent = 'Sign In';
        authSwitchText.innerHTML = `Don't have an account? <a href="#" id="authSwitchLink">Sign Up</a>`;
        
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
        authSubmitBtn.textContent = 'Send Reset Link';
        authSwitchText.innerHTML = `Remember password? <a href="#" id="authSwitchLink">Sign In</a>`;
        
        const email = document.createElement('input');
        email.type = 'email';
        email.id = 'authEmail';
        email.placeholder = 'Email address';
        email.required = true;
        authFields.appendChild(email);
        
    } else {
        authModalTitle.textContent = 'Sign Up';
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
// AUTH FORM SUBMIT - WORKING VERSION
// ============================================================
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword')?.value || '';
    
    console.log('📝 Form submitted:', { mode: currentMode, email });
    
    try {
        if (currentMode === 'login') {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Signing in...';
            
            console.log('🔑 Attempting sign in...');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Sign in successful:', userCredential.user.email);
            
            if (!userCredential.user.emailVerified) {
                showNotification('📧 Please verify your email. Check your inbox!', 'warning');
                await auth.signOut();
                authSubmitBtn.disabled = false;
                authSubmitBtn.textContent = 'Sign In';
                return;
            }
            
            authModal.style.display = 'none';
            showNotification('Welcome back! 🎉', 'success');
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Sign In';
            
        } else if (currentMode === 'reset') {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Sending...';
            
            console.log('📧 Sending password reset...');
            await auth.sendPasswordResetEmail(email);
            showNotification('Password reset link sent to your email! 📧', 'success');
            authModal.style.display = 'none';
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Send Reset Link';
            
        } else {
            // Sign Up
            const confirmPassword = document.getElementById('authConfirmPassword')?.value || '';
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match! ❌', 'error');
                return;
            }
            
            if (password.length < 8) {
                showNotification('Password must be at least 8 characters!', 'error');
                return;
            }
            
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Creating account...';
            
            console.log('📝 Creating account...');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            console.log('✅ Account created:', userCredential.user.email);
            
            // Send verification email
            await userCredential.user.sendEmailVerification();
            console.log('📧 Verification email sent');
            
            showNotification('✅ Account created! Check your email for verification.', 'success');
            await auth.signOut();
            authModal.style.display = 'none';
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Create Account';
        }
        
    } catch (error) {
        console.error('❌ Auth error:', error.code, error.message);
        
        let errorMessage = error.message;
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please sign in.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found. Please sign up.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Try again.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Try again later.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Use 8+ chars with uppercase, lowercase, number, special.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Check your internet connection.';
        }
        
        showNotification(`❌ ${errorMessage}`, 'error');
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = currentMode === 'login' ? 'Sign In' : 'Create Account';
    }
});

// ============================================================
// LANGUAGES
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

// Populate languages
function populateLanguages() {
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
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

// ============================================================
// TRANSLATION
// ============================================================
const translateBtn = document.getElementById('translateBtn');
const inputText = document.getElementById('inputText');
const outputDisplay = document.getElementById('outputText');

async function translateWithGoogle(text, sourceLang, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[0]) {
        return data[0].map(item => item[0]).join('');
    }
    throw new Error('Translation failed');
}

async function performTranslation() {
    const sourceLang = document.getElementById('sourceLang').value;
    const targetLang = document.getElementById('targetLang').value;
    const text = inputText.value.trim();
    
    if (!text) {
        outputDisplay.innerHTML = '<span class="placeholder">⚠️ Please enter text to translate.</span>';
        return;
    }
    
    translateBtn.disabled = true;
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    outputDisplay.innerHTML = '<span class="placeholder">⏳ Translating...</span>';
    
    try {
        const translated = await translateWithGoogle(text, sourceLang, targetLang);
        outputDisplay.textContent = translated;
    } catch (error) {
        outputDisplay.innerHTML = `<span class="placeholder">❌ ${error.message}</span>`;
    } finally {
        translateBtn.disabled = false;
        translateBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Translate';
    }
}

translateBtn.addEventListener('click', performTranslation);
inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        performTranslation();
    }
});

// Swap languages
document.getElementById('swapLang').addEventListener('click', () => {
    const source = document.getElementById('sourceLang');
    const target = document.getElementById('targetLang');
    const temp = source.value;
    source.value = target.value;
    target.value = temp;
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
        utterance.lang = document.getElementById('targetLang').value;
        window.speechSynthesis.speak(utterance);
    }
});

// Clear
document.getElementById('clearInput').addEventListener('click', () => {
    inputText.value = '';
    outputDisplay.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
});

// Mic
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
            recognition.lang = document.getElementById('sourceLang').value;
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
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

// Load theme
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

// ============================================================
// ABOUT MODAL
// ============================================================
const aboutNavBtn = document.getElementById('aboutNavBtn');
const aboutModal = document.getElementById('aboutModal');
const closeAboutModal = document.getElementById('closeAboutModal');

if (aboutNavBtn) {
    aboutNavBtn.addEventListener('click', () => {
        aboutModal.style.display = 'flex';
    });
}

if (closeAboutModal) {
    closeAboutModal.addEventListener('click', () => {
        aboutModal.style.display = 'none';
    });
}

if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.style.display = 'none';
        }
    });
}

// ============================================================
// INIT
// ============================================================
console.log('🚀 FreeTranslate initialized!');
console.log('✅ Firebase connected to project:', firebaseConfig.projectId);
console.log('📝 Ready for translations!');