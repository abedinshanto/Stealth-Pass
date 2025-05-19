// main.js
// Main Application Logic for Stealth Pass

// Firebase Config and Initialization
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

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (!user.emailVerified) {
                alert('Please verify your email address before continuing.');
                firebase.auth().signOut();
                window.location.href = 'login.html';
                return;
            }
            initializeAppUI();
        } else {
            window.location.href = 'login.html';
        }
    });

    // Initialize UI and event listeners
    function initializeAppUI() {
        const appWrapper = document.getElementById('app-wrapper');
        appWrapper.style.display = 'flex';

        // Load accounts
        loadAccounts();

        // Attach event listeners
        document.getElementById('theme-toggle-btn').addEventListener('click', handleThemeToggle);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('account-list').addEventListener('click', handleAccountListActions);
        document.getElementById('add-account-btn-modal').addEventListener('click', () => openAccountModal());
        document.getElementById('cancel-account-btn').addEventListener('click', closeAccountModal);
        document.getElementById('account-form').addEventListener('submit', handleAccountFormSubmit);
        document.querySelector('#account-form .toggle-password-vis').addEventListener('click', handleTogglePasswordVisibility);
        document.getElementById('search-passwords').addEventListener('input', filterAccounts);

        // Setup dropdowns
        setupDropdown(document.getElementById('password-generator-btn'), document.getElementById('password-generator-dropdown'));
        setupDropdown(document.getElementById('user-profile-btn'), document.getElementById('user-profile-dropdown'));

        // Password generator specific listeners
        document.getElementById('pw-length').addEventListener('input', () => {
            document.getElementById('pw-length-value').textContent = document.getElementById('pw-length').value;
        });
        document.getElementById('generate-now-btn').addEventListener('click', handleGeneratePassword);
        document.getElementById('copy-generated-pw-btn').addEventListener('click', handleCopyGeneratedPassword);

        // Global click handler
        document.addEventListener('click', handleOutsideClicks);

        // Add event listener for the generate password button in the account modal
        document.querySelector('.generate-password-btn').addEventListener('click', function() {
            const length = 16;
            const useUpper = true;
            const useLower = true;
            const useNum = true;
            const useSym = true;
            let chars = '';
            if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
            if (useNum) chars += '0123456789';
            if (useSym) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            let pw = '';
            for (let i = 0; i < length; i++) {
                pw += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            document.getElementById('account-password').value = pw;
        });
    }

    // Helper: Get current user UID
    function getCurrentUserId() {
        const user = firebase.auth().currentUser;
        return user ? user.uid : null;
    }

    // Account management
    function loadAccounts() {
        const userId = getCurrentUserId();
        if (!userId) return;
        const accountList = document.getElementById('account-list');
        const placeholder = document.getElementById('empty-list-placeholder');
        firebase.database().ref('accounts/' + userId).once('value', (snapshot) => {
            const accounts = snapshot.val() || {};
            accountList.innerHTML = '';
            const keys = Object.keys(accounts);
            if (keys.length === 0) {
                placeholder.style.display = '';
            } else {
                placeholder.style.display = 'none';
                keys.forEach((id) => {
                    const acc = accounts[id];
                    const li = document.createElement('li');
                    li.className = 'account-item';
                    li.dataset.id = id;
                    li.innerHTML = `
                        <div class="account-info">
                            <span class="account-user-icon blue-circle"><i class="fas fa-user"></i></span>
                            <div class="account-type-name">
                                <span class="account-type">${acc.name}</span>
                                <span class="account-username-display">${acc.username || ''}</span>
                            </div>
                        </div>
                        <div class="account-actions">
                            <div class="copy-dropdown-container" style="position: relative; display: inline-block;">
                                <button class="icon-btn btn-copy" title="Copy"><i class="far fa-copy"></i></button>
                                <div class="copy-dropdown-menu" style="display: none; position: absolute; top: 110%; right: 0; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 16px var(--shadow-color); z-index: 100; min-width: 140px;">
                                    <button class="copy-username-btn" style="width: 100%; padding: 0.7em 1em; background: none; border: none; color: var(--text-primary); text-align: left; cursor: pointer;">Copy Username</button>
                                    <button class="copy-password-btn" style="width: 100%; padding: 0.7em 1em; background: none; border: none; color: var(--text-primary); text-align: left; cursor: pointer;">Copy Password</button>
                                </div>
                            </div>
                            <button class="icon-btn btn-edit" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="icon-btn btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                    accountList.appendChild(li);

                    // Add dropdown logic for copy button
                    const copyBtn = li.querySelector('.btn-copy');
                    const dropdown = li.querySelector('.copy-dropdown-menu');
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                    });
                    document.addEventListener('click', (e) => {
                        if (!li.contains(e.target)) {
                            dropdown.style.display = 'none';
                        }
                    });
                    li.querySelector('.copy-username-btn').addEventListener('click', () => {
                        navigator.clipboard.writeText(acc.username || '');
                        dropdown.style.display = 'none';
                    });
                    li.querySelector('.copy-password-btn').addEventListener('click', () => {
                        navigator.clipboard.writeText(acc.password || '');
                        dropdown.style.display = 'none';
                    });
                });
            }
        });
    }

    function saveAccount(account) {
        const userId = getCurrentUserId();
        if (!userId) return;
        const id = account.id || firebase.database().ref().child('accounts').push().key;
        firebase.database().ref('accounts/' + userId + '/' + id).set(account, loadAccounts);
    }

    function deleteAccount(id) {
        const userId = getCurrentUserId();
        if (!userId) return;
        firebase.database().ref('accounts/' + userId + '/' + id).remove(loadAccounts);
    }

    function handleAccountFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('account-id').value;
        const name = document.getElementById('account-name-input').value;
        const username = document.getElementById('account-username').value;
        const password = document.getElementById('account-password').value;
        const website = document.getElementById('account-website').value;
        saveAccount({ id, name, username, password, website });
        closeAccountModal();
    }

    function handleAccountListActions(e) {
        const li = e.target.closest('.account-item');
        if (!li) return;
        const id = li.dataset.id;
        if (e.target.closest('.btn-delete')) {
            if (confirm('Delete this account?')) deleteAccount(id);
        } else if (e.target.closest('.btn-edit')) {
            openAccountModal(id);
        } else if (e.target.closest('.btn-copy')) {
            const userId = getCurrentUserId();
            firebase.database().ref('accounts/' + userId + '/' + id).once('value', (snap) => {
                const pw = snap.val().password;
                navigator.clipboard.writeText(pw);
            });
        }
    }

    function openAccountModal(id) {
        const overlay = document.getElementById('account-modal');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
        if (id) {
            document.getElementById('account-modal-title').textContent = 'Edit Account';
            const userId = getCurrentUserId();
            firebase.database().ref('accounts/' + userId + '/' + id).once('value', (snap) => {
                const acc = snap.val();
                document.getElementById('account-id').value = id;
                document.getElementById('account-name-input').value = acc.name;
                document.getElementById('account-username').value = acc.username;
                document.getElementById('account-password').value = acc.password;
                document.getElementById('account-website').value = acc.website;
            });
        } else {
            document.getElementById('account-modal-title').textContent = 'Add New Account';
            document.getElementById('account-id').value = '';
            document.getElementById('account-form').reset();
        }
    }

    function closeAccountModal() {
        document.getElementById('account-modal').classList.remove('visible');
        document.body.style.overflow = '';
    }

    function handleTogglePasswordVisibility(e) {
        const input = document.getElementById('account-password');
        const icon = e.currentTarget.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    function handleThemeToggle() {
        const isLight = document.body.classList.contains('light-theme');
        setTheme(isLight ? 'dark' : 'light');
    }

    function filterAccounts() {
        const query = document.getElementById('search-passwords').value.toLowerCase();
        document.querySelectorAll('.account-item').forEach((li) => {
            const name = li.querySelector('.account-type').textContent.toLowerCase();
            const username = li.querySelector('.account-username-display').textContent.toLowerCase();
            li.style.display = name.includes(query) || username.includes(query) ? '' : 'none';
        });
    }

    function setupDropdown(button, dropdown) {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    function handleGeneratePassword() {
        const length = parseInt(document.getElementById('pw-length').value);
        const useUpper = document.getElementById('pw-uppercase').checked;
        const useLower = document.getElementById('pw-lowercase').checked;
        const useNum = document.getElementById('pw-numbers').checked;
        const useSym = document.getElementById('pw-symbols').checked;
        let chars = '';
        if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (useNum) chars += '0123456789';
        if (useSym) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let pw = '';
        for (let i = 0; i < length; i++) {
            pw += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('generated-password-output').value = pw;
    }

    function handleCopyGeneratedPassword() {
        const pw = document.getElementById('generated-password-output').value;
        if (pw) navigator.clipboard.writeText(pw);
    }

    function handleOutsideClicks(e) {
        document.querySelectorAll('.dropdown-menu').forEach((dropdown) => {
            if (!dropdown.contains(e.target) && !dropdown.previousElementSibling.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        if (e.target.classList.contains('overlay')) {
            closeAccountModal();
        }
    }

    // Handle logout
    function handleLogout(e) {
        e.preventDefault();
        if (confirm("Are you sure you want to logout?")) {
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error("Error signing out:", error);
            });
        }
    }

    // Theme toggle logic
    function setTheme(theme) {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(theme + '-theme');
        const icon = document.querySelector('#theme-toggle-btn i');
        if (theme === 'light') {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        localStorage.setItem('theme', theme);
    }

    // On page load, set theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme');
    setTheme(savedTheme === 'light' ? 'light' : 'dark');
}); 