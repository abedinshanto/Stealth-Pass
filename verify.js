// verify.js
// Handles email extraction and button actions for verify.html

function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase (compat) if not already
    if (!window.firebase?.apps?.length) {
        try {
            firebase.initializeApp({
                apiKey: "AIzaSyD1mrWtK2cpHG-hLFFepyFmuTPjBH8rNpc",
                authDomain: "stealthpass-e5a70.firebaseapp.com",
                databaseURL: "https://stealthpass-e5a70-default-rtdb.firebaseio.com",
                projectId: "stealthpass-e5a70",
                storageBucket: "stealthpass-e5a70.firebasestorage.app",
                messagingSenderId: "576145452937",
                appId: "1:576145452937:web:3d08adba13f1095525fb58",
                measurementId: "G-J3Q87L9B8T"
            });
        } catch (_) {}
    }
    const email = getQueryParam('email');
    const emailSpan = document.getElementById('user-email');
    if (emailSpan) {
        emailSpan.textContent = email ? email : '[unknown]';
    }

    // If signup set a pending flag, send verification now (non-blocking)
    try {
        const pending = localStorage.getItem('pendingVerification');
        if (pending === '1' && window.firebase?.auth) {
            localStorage.removeItem('pendingVerification');
            const user = firebase.auth().currentUser;
            if (user && !user.emailVerified) {
                user.sendEmailVerification().catch(() => {});
            }
        }
    } catch (_) {}

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = function() {
            window.location.href = 'login.html';
        };
    }
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
        resendBtn.onclick = async function() {
            try {
                const user = firebase.auth().currentUser;
                if (user && !user.emailVerified) {
                    await user.sendEmailVerification();
                    showToast('Verification email resent. Check your inbox.', 'success');
                } else {
                    showToast('Please sign up or log in first.', 'error');
                }
            } catch (e) {
                showToast('Failed to resend verification.', 'error');
            }
        };
    }
});

function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = '';
    toast.classList.add('toast-show');
    toast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.remove('toast-show');
    }, 3500);
}