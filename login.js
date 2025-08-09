// login.js
// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyD1mrWtK2cpHG-hLFFepyFmuTPjBH8rNpc",
    authDomain: "stealthpass-e5a70.firebaseapp.com",
    databaseURL: "https://stealthpass-e5a70-default-rtdb.firebaseio.com",
    projectId: "stealthpass-e5a70",
    storageBucket: "stealthpass-e5a70.firebasestorage.app",
    messagingSenderId: "576145452937",
    appId: "1:576145452937:web:3d08adba13f1095525fb58",
    measurementId: "G-J3Q87L9B8T"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Login/Signup Logic
// ... (Paste all DOMContentLoaded and related logic from login.html here) ...

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginError = document.getElementById('login-error');
    const successMessage = document.getElementById('success-message');
    const verificationMessage = document.getElementById('verification-message');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password-vis');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    // Toggle between login and signup forms
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        verificationMessage.style.display = 'none';
    });

    // Handle forgot password
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value; // Get email from login form

        if (!email) {
            showToast('Please enter your email address in the login form.', 'error');
            return;
        }

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            showToast('Password reset email sent! Check your inbox.', 'success');
        } catch (error) {
            showToast(handleError(error), 'error');
        }
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        verificationMessage.style.display = 'none';
    });

    // Toggle password visibility
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Handle login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            if (!user.emailVerified) {
                await firebase.auth().signOut();
                showToast('Please verify your email before logging in.', 'error');
                return;
            }
            
            window.location.href = 'index.html';
        } catch (error) {
            showToast(handleError(error), 'error');
        }
    });

    // Handle signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const termsAccepted = document.getElementById('terms-checkbox').checked;

        if (!termsAccepted) {
            showToast('Please accept the Terms of Service and Privacy Policy', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (!isPasswordStrong(password)) {
            showToast('Please choose a stronger password', 'error');
            return;
        }

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Store user's name in the database
            await firebase.database().ref('users/' + user.uid).set({
                name: name,
                email: email,
                createdAt: new Date().toISOString()
            });
            
            // Send email verification
            await user.sendEmailVerification();
            
            // Clear form and error messages
            signupForm.reset();
            showToast('', 'error');
            showToast('Verification email sent! Please check your inbox.', 'success');
            
            // Redirect to verify.html with email
            setTimeout(() => {
                window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
            }, 1200);
            
        } catch (error) {
            showToast(handleError(error), 'error');
        }
    });

    // Password strength guidance (show only the next unmet requirement)
    const passwordInput = document.getElementById('signup-password');
    const passwordGuidance = document.getElementById('password-guidance');
    const strengthMeter = document.getElementById('strength-meter-bar');
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        let guidance = '';
        let strength = 0;
        if (password.length > 0) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[a-z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;

        // Update strength meter
        strengthMeter.style.width = strength + '%';
        strengthMeter.style.backgroundColor = getStrengthColor(strength);

        // Guidance logic
        if (password.length < 8) {
            guidance = 'Password should be at least 8 characters (recommended).';
        } else if (!/[A-Z]/.test(password)) {
            guidance = 'Password must contain an uppercase letter.';
        } else if (!/[a-z]/.test(password)) {
            guidance = 'Password must contain a lowercase letter.';
        } else if (!/[0-9]/.test(password)) {
            guidance = 'Password must contain a number.';
        } else if (!/[^A-Za-z0-9]/.test(password)) {
            guidance = 'Password must contain a special character.';
        } else {
            guidance = 'Strong password!';
            passwordGuidance.style.color = '#4caf50';
        }
        passwordGuidance.textContent = guidance;
        if (guidance === 'Strong password!') {
            passwordGuidance.style.color = '#4caf50';
        } else {
            passwordGuidance.style.color = 'var(--error-text)';
        }
    });

    function isPasswordStrong(password) {
        return /[A-Z]/.test(password) &&
               /[a-z]/.test(password) &&
               /[0-9]/.test(password) &&
               /[^A-Za-z0-9]/.test(password);
    }

    function getStrengthColor(strength) {
        if (strength <= 20) return '#ff4444';
        if (strength <= 40) return '#ffbb33';
        if (strength <= 60) return '#ffeb3b';
        if (strength <= 80) return '#00C851';
        return '#007E33';
    }

    // Check if user is already logged in
    firebase.auth().onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            window.location.href = 'index.html';
        }
    });
});

function handleError(error) {
    console.error('Auth error:', error);
    const errorMessages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email is already registered',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/network-request-failed': 'Network error. Please try again',
        'auth/invalid-credential': 'Incorrect password'
    };
    return errorMessages[error.code] || 'An unexpected error occurred';
}

function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = '';
    toast.classList.add('toast-show');
    toast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.remove('toast-show');
    }, 3500);
} 