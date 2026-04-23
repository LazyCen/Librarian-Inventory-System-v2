/**
 * Handles the logout process.
 * Marks the current session user as offline, clears the role-based restrictions,
 * hides the dashboard, and restores the authentication section.
 */
function handleLogout() {
    // Mark the active user offline before leaving the dashboard
    if (typeof getCurrentUserEmail === 'function' && typeof setUserOffline === 'function') {
        const email = getCurrentUserEmail();
        if (email) setUserOffline(email);
    }

    // Clear the stored role and reset all UI restrictions
    localStorage.removeItem('lisCurrentRole');
    if (typeof applyRoleRestrictions === 'function') {
        applyRoleRestrictions(null); // null → remove all restrictions
    }

    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-section').style.display = 'flex';
}
