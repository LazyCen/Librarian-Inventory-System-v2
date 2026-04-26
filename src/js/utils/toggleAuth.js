/**
 * Toggles between the Login and Signup forms.
 * @param {boolean} showSignup - If true, show signup form; otherwise show login form.
 */
function toggleAuth(showSignup) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authNotice = document.getElementById('authNotice');

    if (loginForm && signupForm) {
        if (showSignup) {
            loginForm.style.display = 'none';
            signupForm.style.display = 'flex';
        } else {
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
        }
    }

    if (authNotice) {
        authNotice.className = 'auth-notice hidden';
        authNotice.textContent = '';
    }
}
