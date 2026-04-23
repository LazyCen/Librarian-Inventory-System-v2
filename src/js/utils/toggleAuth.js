/**
 * Toggles between the login and signup forms within the authentication section.
 * When switching away from signup (isSignup = false), the role-picker step is
 * also reset so the user starts fresh if they return to registration.
 *
 * @param {boolean} isSignup - If true, displays the signup form and hides the login form. If false, does the reverse.
 */
function toggleAuth(isSignup) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authNotice = document.getElementById('authNotice');
    if (authNotice) {
        authNotice.className = 'auth-notice hidden';
        authNotice.textContent = '';
    }
    if (isSignup) {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
        // Always start signup at the role-picker step
        if (typeof resetRoleStep === 'function') resetRoleStep();
    } else {
        signupForm.style.display = 'none';
        loginForm.style.display = 'flex';
        // Clean up signup state when switching back to login
        if (typeof resetRoleStep === 'function') resetRoleStep();
    }
}
