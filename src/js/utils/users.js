/**
 * Users Panel Manager
 * Handles rendering of registered user profiles with live online/offline status.
 * Status is persisted in localStorage so it survives page reloads within the same session.
 *
 * Key constants:
 *  - AUTH_USERS_KEY       — list of all registered users (shared with handleLogin.js)
 *  - ONLINE_USERS_KEY     — set of emails currently marked online
 *  - CURRENT_USER_KEY     — email of the user who logged in this session
 */

const ONLINE_USERS_KEY = 'lisOnlineUsers';
const CURRENT_USER_KEY = 'lisCurrentUser';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Returns the Set of emails currently flagged as online.
 * @returns {Set<string>}
 */
function getOnlineSet() {
    try {
        const raw = localStorage.getItem(ONLINE_USERS_KEY);
        return new Set(JSON.parse(raw || '[]'));
    } catch {
        return new Set();
    }
}

/**
 * Persists the online-set back to localStorage.
 * @param {Set<string>} set
 */
function saveOnlineSet(set) {
    localStorage.setItem(ONLINE_USERS_KEY, JSON.stringify([...set]));
}

/**
 * Marks a user's email as online and re-renders the panel.
 * @param {string} email
 */
function setUserOnline(email) {
    if (!email) return;
    
    // On a local-storage based system, only one user can be truly 'online' per browser.
    // We clear the set first to remove any 'ghost' sessions from previous users.
    const set = getOnlineSet(); 
    set.add(email);
    
    saveOnlineSet(set);
    localStorage.setItem(CURRENT_USER_KEY, email);
    renderUsersPanel();
}

/**
 * Marks a user's email as offline and re-renders the panel.
 * Also clears the session's current-user key.
 * @param {string} email
 */
function setUserOffline(email) {
    if (!email) return;
    const set = getOnlineSet();
    set.delete(email);
    saveOnlineSet(set);
    localStorage.removeItem(CURRENT_USER_KEY);
    renderUsersPanel();
}

/**
 * Returns the email stored as the current session's user (if any).
 * @returns {string|null}
 */
function getCurrentUserEmail() {
    return localStorage.getItem(CURRENT_USER_KEY) || null;
}

/**
 * Generates 1-2 letter avatar initials from a full name.
 * Falls back to the first letter of the email if name is missing.
 * @param {string} fullName
 * @param {string} email
 * @returns {string}
 */
function getInitials(fullName, email) {
    if (fullName && fullName.trim()) {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (email || '?')[0].toUpperCase();
}

/**
 * Picks a deterministic avatar background color based on the email string.
 * @param {string} email
 * @returns {string} CSS color value
 */
function avatarColor(email) {
    const palette = [
        '#2563eb', '#7c3aed', '#0891b2', '#059669',
        '#d97706', '#dc2626', '#db2777', '#65a30d'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = (hash * 31 + email.charCodeAt(i)) | 0;
    }
    return palette[Math.abs(hash) % palette.length];
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                           */
/* ------------------------------------------------------------------ */

/**
 * Renders the full users panel inside #usersList.
 * Called after any status change or on DOMContentLoaded.
 */
function renderUsersPanel() {
    const container = document.getElementById('usersList');
    const countEl = document.getElementById('usersOnlineCount');
    if (!container) return;

    // Retrieve user registry (written by handleLogin.js)
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem('lisAuthUsers') || '[]');
    } catch {
        users = [];
    }

    const onlineSet = getOnlineSet();
    const onlineCount = [...onlineSet].filter(e =>
        users.some(u => u.email === e)
    ).length;

    if (countEl) {
        countEl.textContent = onlineCount > 0
            ? `${onlineCount} Online`
            : 'All Offline';
        countEl.className = onlineCount > 0
            ? 'users-count-badge online'
            : 'users-count-badge';
    }

    if (users.length === 0) {
        container.innerHTML = `
            <p class="users-empty-hint">
                <i class="fas fa-user-slash"></i>
                No registered users yet.
            </p>`;
        return;
    }

    // Sort: online users first, then alphabetically by name/email
    const sorted = [...users].sort((a, b) => {
        const aOnline = onlineSet.has(a.email) ? 0 : 1;
        const bOnline = onlineSet.has(b.email) ? 0 : 1;
        if (aOnline !== bOnline) return aOnline - bOnline;
        return (a.fullName || a.email).localeCompare(b.fullName || b.email);
    });

    container.innerHTML = sorted.map(user => {
        const isOnline = onlineSet.has(user.email);
        const initials = getInitials(user.fullName, user.email);
        const color = avatarColor(user.email);
        const displayName = user.fullName || user.email.split('@')[0];
        const statusLabel = isOnline ? 'Online' : 'Offline';

        // Role pill
        const role = user.role || 'Faculty';
        const roleIcon = role === 'Student' ? 'fa-user-graduate' : 'fa-chalkboard-teacher';
        const roleColor = role === 'Student' ? '#60a5fa' : '#fbbf24';
        const rolePill = `<span class="user-role-pill" style="color:${roleColor};border-color:${roleColor}20;background:${roleColor}12;">
                            <i class="fas ${roleIcon}" style="font-size:0.6rem;"></i> ${role}
                          </span>`;

        return `
            <div class="user-row ${isOnline ? 'user-row--online' : ''}">
                <div class="user-avatar-wrap">
                    <div class="user-avatar-initials" style="background:${color}">
                        ${initials}
                    </div>
                    <span class="user-status-dot ${isOnline ? 'dot--online' : 'dot--offline'}"
                          title="${statusLabel}"></span>
                </div>
                <div class="user-info">
                    <span class="user-display-name" title="${user.email}">${displayName}</span>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="user-status-label ${isOnline ? 'label--online' : 'label--offline'}">
                            <i class="fas fa-circle" style="font-size:0.45rem;"></i>
                            ${statusLabel}
                        </span>
                        ${rolePill}
                    </div>
                </div>
            </div>`;
    }).join('');
}

