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
    // Pre-hydrate UI from last session cache so accounts show instantly
    preHydrateFromCache();
    // Check authentication state
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (!user.emailVerified) {
                alert('Please verify your email address before continuing.');
                firebase.auth().signOut();
                window.location.href = 'login.html';
                return;
            }
            setLastUserId(user.uid);
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
        // Global toast helper available on dashboard
        window.showToast = function(message, type = 'info') {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = message;
            toast.className = '';
            toast.classList.add('toast-show');
            toast.classList.add(type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : 'toast-info');
            clearTimeout(window._toastTimeout);
            window._toastTimeout = setTimeout(() => {
                toast.classList.remove('toast-show');
            }, 2000);
        };
        document.getElementById('add-account-btn-modal').addEventListener('click', () => openAccountModal());
        document.getElementById('cancel-account-btn').addEventListener('click', closeAccountModal);
        document.getElementById('account-form').addEventListener('submit', handleAccountFormSubmit);
        document.querySelector('#account-form .toggle-password-vis').addEventListener('click', handleTogglePasswordVisibility);
        // Search clear button
        const searchInput = document.getElementById('search-passwords');
        const clearBtn = document.getElementById('clear-search-btn');
        function refreshClearBtn() {
            if (!clearBtn) return;
            clearBtn.style.display = searchInput && searchInput.value ? '' : 'none';
        }
        if (searchInput && clearBtn) {
            searchInput.addEventListener('input', () => {
                refreshClearBtn();
                filterAccounts();
            });
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                refreshClearBtn();
                filterAccounts();
                searchInput.focus();
            });
            refreshClearBtn();
        }
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
        // Auto-resize generated password textarea
        const gpOut = document.getElementById('generated-password-output');
        function autoResize() {
            if (!gpOut) return;
            gpOut.style.height = 'auto';
            gpOut.style.height = Math.min(gpOut.scrollHeight, 104) + 'px';
        }
        if (gpOut) gpOut.addEventListener('input', autoResize);
        // Update strength for generated passwords
        const genBar = document.getElementById('gen-strength-bar');
        const genMeter = document.getElementById('gen-strength-meter');
        function setGenStrength(pw) {
            let strength = 0;
            if (pw.length >= 8) strength += 20;
            if (/[A-Z]/.test(pw)) strength += 20;
            if (/[a-z]/.test(pw)) strength += 20;
            if (/[0-9]/.test(pw)) strength += 20;
            if (/[^A-Za-z0-9]/.test(pw)) strength += 20;
            const color = strength <= 40 ? '#ff4444' : strength <= 60 ? '#ffbb33' : strength <= 80 ? '#00C851' : '#007E33';
            if (genBar) {
                genBar.style.width = strength + '%';
                genBar.style.backgroundColor = color;
                genBar.classList.remove('shine');
                void genBar.offsetWidth;
                genBar.classList.add('shine');
            }
        }
        const genOutput = document.getElementById('generated-password-output');
        if (genOutput) {
            genOutput.addEventListener('input', () => setGenStrength(genOutput.value));
        }

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

    function setLastUserId(userId) {
        try { localStorage.setItem('last_user_id', userId); } catch (_) {}
    }
    function getLastUserId() {
        try { return localStorage.getItem('last_user_id'); } catch (_) { return null; }
    }
    function preHydrateFromCache() {
        try {
            const uid = getLastUserId();
            if (!uid) return;
            const entry = readAccountsCache(uid);
            const cached = entry.accounts || {};
            if (cached && Object.keys(cached).length) {
                const appWrapper = document.getElementById('app-wrapper');
                if (appWrapper) appWrapper.style.display = 'flex';
                renderAccounts(cached);
            }
        } catch (_) {}
    }

    // --- Local cache helpers for faster initial render ---
    const ACCOUNTS_CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
    function getAccountsCacheKey(userId) {
        return `accounts_cache_${userId}`;
    }

    function readAccountsCache(userId) {
        try {
            const raw = localStorage.getItem(getAccountsCacheKey(userId));
            if (!raw) return { accounts: {}, ts: 0 };
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.data) {
                return { accounts: parsed.data || {}, ts: parsed.ts || 0 };
            }
            return { accounts: parsed || {}, ts: 0 };
        } catch (_) {
            return { accounts: {}, ts: 0 };
        }
    }

    function writeAccountsCache(userId, accountsObj) {
        try {
            localStorage.setItem(
                getAccountsCacheKey(userId),
                JSON.stringify({ data: accountsObj || {}, ts: Date.now() })
            );
        } catch (_) {
            // ignore
        }
    }

    // Render accounts list from a plain object map
    function renderAccounts(accounts) {
        const accountList = document.getElementById('account-list');
        if (!accountList) return;
        const placeholder = document.getElementById('empty-list-placeholder');

        // Remove only existing account items, preserve placeholder element
        accountList.querySelectorAll('.account-item').forEach((li) => li.remove());

        const keys = Object.keys(accounts || {});
        if (keys.length === 0) {
            if (placeholder) placeholder.style.display = '';
            return;
        }
        if (placeholder) placeholder.style.display = 'none';
        keys.forEach((id) => {
            const acc = accounts[id];
            const li = document.createElement('li');
            li.className = 'account-item';
            li.dataset.id = id;
            li.innerHTML = `
                <div class="account-info">
                    <span class="account-user-icon blue-circle"><i class="fas fa-user"></i></span>
                    <div class="account-type-name">
                        <span class="account-type">${acc.name || ''}</span>
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

            // Dropdown logic for copy button
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
                showToast('Username Copied', 'success');
            });
            li.querySelector('.copy-password-btn').addEventListener('click', () => {
                navigator.clipboard.writeText(acc.password || '');
                dropdown.style.display = 'none';
                showToast('Password Copied', 'success');
            });
        });
    }

    // Account management
    function loadAccounts() {
        const userId = getCurrentUserId();
        if (!userId) return;
        // 1) Render cached accounts immediately if present
        const cachedEntry = readAccountsCache(userId);
        const cached = cachedEntry.accounts;
        if (cached && Object.keys(cached).length) {
            renderAccounts(cached);
        }

        const isStale = Date.now() - cachedEntry.ts > ACCOUNTS_CACHE_MAX_AGE_MS;
        const shouldFetch = isStale || !cached || Object.keys(cached).length === 0;
        if (shouldFetch) {
            firebase.database().ref('accounts/' + userId).once('value', (snapshot) => {
                const accounts = snapshot.val() || {};
                writeAccountsCache(userId, accounts);
                renderAccounts(accounts);
            });
        }

        // Ensure passwords are not auto-revealed by browser autofill race conditions
        // Ensure default visible password field stays text
        setTimeout(() => {
            const pwInput = document.getElementById('account-password');
            if (pwInput) pwInput.type = 'text';
            const icon = document.querySelector('#account-form .toggle-password-vis i');
            if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
        }, 0);
    }

    function saveAccount(account) {
        const userId = getCurrentUserId();
        if (!userId) {
            console.error("Error: User not authenticated. Cannot save account.");
            return;
        }
        const id = account.id || firebase.database().ref().child('accounts').push().key;
        firebase.database().ref('accounts/' + userId + '/' + id).set(account)
            .then(() => {
                console.log("Account saved successfully:", account);
                // Update cache immediately for snappy UI; then re-render
                const currentEntry = readAccountsCache(userId);
                const current = currentEntry.accounts || {};
                current[id] = { ...account, id };
                writeAccountsCache(userId, current);
                renderAccounts(current);
                // Also fetch fresh in background to confirm
                firebase.database().ref('accounts/' + userId).once('value', (snapshot) => {
                    const accounts = snapshot.val() || {};
                    writeAccountsCache(userId, accounts);
                    renderAccounts(accounts);
                });
            })
            .catch((error) => {
                console.error("Error saving account to Firebase:", error);
                alert("Failed to save account. Please check console for details.");
            });
    }

    function deleteAccount(id) {
        const userId = getCurrentUserId();
        if (!userId) return;
        // Optimistic UI: update cache and UI immediately
        const entry = readAccountsCache(userId);
        const current = entry.accounts || {};
        delete current[id];
        writeAccountsCache(userId, current);
        renderAccounts(current);

        // Persist removal
        firebase.database().ref('accounts/' + userId + '/' + id).remove()
            .then(() => {
                // Background refresh to ensure consistency
                firebase.database().ref('accounts/' + userId).once('value', (snapshot) => {
                    const accounts = snapshot.val() || {};
                    writeAccountsCache(userId, accounts);
                    renderAccounts(accounts);
                });
            });
    }

    async function handleAccountFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('account-id').value;
        const name = document.getElementById('account-name-input').value;
        const username = document.getElementById('account-username').value;
        const password = document.getElementById('account-password').value;
        const website = document.getElementById('account-website').value;
        if (id) {
            const ok = await showConfirmToast('Save changes to this account?');
            if (!ok) return;
        }
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
            const entry = readAccountsCache(userId);
            const cachedPw = entry.accounts?.[id]?.password;
            if (cachedPw) {
                navigator.clipboard.writeText(cachedPw);
            } else {
                firebase.database().ref('accounts/' + userId + '/' + id).once('value', (snap) => {
                    const pw = (snap.val() || {}).password || '';
                    navigator.clipboard.writeText(pw);
                });
            }
        }
    }

    function openAccountModal(id) {
        const overlay = document.getElementById('account-modal');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
        if (id) {
            document.getElementById('account-modal-title').textContent = 'Edit Account';
            const userId = getCurrentUserId();
            // Prefill from cache instantly if available
            const entry = readAccountsCache(userId);
            const acc = entry && entry.accounts ? entry.accounts[id] : null;
            if (acc) {
                document.getElementById('account-id').value = id;
                document.getElementById('account-name-input').value = acc.name || '';
                document.getElementById('account-username').value = acc.username || '';
                document.getElementById('account-password').value = acc.password || '';
                document.getElementById('account-website').value = acc.website || '';
            }
            // Fetch latest; only update fields that are different to avoid flicker
            firebase.database().ref('accounts/' + userId + '/' + id).once('value', (snap) => {
                const fresh = snap.val() || {};
                const nameEl = document.getElementById('account-name-input');
                const userEl = document.getElementById('account-username');
                const passEl = document.getElementById('account-password');
                const webEl  = document.getElementById('account-website');
                if (nameEl && nameEl.value !== (fresh.name || '')) nameEl.value = fresh.name || '';
                if (userEl && userEl.value !== (fresh.username || '')) userEl.value = fresh.username || '';
                if (passEl && passEl.value !== (fresh.password || '')) passEl.value = fresh.password || '';
                if (webEl && webEl.value !== (fresh.website || '')) webEl.value = fresh.website || '';
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
        const out = document.getElementById('generated-password-output');
        out.value = pw;
        // Resize to fit content
        out.dispatchEvent(new Event('input'));
        if (typeof showToast === 'function') showToast('New password generated', 'info');
    }

    function handleCopyGeneratedPassword() {
        const pw = document.getElementById('generated-password-output').value;
        if (pw) {
            navigator.clipboard.writeText(pw);
            if (typeof showToast === 'function') showToast('Generated password copied', 'success');
        }
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
        // Replace confirm popup with toast and immediate logout
        showToast('Logging out...', 'info');
        firebase.auth().signOut().then(() => {
            try { localStorage.removeItem('last_user_id'); } catch (_) {}
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("Error signing out:", error);
            showToast('Logout failed', 'error');
        });
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

// Toast-style confirm helper
function showConfirmToast(message) {
    return new Promise((resolve) => {
        const el = document.getElementById('toast-confirm');
        if (!el) return resolve(window.confirm(message));
        el.innerHTML = `${message}<div class="actions"><button class="btn-primary" id="tc-ok">Save</button><button id="tc-cancel">Cancel</button></div>`;
        el.classList.add('show');
        const cleanup = () => { el.classList.remove('show'); el.innerHTML = ''; };
        const okBtn = document.getElementById('tc-ok');
        const cancelBtn = document.getElementById('tc-cancel');
        okBtn.onclick = () => { cleanup(); resolve(true); };
        cancelBtn.onclick = () => { cleanup(); resolve(false); };
        // Auto-dismiss after 8s with cancel
        clearTimeout(window._tcTimeout);
        window._tcTimeout = setTimeout(() => { cleanup(); resolve(false); }, 8000);
    });
}