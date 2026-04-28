/**
 * Handles the user logout process.
 * Clears session data and redirects to the login screen.
 */
function handleLogout() {
    const email = localStorage.getItem('lisCurrentUser');
    if (typeof setUserOffline === 'function') {
        setUserOffline(email);
    }

    localStorage.removeItem('lisCurrentRole');
    localStorage.removeItem('lisCurrentUser');
    // Clear the refresh-detection flag so we don't accidentally restore the session after logout
    sessionStorage.removeItem('lisPageRefreshing');


    // Hide app and show auth section
    const mainApp = document.getElementById('main-app');
    const authSection = document.getElementById('auth-section');
    const booksLayer = document.getElementById('booksLayer');

    if (mainApp) mainApp.classList.add('hidden');
    if (authSection) authSection.style.display = 'flex';
    if (booksLayer) booksLayer.style.display = 'block';

    // Reset to role selection
    if (typeof goBackToRoleSelection === 'function') {
        goBackToRoleSelection();
    } else {
        // Fallback if goBackToRoleSelection is missing
        const selector = document.getElementById('roleSelector');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (selector) selector.style.display = 'flex';
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'none';
    }

    if (typeof showMessage === 'function') {
        showMessage('Logged out successfully', 'info');
    }
}
