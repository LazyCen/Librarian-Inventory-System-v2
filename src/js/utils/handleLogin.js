/**
 * Handles the login or signup submission process.
 * Prevents the default form submission, hides the authentication section,
 * and reveals the main application dashboard.
 *
 * Role System
 * -----------
 * During signup the user picks Faculty or Student (stored as `role` on the user
 * object).  On login the stored role is read and `applyRoleRestrictions()` is
 * called to show/hide privileged UI elements accordingly.
 *
 * Student restrictions:
 *  - "Register Book" button is hidden
 *  - "Bins Status" sidebar item is hidden
 *
 * @param {Event} e - The event object triggered by form submission or button click.
 */

const AUTH_USERS_KEY = 'lisAuthUsers';
const CURRENT_ROLE_KEY = 'lisCurrentRole';

function getStoredUsers() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveStoredUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function setAuthNotice(message, type = 'error') {
    const notice = document.getElementById('authNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.className = `auth-notice ${type}`;
}

function clearAuthNotice() {
    const notice = document.getElementById('authNotice');
    if (!notice) return;
    notice.textContent = '';
    notice.className = 'auth-notice hidden';
}

/* ------------------------------------------------------------------ */
/*  Role-selection step helpers (called from index.html inline attrs)  */
/* ------------------------------------------------------------------ */

/** Tracks the role chosen in the signup role-picker step. */
let _pendingRole = null;

/**
 * Called when the user clicks Faculty or Student in the role picker.
 * Shows the second step (registration fields) and remembers the choice.
 * @param {'Faculty'|'Student'} role
 */
function selectRole(role) {
    _pendingRole = role;

    // Highlight selected button (optional now as we transition away immediately)
    document.querySelectorAll('.role-picker-grid .role-picker-btn').forEach(btn => btn.classList.remove('selected'));
    const selectedBtn = document.getElementById(`roleBtn-${role.toLowerCase()}`);
    if (selectedBtn) selectedBtn.classList.add('selected');

    // Update badges in both login and signup forms
    const signupBadge = document.getElementById('roleSelectedBadge');
    const loginBadgeContent = document.getElementById('loginRoleBadgeContent');
    
    const icon = role === 'Faculty' ? 'fa-chalkboard-teacher' : 'fa-user-graduate';
    const color = role === 'Faculty' ? '#fde68a' : '#bfdbfe';
    const badgeHTML = `<i class="fas ${icon}" style="color:${color}"></i> ${role === 'Faculty' ? 'Faculty' : 'Student'} Access`;

    if (signupBadge) {
        signupBadge.innerHTML = `<i class="fas ${icon}" style="color:${color}"></i> Registering as <strong>${role}</strong>`;
    }
    if (loginBadgeContent) {
        loginBadgeContent.innerHTML = badgeHTML;
    }

    // Transition to login form by default
    const selector = document.getElementById('roleSelector');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (selector) selector.style.display = 'none';
    
    // We default to login form after role selection
    if (loginForm) loginForm.style.display = 'flex';
    if (signupForm) signupForm.style.display = 'none';
}

/**
 * Returns to the initial role selection screen.
 */
function goBackToRoleSelection() {
    _pendingRole = null;
    
    const selector = document.getElementById('roleSelector');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authNotice = document.getElementById('authNotice');

    if (selector) selector.style.display = 'flex';
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    
    if (authNotice) {
        authNotice.className = 'auth-notice hidden';
        authNotice.textContent = '';
    }
    
    // Reset button highlights
    document.querySelectorAll('.role-picker-grid .role-picker-btn').forEach(btn => btn.classList.remove('selected'));
}


/* ------------------------------------------------------------------ */
/*  Role-based UI restrictions                                         */
/* ------------------------------------------------------------------ */

/**
 * Apply (or remove) UI restrictions based on the given role.
 * @param {'Faculty'|'Student'|null} role
 */
function applyRoleRestrictions(role) {
    const isStudent = role === 'Student';
    
    // Set role-based classes on body for CSS targeting
    document.body.classList.remove('role-student', 'role-faculty');
    document.body.classList.add(isStudent ? 'role-student' : 'role-faculty');

    // Register Book button
    const registerBtn = document.getElementById('registerBookBtn');
    if (registerBtn) {
        registerBtn.style.display = isStudent ? 'none' : '';
    }

    // Bins Status sidebar nav item
    const binsNav = document.getElementById('navBinsStatus');
    if (binsNav) {
        binsNav.style.display = isStudent ? 'none' : '';
    }

    // Reading History sidebar nav item
    const historyNav = document.getElementById('navHistory');
    if (historyNav) {
        historyNav.style.display = isStudent ? '' : 'none';
    }

    // If a faculty tries to access history, or student tries to access bins, redirect
    if (isStudent) {
        const binsView = document.getElementById('view-bins');
        if (binsView && !binsView.classList.contains('hidden')) {
            if (typeof switchView === 'function') switchView('dashboard');
        }
    } else {
        const historyView = document.getElementById('view-history');
        if (historyView && !historyView.classList.contains('hidden')) {
            if (typeof switchView === 'function') switchView('dashboard');
        }
    }

    const dashBinCard = document.getElementById('dashBinStatusCard');
    if (dashBinCard) {
        dashBinCard.style.display = isStudent ? 'none' : '';
    }

    // Update Requests sidebar label
    if (typeof updateRequestBadge === 'function') {
        updateRequestBadge();
    }
}

/* ------------------------------------------------------------------ */
/*  Core login / signup handler                                        */
/* ------------------------------------------------------------------ */

function handleLogin(e) {
    if (e) e.preventDefault();
    const targetId = e?.target?.id;

    if (targetId === 'loginForm' || targetId === 'signupForm') {
        if (!_pendingRole) {
            goBackToRoleSelection();
            setAuthNotice('Please select your role first.', 'error');
            return;
        }
    }

    /* ---- SIGNUP ---- */
    if (targetId === 'signupForm') {
        const emailInput = document.getElementById('signupEmail');
        const nameInput = document.getElementById('signupName');
        const idInput = document.getElementById('signupId');
        const passwordInput = document.getElementById('signupPassword');

        const email = emailInput?.value?.trim().toLowerCase();
        const idNumber = idInput?.value?.trim();
        const fullName = nameInput?.value?.trim();
        const password = passwordInput?.value;

        if (!fullName) {
            setAuthNotice('Please enter your full name.', 'error');
            const notice = document.getElementById('authNotice');
            if (notice) notice.classList.add('animate-shake');
            return;
        }

        if (!idNumber) {
            setAuthNotice('Please enter your institutional ID number.', 'error');
            const notice = document.getElementById('authNotice');
            if (notice) notice.classList.add('animate-shake');
            return;
        }

        if (!email) {
            setAuthNotice('Please enter an email address.', 'error');
            const notice = document.getElementById('authNotice');
            if (notice) notice.classList.add('animate-shake');
            return;
        }

        if (!password || password.length < 6) {
            setAuthNotice('Password must be at least 6 characters.', 'error');
            const notice = document.getElementById('authNotice');
            if (notice) notice.classList.add('animate-shake');
            return;
        }

        if (!email.endsWith('@gsu.edu.ph')) {
            setAuthNotice('Please use your @gsu.edu.ph institutional email.', 'error');
            const notice = document.getElementById('authNotice');
            if (notice) notice.classList.add('animate-shake');
            return;
        }

        const idPart = email.split('@')[0];
        if (!idPart) {
            setAuthNotice('Invalid email format.', 'error');
            const notice = document.getElementById('authNotice');
            if (notice) notice.classList.add('animate-shake');
            return;
        }

        const users = getStoredUsers();
        const alreadyExists = users.some((user) => user.email === email);
        if (alreadyExists) {
            setAuthNotice('This email already exists. Please log in instead.', 'error');
            return;
        }

        users.push({
            fullName: nameInput?.value?.trim() || '',
            idNumber,
            email,
            password: passwordInput?.value || '',
            role: _pendingRole,
            createdAt: new Date().toISOString()
        });
        saveStoredUsers(users);

        // Reset the signup form state
        setAuthNotice('Account created. You can now log in with this email.', 'success');

        if (emailInput) {
            const loginIdInput = document.getElementById('loginIdentifier');
            if (loginIdInput) loginIdInput.value = emailInput.value.trim();
        }
        if (typeof toggleAuth === 'function') {
            setTimeout(() => {
                toggleAuth(false);
                setAuthNotice('Account created. Please sign in.', 'success');
            }, 350);
        }
        return;
    }

    /* ---- LOGIN ---- */
    if (targetId === 'loginForm') {
        const identifierInput = document.getElementById('loginIdentifier');
        const passwordInput = document.getElementById('loginPassword');

        const identifier = identifierInput?.value?.trim();
        const password = passwordInput?.value || '';

        if (!identifier || !password) {
            setAuthNotice('Please enter your credentials.', 'error');
            return;
        }

        const users = getStoredUsers();
        const matchedUser = users.find((user) => 
            user.email.toLowerCase() === identifier.toLowerCase() || 
            (user.idNumber && user.idNumber === identifier)
        );

        if (!matchedUser) {
            setAuthNotice('No account found. Please check your credentials.', 'error');
            return;
        }

        if (matchedUser.password !== password) {
            setAuthNotice('Incorrect password. Please try again.', 'error');
            return;
        }

        // Account Status Check
        if (matchedUser.active === false) {
            setAuthNotice('Your account has been deactivated. Please contact the administrator.', 'error');
            return;
        }

        // Role Enforcement: Ensure the account role matches the selected access role
        const matchedUserRole = matchedUser.role || 'Faculty';
        if (matchedUserRole !== _pendingRole) {
            setAuthNotice(`Access Denied: This is a ${matchedUserRole} account.`, 'error');
            return;
        }

        // Update User Metadata
        matchedUser.lastLogin = new Date().toISOString();
        saveStoredUsers(users);

        // Record Login History
        try {
            const loginHistory = JSON.parse(localStorage.getItem('lisLoginHistory') || '[]');
            loginHistory.unshift({
                email: matchedUser.email,
                action: 'login',
                time: new Date().toISOString(),
                ip: '127.0.0.1', // Mock IP for local system
                device: 'Desktop Browser'
            });
            localStorage.setItem('lisLoginHistory', JSON.stringify(loginHistory.slice(0, 500))); // Keep last 500
        } catch(e) {}

        // Persist the role so it survives future calls (e.g. from applyRoleRestrictions)
        const userRole = matchedUser.role || 'Faculty';
        localStorage.setItem(CURRENT_ROLE_KEY, userRole);

        clearAuthNotice();
        // Mark this user as online in the Users panel
        if (typeof setUserOnline === 'function') setUserOnline(matchedUser.email);
    }

    if (targetId !== 'loginForm') {
        setAuthNotice('Unsupported login action.', 'error');
        return;
    }

    clearAuthNotice();
    document.getElementById('auth-section').style.display = 'none';
    const booksLayer = document.getElementById('booksLayer');
    if (booksLayer) booksLayer.style.display = 'none';
    document.getElementById('main-app').classList.remove('hidden');

    // Apply role restrictions now that the dashboard is visible
    const storedRole = localStorage.getItem(CURRENT_ROLE_KEY);
    applyRoleRestrictions(storedRole);

    // Re-render the users panel now that the dashboard is visible
    if (typeof renderUsersPanel === 'function') renderUsersPanel();
}

/**
 * Attaches event listeners for login and signup forms and social login buttons
 * once the document has loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    ['loginForm', 'signupForm'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(el.tagName === 'FORM' ? 'submit' : 'click', handleLogin);
    });
});
