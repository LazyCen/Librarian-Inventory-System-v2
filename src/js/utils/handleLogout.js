function handleLogout() {
    console.log('Logout initiated...');
    
    try {
        // Clear session data
        // Mark as offline in the global status tracker
        const currentEmail = localStorage.getItem('lisCurrentUser');
        if (currentEmail && typeof setUserOffline === 'function') {
            setUserOffline(currentEmail);
        }

        localStorage.removeItem('lisCurrentRole');
        localStorage.removeItem('lisCurrentUser');

        // Record Logout History
        if (currentEmail) {
            try {
                const loginHistory = JSON.parse(localStorage.getItem('lisLoginHistory') || '[]');
                loginHistory.unshift({
                    email: currentEmail,
                    action: 'logout',
                    time: new Date().toISOString(),
                    ip: '127.0.0.1',
                    device: 'Desktop Browser'
                });
                localStorage.setItem('lisLoginHistory', JSON.stringify(loginHistory.slice(0, 500)));
            } catch(e) {}
        }

        // Reset UI to initial role selection state
        const mainApp = document.getElementById('main-app');
        const authSection = document.getElementById('auth-section');
        const roleSelector = document.getElementById('roleSelector');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (mainApp) mainApp.classList.add('hidden');
        if (authSection) authSection.style.display = 'flex';
        
        if (roleSelector) roleSelector.style.display = 'flex';
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'none';

        const booksLayer = document.getElementById('booksLayer');
        if (booksLayer) booksLayer.style.display = 'block';

        // Attempt to call role restriction reset if it exists
        if (typeof applyRoleRestrictions === 'function') {
            applyRoleRestrictions(null);
        }

        console.log('Logout successful');
    } catch (err) {
        console.error('Logout failed:', err);
        // Emergency fallback: force reload
        window.location.reload();
    }
}
