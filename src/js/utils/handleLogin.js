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

    // Highlight selected button
    document.querySelectorAll('.role-picker-btn').forEach(btn => btn.classList.remove('selected'));
    const selectedBtn = document.getElementById(`roleBtn-${role.toLowerCase()}`);
    if (selectedBtn) selectedBtn.classList.add('selected');

    // Show badge with chosen role
    const badge = document.getElementById('roleSelectedBadge');
    if (badge) {
        const icon = role === 'Faculty' ? 'fa-chalkboard-teacher' : 'fa-user-graduate';
        const color = role === 'Faculty' ? '#fde68a' : '#bfdbfe';
        badge.innerHTML = `<i class="fas ${icon}" style="color:${color}"></i> Registering as <strong>${role}</strong>`;
    }

    // Transition to step 2
    const step1 = document.getElementById('roleSelectionStep');
    const step2 = document.getElementById('signupFields');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'flex';
}

/**
 * Resets the signup form back to the role-picker step.
 * Called when the user clicks "Change role".
 */
function resetRoleStep() {
    _pendingRole = null;
    document.querySelectorAll('.role-picker-btn').forEach(btn => btn.classList.remove('selected'));

    const step1 = document.getElementById('roleSelectionStep');
    const step2 = document.getElementById('signupFields');
    if (step1) step1.style.display = '';
    if (step2) step2.style.display = 'none';
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

    // If a student somehow navigates to the bins view, redirect to dashboard
    if (isStudent) {
        const binsView = document.getElementById('view-bins');
        if (binsView && !binsView.classList.contains('hidden')) {
            if (typeof switchView === 'function') switchView('dashboard');
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Core login / signup handler                                        */
/* ------------------------------------------------------------------ */

function handleLogin(e) {
    if (e) e.preventDefault();

    const targetId = e?.target?.id;
    const isSocialLogin = targetId === 'googleLogin' || targetId === 'facebookLogin';

    /* ---- SIGNUP ---- */
    if (targetId === 'signupForm') {
        // Role must be selected first
        if (!_pendingRole) {
            // Show notice inside the role step
            const notice = document.getElementById('roleNotice');
            if (notice) {
                notice.textContent = 'Please select a role first.';
                notice.className = 'auth-notice error';
            }
            return;
        }

        const emailInput = document.getElementById('signupEmail');
        const nameInput = document.getElementById('signupName');
        const passwordInput = document.getElementById('signupPassword');

        const email = emailInput?.value?.trim().toLowerCase();
        if (!email) {
            setAuthNotice('Please enter an email address.', 'error');
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
            email,
            password: passwordInput?.value || '',
            role: _pendingRole,
            createdAt: new Date().toISOString()
        });
        saveStoredUsers(users);

        // Reset the signup form state
        resetRoleStep();
        setAuthNotice('Account created. You can now log in with this email.', 'success');

        if (emailInput) {
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) loginEmail.value = emailInput.value.trim();
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
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');

        const email = emailInput?.value?.trim().toLowerCase();
        const password = passwordInput?.value || '';

        if (!email || !password) {
            setAuthNotice('Please enter both email and password.', 'error');
            return;
        }

        const users = getStoredUsers();
        const matchedUser = users.find((user) => user.email === email);
        if (!matchedUser) {
            setAuthNotice('No account found for this email. Please sign up first.', 'error');
            return;
        }

        if (matchedUser.password !== password) {
            setAuthNotice('Incorrect password. Please try again.', 'error');
            return;
        }

        // Persist the role so it survives future calls (e.g. from applyRoleRestrictions)
        const userRole = matchedUser.role || 'Faculty';
        localStorage.setItem(CURRENT_ROLE_KEY, userRole);

        clearAuthNotice();
        // Mark this user as online in the Users panel
        if (typeof setUserOnline === 'function') setUserOnline(email);
    }

    if (!isSocialLogin && targetId !== 'loginForm') {
        setAuthNotice('Unsupported login action.', 'error');
        return;
    }

    /* ---- SOCIAL LOGINS ---- */
    if (isSocialLogin) {
        const guestEmail = `guest_${targetId}@social.login`;
        const users = getStoredUsers();
        if (!users.some(u => u.email === guestEmail)) {
            users.push({
                fullName: targetId === 'googleLogin' ? 'Google User' : 'Facebook User',
                email: guestEmail,
                password: '',
                role: 'Faculty', // Social logins get full access by default
                createdAt: new Date().toISOString()
            });
            saveStoredUsers(users);
        }
        // Social login users always get Faculty role
        localStorage.setItem(CURRENT_ROLE_KEY, 'Faculty');
        if (typeof setUserOnline === 'function') setUserOnline(guestEmail);
    }

    clearAuthNotice();
    document.getElementById('auth-section').style.display = 'none';
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
    ['loginForm', 'googleLogin', 'facebookLogin', 'signupForm'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(el.tagName === 'FORM' ? 'submit' : 'click', handleLogin);
    });
});
