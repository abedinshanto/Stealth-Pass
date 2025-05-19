// verify.js
// Handles email extraction and button actions for verify.html

function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

document.addEventListener('DOMContentLoaded', function() {
    const email = getQueryParam('email');
    const emailSpan = document.getElementById('user-email');
    if (emailSpan) {
        emailSpan.textContent = email ? email : '[unknown]';
    }
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = function() {
            window.location.href = 'login.html';
        };
    }
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
        resendBtn.onclick = function() {
            alert('Resend functionality not implemented in this demo.');
        };
    }
}); 