/* ------------------------------------------------------------------ */
/*  Presence tracking                                                   */
/* ------------------------------------------------------------------ */

/**
 * Sets up visibility + beforeunload listeners so the current user's
 * status is automatically toggled when they hide / close the tab.
 *
 * We use a sessionStorage flag ('lisPageRefreshing') to distinguish between
 * a page REFRESH (tab stays alive → keep session) and a true tab CLOSE
 * (session should end → mark offline).
 *
 * Flow:
 *  - beforeunload  → set the flag, then mark offline (optimistic clear)
 *  - DOMContentLoaded → if flag is set, it was a refresh → restore session
 *                        then clear the flag
 */
function initPresenceTracking() {
    const email = getCurrentUserEmail();

    // Tab / window closed or refreshed — mark offline optimistically
    window.addEventListener('beforeunload', () => {
        const cur = getCurrentUserEmail();
        if (cur) {
            // Set a flag so we can detect a refresh on next load
            sessionStorage.setItem('lisPageRefreshing', '1');
            setUserOffline(cur);
        }
    });

    // If we're coming back from a refresh, the sessionStorage flag will be set.
    // Restore the online status and re-show the dashboard.
    const isRefresh = sessionStorage.getItem('lisPageRefreshing') === '1';
    if (isRefresh) {
        sessionStorage.removeItem('lisPageRefreshing');
        // The role and user were stored before beforeunload cleared them,
        // but setUserOffline already removed CURRENT_USER_KEY.
        // Re-read from the persisted role key and restore the session.
        const storedRole = localStorage.getItem('lisCurrentRole');
        const storedOnlineUsers = (() => {
            try { return JSON.parse(localStorage.getItem(ONLINE_USERS_KEY) || '[]'); } catch { return []; }
        })();
        // Try to recover the email from the registered users list + role
        const allUsers = (() => {
            try { return JSON.parse(localStorage.getItem('lisAuthUsers') || '[]'); } catch { return []; }
        })();
        // Find the most recently logged-in user matching the stored role
        const lastUser = allUsers
            .filter(u => u.role === storedRole && u.lastLogin)
            .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))[0];

        if (lastUser && storedRole) {
            // Restore the session silently (set online without re-rendering login)
            const set = getOnlineSet();
            set.add(lastUser.email);
            saveOnlineSet(set);
            localStorage.setItem(CURRENT_USER_KEY, lastUser.email);
        }
    } else if (email) {
        // Normal load where email was already present — mark online
        setUserOnline(email);
    }

    // Cross-tab Synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === ONLINE_USERS_KEY || e.key === 'lisAuthUsers') {
            renderUsersPanel();
        }
    });
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                           */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    renderUsersPanel();
    initPresenceTracking();
});
