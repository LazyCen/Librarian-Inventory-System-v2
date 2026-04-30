/**
 * Main JavaScript Entry Point
 * This file initializes the application and manages core state and view switching
 */

// Global state variables
let inventory = {}; // Stores all inventory items
let bins = ["Books", "Added", "Borrowed", "Returned"]; // Available bin statuses

let currentView = 'dashboard'; // Tracks the active view
let currentQuery = '';
let activeTagFilter = '';
let activeBinFilter = '';
let sortMode = 'newest';
let editingItemName = null;
let pendingConfirmAction = null;
let requests = {}; // Stores book access requests

// Advanced filters
let activeSubjectFilter = '';
let activeYearFilter = '';
let activeAvailabilityFilter = '';
let activeFacultyRecFilter = '';

/**
 * Initialize the application when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('Librarian Inventory System Initialized');

    // Load saved data from browser's local storage
    inventory = StorageManager.loadInventory();
    requests = StorageManager.loadRequests();

    // Render the initial view
    renderListView();
    if (typeof renderBinStatus === 'function') renderBinStatus();
    renderTagList();
    switchView('dashboard');
    updateFilterButtonLabel();
    populateFilterOptions();
    updateRequestBadge();

    // Check for existing session to prevent jumping back to login on refresh.
    // lisCurrentRole persists across refreshes; lisCurrentUser may be restored
    // by users.js's initPresenceTracking() when it detects a refresh via sessionStorage.
    const storedUser = localStorage.getItem('lisCurrentUser');
    const storedRole = localStorage.getItem('lisCurrentRole');

    // A valid session exists if we have a role stored (set only on login, cleared only on logout)
    if (storedRole) {
        console.log('Session detected. Restoring dashboard access...');
        
        const authSection = document.getElementById('auth-section');
        const mainApp = document.getElementById('main-app');
        const booksLayer = document.getElementById('booksLayer');

        if (authSection) authSection.style.display = 'none';
        if (booksLayer) booksLayer.style.display = 'none';
        if (mainApp) mainApp.classList.remove('hidden');

        // Apply role restrictions
        if (typeof applyRoleRestrictions === 'function') {
            applyRoleRestrictions(storedRole);
        }
    }

    // Set up form submission handler for adding items
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            if (typeof handleAddItem === 'function') handleAddItem(e);
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.getElementById('addItemModal')?.classList.contains('hidden')) {
            if (typeof closeAddItemModal === 'function') closeAddItemModal();
            return;
        }
        if (event.key === 'Escape' && !document.getElementById('confirmModal')?.classList.contains('hidden')) {
            closeConfirmModal();
        }
        if (event.key === 'Escape') {
            toggleMobileSidebar(false);
        }
    });

    const confirmOverlay = document.getElementById('confirmModal');
    if (confirmOverlay) {
        confirmOverlay.addEventListener('click', (event) => {
            if (event.target === confirmOverlay) {
                closeConfirmModal();
            }
        });
    }

    // Mobile Sidebar Toggles
    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => toggleMobileSidebar(true));
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => toggleMobileSidebar(false));
    }

    console.log('Application ready');
});

/**
 * Toggle the mobile sidebar drawer and overlay
 * @param {boolean} open - Whether to open or close
 */
function toggleMobileSidebar(open) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    if (open) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        document.body.style.overflow = '';
    }
}

// Core functions for inventory management

/**
 * Calculate multi-dimensional statistics about the current inventory
 * @returns {Object} { tagCounts: {}, statusCounts: {}, totalBooks: number }
 */
function getInventoryStats() {
    const stats = {
        tagCounts: {},
        statusCounts: {},
        totalBooks: 0
    };

    // Initialize statusCounts with all defined bins
    bins.forEach(bin => {
        stats.statusCounts[bin] = 0;
    });

    const items = Object.values(inventory);
    stats.totalBooks = items.length;

    items.forEach(item => {
        // Tag stats
        if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => {
                stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
            });
        }

        // Status stats
        const bin = InventoryHelpers.getEffectiveBin(item);
        if (stats.statusCounts.hasOwnProperty(bin)) {
            stats.statusCounts[bin]++;
        } else {
            // Fallback for safety
            stats.statusCounts['Added'] = (stats.statusCounts['Added'] || 0) + 1;
        }
    });

    return stats;
}

/**
 * Switch between different views
 * @param {string} view - The view to switch to
 */
function switchView(view) {
    console.log(`Switching to ${view} view`);

    // Role-based view restrictions
    const currentRole = localStorage.getItem('lisCurrentRole');
    if (view === 'bins' && currentRole === 'Student') {
        console.warn('Student role: Bins Status view is restricted. Redirecting to dashboard.');
        view = 'dashboard';
    }
    if (view === 'history' && currentRole === 'Faculty') {
        console.warn('Faculty role: Reading History view is restricted. Redirecting to dashboard.');
        view = 'dashboard';
    }

    // Hide all view contents
    document.querySelectorAll('.view-content').forEach(el => {
        el.classList.add('hidden');
    });

    // Handle sidebar active states
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });

    // Update sidebar active link
    const navMapping = {
        list: 'Books',
        bins: 'Bins Status',
        dashboard: window.innerWidth <= 768 ? 'Home' : 'Dashboard',
        history: 'Reading History'
    };
    const activeNavText = navMapping[view] || 'Inventory';
    document.querySelectorAll('.nav-item[data-view]').forEach(nav => {
        if (nav.dataset.view === view) {
            nav.classList.add('active');
        }
    });

    // Show selected view
    currentView = view;
    const viewElement = document.getElementById(`view-${view}`);
    if (viewElement) {
        viewElement.classList.remove('hidden');
        if (typeof gsap !== 'undefined') {
            gsap.from(viewElement, {
                duration: 0.5,
                opacity: 0,
                y: 15,
                ease: "power2.out"
            });
        } else {
            viewElement.classList.add('fade-in');
        }
    }

    // Handle sort button visibility
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        if (view === 'dashboard' || view === 'bins') {
            filterBtn.classList.add('hidden');
        } else {
            filterBtn.classList.remove('hidden');
        }
    }

    // Update Title
    const titleElement = document.getElementById('currentViewTitle');
    if (titleElement) {
        titleElement.textContent = activeNavText || 'Inventory';
    }

    if (view === 'list') renderListView(getFilteredEntries(), currentQuery);
    if (view === 'bins' && typeof renderBinStatus === 'function') renderBinStatus();
    if (view === 'dashboard') renderDashboardView();
    if (view === 'requests') renderRequestsView();
    if (view === 'history' && typeof renderReadingHistory === 'function') renderReadingHistory();
    
    // Auto-close mobile sidebar after switching
    toggleMobileSidebar(false);

    // Refresh users panel status
    if (typeof renderUsersPanel === 'function') renderUsersPanel();
}

/**
 * Render the detailed dashboard view with stats and chart
 */
function renderDashboardView() {
    const stats = getInventoryStats();
    const totalBooks = stats.totalBooks;
    const { tagCounts, statusCounts } = stats;

    const tagData = Object.entries(tagCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
        
    // Use all active categories for the donut chart
    const totalTagTransactions = tagData.reduce((acc, [, count]) => acc + count, 0);

    // Animate Stats Cards numbers using GSAP
    const animateStat = (elementId, targetValue) => {
        const el = document.getElementById(elementId);
        if (el && typeof gsap !== 'undefined') {
            gsap.fromTo(el, 
                { innerHTML: 0 }, 
                {
                    innerHTML: targetValue,
                    duration: 1.5,
                    snap: { innerHTML: 1 },
                    ease: "power2.out",
                    onUpdate: function() {
                        el.textContent = Math.round(this.targets()[0].innerHTML).toLocaleString();
                    }
                }
            );
        } else if (el) {
            el.textContent = targetValue.toLocaleString();
        }
    };

    animateStat('dashTotalBooks', totalBooks);
    animateStat('dashTotalTags', Object.keys(tagCounts).length);
    animateStat('dashTotalBins', bins.length);
    
    const recentCount = Object.values(inventory).filter(item => InventoryHelpers.isRecentDate(item.dateAdded)).length;
    animateStat('dashRecentItems', recentCount);

    // Render Donut Chart & List
    renderDonutChart(tagData, totalTagTransactions);

    // Render Dashboard Borrowed List
    renderDashboardBorrowedList();

    // Render Dashboard Returned List
    renderDashboardReturnedList();
}

/**
 * Render an SVG Donut Chart and its legend
 */
function renderDonutChart(data, total) {
    const svg = document.getElementById('dashDonutChart');
    const list = document.getElementById('dashCategoryList');
    if (!svg || !list) return;

    svg.innerHTML = '';
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted);">Add categories to your books to see the breakdown here.</p>';
        document.getElementById('donutCenterText').textContent = 'No categories';
        document.getElementById('donutCenterSub').textContent = 'Waiting for book tags';
        return;
    }

    const colors = [
        '#3b82f6', '#22c55e', '#ef4444', '#f97316', 
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
        '#f59e0b', '#10b981', '#6366f1', '#a855f7'
    ]; 
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    data.forEach(([label, count], i) => {
        const dashArray = (count / total) * circumference;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "donut-segment");
        circle.setAttribute("data-label", label);
        circle.setAttribute("data-index", i.toString());
        circle.setAttribute("cx", "100");
        circle.setAttribute("cy", "100");
        circle.setAttribute("r", radius.toString());
        circle.setAttribute("stroke", colors[i % colors.length]);
        circle.setAttribute("stroke-dasharray", `${dashArray} ${circumference - dashArray}`);
        circle.setAttribute("stroke-dashoffset", circumference.toString()); 
        circle.style.setProperty('--dash-offset', (-currentOffset).toString());
        circle.onmouseenter = () => highlightCategory(label, true);
        circle.onmouseleave = () => highlightCategory(label, false);
        circle.onclick = () => filterByTag(label);
        svg.appendChild(circle);

        const targetOffset = -currentOffset;
        
        if (typeof gsap !== 'undefined') {
            gsap.to(circle, {
                strokeDashoffset: targetOffset,
                duration: 1.2,
                ease: "power2.out",
                delay: i * 0.1
            });
        } else {
            setTimeout(() => {
                circle.setAttribute("stroke-dashoffset", targetOffset.toString());
            }, 50 * i);
        }

        currentOffset += dashArray;

        const color = colors[i % colors.length];
        list.innerHTML += `
            <div class="category-item clickable" 
                 data-label="${label}" 
                 data-index="${i}"
                 onmouseenter="highlightCategory('${label}', true)"
                 onmouseleave="highlightCategory('${label}', false)"
                 onclick="filterByTag('${label}')">
                <div class="category-info">
                    <div class="category-bullet" style="background: ${color}; box-shadow: 0 0 10px ${color}80;"></div>
                    <div class="category-details">
                        <span class="category-name">${label}</span>
                        <span class="category-sub">Total Books</span>
                    </div>
                </div>
                <div class="category-percent">${count.toLocaleString()}</div>
            </div>
        `;

        if (i === 0) {
            const iconEl = document.getElementById('donutCenterIcon');
            if (iconEl) iconEl.innerHTML = '';

            document.getElementById('donutCenterText').textContent = label;
            document.getElementById('donutCenterSub').textContent = `${count.toLocaleString()} Total Books`;
        }
    });
}

function highlightCategory(label, active) {
    const segments = document.querySelectorAll(`.donut-segment[data-label="${label}"]`);
    const listItems = document.querySelectorAll(`.category-item[data-label="${label}"]`);

    segments.forEach(el => {
        if (active) el.classList.add('highlighted');
        else el.classList.remove('highlighted');
    });

    listItems.forEach(el => {
        if (active) el.classList.add('highlighted');
        else el.classList.remove('highlighted');
    });
}

function renderDashboardBorrowedList() {
    const container = document.getElementById('dashBorrowedList');
    if (!container) return;

    const borrowedItems = Object.entries(inventory).filter(([, details]) => details.isBorrowed);

    if (borrowedItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); border: 2px dashed #f1f5f9; border-radius: 12px;">
                <p>No books currently borrowed. Everything is in stock!</p>
            </div>
        `;
        return;
    }

    const currentRole = localStorage.getItem('lisCurrentRole');
    const isStudent = currentRole === 'Student';

    container.innerHTML = `
        <div class="dash-borrowed-grid">
            ${borrowedItems.map(([name, details], index) => {
        const bookId = details.id || 'N/A';
        return `
                    <div class="dash-borrowed-item" style="animation-delay: ${index * 0.1}s">
                        <div class="dash-borrowed-id">
                            #${bookId}
                        </div>
                        <div class="dash-borrowed-info">
                            <div class="dash-borrowed-name">${name}</div>
                            <div class="dash-borrowed-meta">
                                ${details.borrower || 'Unknown'}
                            </div>
                        </div>
                        ${!isStudent ? `
                        <button class="btn-manage" onclick="openEditItemModal('${name.replace(/'/g, "\\'")}')">
                            Manage
                        </button>` : ''}
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function renderDashboardReturnedList() {
    const container = document.getElementById('dashReturnedList');
    if (!container) return;

    const returnedItems = Object.entries(inventory).filter(([, details]) => details.bin === 'Returned');

    if (returnedItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); border: 2px dashed #f1f5f9; border-radius: 12px;">
                <p>No books recently returned yet.</p>
            </div>
        `;
        return;
    }

    const currentRole = localStorage.getItem('lisCurrentRole');
    const isStudent = currentRole === 'Student';

    container.innerHTML = `
        <div class="dash-returned-grid">
            ${returnedItems.map(([name, details], index) => {
                const bookId = details.id || 'N/A';
                return `
                    <div class="dash-returned-item" style="animation-delay: ${index * 0.1}s">
                        <div class="dash-returned-id">
                            #${bookId}
                        </div>
                        <div class="dash-returned-info">
                            <div class="dash-returned-name">${name}</div>
                            <div class="dash-returned-meta">
                                ${details.returner || 'Unknown'}
                            </div>
                        </div>
                        ${!isStudent ? `
                        <button class="btn-manage" onclick="openEditItemModal('${name.replace(/'/g, "\\'")}')">
                            Manage
                        </button>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function showMessage(message, type = 'info', duration = 3000, position = 'top') {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;

    messageBox.className = `fade-in msg-${type} at-${position}`;
    messageBox.innerText = message;
    messageBox.classList.remove('hidden');

    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, duration);
}

function openConfirmModal(message, onConfirm) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    if (!confirmModal || !confirmMessage) return;
    confirmMessage.innerText = message;
    pendingConfirmAction = typeof onConfirm === 'function' ? onConfirm : null;
    confirmModal.classList.remove('hidden');

    if (typeof gsap !== 'undefined') {
        const confirmCard = confirmModal.querySelector('.confirm-card');
        if (confirmCard) {
            gsap.fromTo(confirmCard,
                { opacity: 0, scale: 0.9, y: 20 },
                { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" }
            );
        }
    }
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (!confirmModal) return;
    confirmModal.classList.add('hidden');
    pendingConfirmAction = null;
}

function confirmModalAccept() {
    const action = pendingConfirmAction;
    closeConfirmModal();
    if (typeof action === 'function') {
        action();
    }
}

function handleSearch() {
    const query = document.getElementById('searchQuery').value.trim().toLowerCase();
    currentQuery = query;
    const results = getFilteredEntries();
    if (query && currentView !== 'list') {
        switchView('list');
        return;
    }
    renderListView(results, query);
}

function renderListView(itemsToRender = null, query = "", targetContainerId = 'inventoryList', targetCountId = 'itemCount') {
    const container = document.getElementById(targetContainerId);
    const countElement = document.getElementById(targetCountId);
    if (!container) return;

    const items = itemsToRender || getFilteredEntries();
    if (countElement) countElement.textContent = `${items.length} Titles`;

    if (items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
                <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.2; margin-bottom: 16px;"></i>
                <p>No catalog titles found matching "${query}"</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(([name, details]) => {
        const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const date = InventoryHelpers.formatDisplayDate(details.dateAdded);
        const categoryCount = details.tags.length;
        const tagBadges = details.tags.length > 0
            ? details.tags.slice(0, 3).map((tag) => `<span class="card-side-tag">${tag}</span>`).join('')
            : '<span class="card-side-tag muted">uncategorized</span>';

        const authorHtml = details.author ? `<div class="card-author">by ${details.author}</div>` : '';

        let actionHtml = '';
        if (details.isBorrowed && details.borrower) {
            actionHtml = `<div class="card-meta" style="color: var(--text-main); font-weight: 600;"><i class="fas fa-user-tag" style="color: #f59e0b;"></i> Borrowed by: ${details.borrower}</div>`;
        } else if (details.bin === 'Returned' && details.returner) {
            actionHtml = `<div class="card-meta" style="color: var(--text-main); font-weight: 600;"><i class="fas fa-undo" style="color: #22c55e;"></i> Returned by: ${details.returner}</div>`;
        }

        const facultyRecHtml = details.facultyRec 
            ? `<div class="faculty-rec-badge">Faculty Recommended</div>` 
            : '';

        let statusBadge = '';
        let cardClass = '';
        if (details.isBorrowed) {
            statusBadge = '<span class="borrowed-badge">BORROWED</span>';
            cardClass = 'borrowed-item';
        } else if (details.bin === 'Returned') {
            statusBadge = '<span class="returned-badge">RETURNED</span>';
            cardClass = 'returned-item';
        }

        const bookId = details.id || 'N/A';
        const currentRole = localStorage.getItem('lisCurrentRole');
        const isStudent = currentRole === 'Student';
        const isRestricted = details.isRestricted || false;
        
        const currentUser = localStorage.getItem('lisCurrentUser') || localStorage.getItem('lisCurrentRole') || 'Anonymous Student';
        
        const hasPendingRequest = Object.values(requests).some(r => r.bookTitle === name && r.studentId === currentUser && r.status === 'Pending');
        const isApproved = Object.values(requests).some(r => r.bookTitle === name && r.studentId === currentUser && r.status === 'Approved');

        let restrictedActionHtml = '';
        if (isStudent) {
            if (!isRestricted || isApproved) {
                restrictedActionHtml = `<div style="display:flex; flex-direction:column; gap:8px;">
                    ${isRestricted ? `<div class="status-badge status-approved">Access Granted</div>` : ''}
                    <button class="btn-primary" style="width: 100%; justify-content: center; background: #2563eb;" onclick="openPDFReader('${safeName}')">
                        Read Online
                    </button>
                </div>`;
            } else if (hasPendingRequest) {
                restrictedActionHtml = `<div class="status-badge status-pending">
                    Request Pending
                </div>`;
            } else {
                restrictedActionHtml = `<button class="btn-request" onclick="submitAccessRequest('${safeName}')">
                    Request Access
                </button>`;
            }
        }

        const showManagement = !isStudent;

        return `
            <div class="item-card ${cardClass}">
                ${showManagement ? `
                <div class="card-options" onclick="openEditItemModal('${safeName}')">
                    <i class="fas fa-pen"></i>
                </div>` : ''}
                <div class="card-icon">#${bookId}</div>
                <div class="card-updates">
                  Catalog record ${statusBadge}
                  ${isRestricted ? '<span class="status-badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);">Restricted</span>' : ''}
                  ${facultyRecHtml}
                </div>
                <h4 class="card-title">${name}</h4>
                ${authorHtml}
                <div class="card-body-row">
                    <div class="card-main-meta">
                        <div class="card-meta">Added ${date}</div>
                        ${details.year ? `<div class="card-meta">Published: ${details.year}</div>` : ''}
                        ${details.department ? `<div class="card-meta">Dept: ${details.department}</div>` : ''}
                        <div class="card-meta">Container/Status: ${details.bin}</div>
                        <div class="card-meta">${categoryCount} categories</div>
                        ${actionHtml}
                    </div>
                    <div class="card-side-tags">
                        ${tagBadges}
                    </div>
                </div>
                ${isStudent ? `
                <div class="card-footer">
                    ${restrictedActionHtml}
                </div>` : ''}
                ${showManagement ? `
                <div class="card-footer" style="display: flex; gap: 8px;">
                    <button class="btn-secondary" style="padding: 8px 10px; font-size: 0.8rem; flex: 1; justify-content: center;" onclick="openEditItemModal('${safeName}')">
                        <i class="fas fa-pen"></i> Update
                    </button>
                    <button class="btn-secondary btn-delete" style="padding: 8px 10px; font-size: 0.8rem; flex: 1; justify-content: center;" onclick="deleteItem('${safeName}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>` : ''}
            </div>
        `;
    }).join('');

    if (typeof gsap !== 'undefined') {
        const cards = container.querySelectorAll('.item-card');
        const cardsToAnimate = Array.from(cards).slice(0, 30); // Optimize for large lists
        gsap.from(cardsToAnimate, {
            duration: 0.6,
            y: 30,
            opacity: 0,
            stagger: 0.05,
            ease: "back.out(1.2)",
            clearProps: "all"
        });
    }
}

function renderTagList() {
    const container = document.getElementById('tagList');
    const totalUpdatesElement = document.getElementById('totalUpdates');
    if (!container) return;

    const { tagCounts } = getInventoryStats();
    const tags = Object.keys(tagCounts).sort();

    if (totalUpdatesElement) {
        totalUpdatesElement.textContent = `${tags.length} Active`;
    }

    if (tags.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No categories defined yet.</p>';
        return;
    }

    container.innerHTML = tags.map(tag => `
        <div class="tag-item ${activeTagFilter === tag ? 'active' : ''}" onclick="filterByTag('${tag}')">
            <div class="tag-name-wrapper">
                <div class="tag-bullet"></div>
                <span class="tag-name">${tag}</span>
            </div>
            <span class="tag-options">${tagCounts[tag]}</span>
        </div>
    `).join('');
}

function filterByTag(tag) {
    activeTagFilter = activeTagFilter === tag ? '' : tag;
    activeBinFilter = '';
    const queryInput = document.getElementById('searchQuery');
    if (queryInput) {
        queryInput.value = activeTagFilter;
        currentQuery = activeTagFilter;
    }
    switchView('list');
    renderListView(getFilteredEntries(), currentQuery);
    renderTagList();
}

function getFilteredEntries() {
    let entries = Object.entries(inventory);
    if (currentQuery) {
        entries = entries.filter(([name, details]) =>
            name.toLowerCase().includes(currentQuery) ||
            (details.tags && details.tags.some(tag => tag.includes(currentQuery))) ||
            (details.id && details.id.toString().includes(currentQuery)) ||
            (details.author && details.author.toLowerCase().includes(currentQuery)) ||
            (details.borrower && details.borrower.toLowerCase().includes(currentQuery)) ||
            (details.isbn && details.isbn.toLowerCase().includes(currentQuery)) ||
            (details.department && details.department.toLowerCase().includes(currentQuery)) ||
            (details.keywords && details.keywords.toLowerCase().includes(currentQuery))
        );
    }
    if (activeTagFilter) {
        entries = entries.filter(([, details]) => details.tags && details.tags.includes(activeTagFilter));
    }
    if (activeBinFilter) {
        if (activeBinFilter === 'Books') {
            entries = entries.filter(([, details]) => InventoryHelpers.getEffectiveBin(details) !== 'Added');
        } else {
            entries = entries.filter(([, details]) => InventoryHelpers.getEffectiveBin(details) === activeBinFilter);
        }
    } else {
        entries = entries.filter(([, details]) => InventoryHelpers.getEffectiveBin(details) !== 'Added');
    }

    if (activeSubjectFilter) entries = entries.filter(([, details]) => details.subject === activeSubjectFilter);
    if (activeYearFilter) entries = entries.filter(([, details]) => details.year === activeYearFilter);
    if (activeAvailabilityFilter) {
        if (activeAvailabilityFilter === 'available') entries = entries.filter(([, details]) => !details.isBorrowed);
        else if (activeAvailabilityFilter === 'borrowed') entries = entries.filter(([, details]) => details.isBorrowed);
    }
    if (activeFacultyRecFilter === 'yes') entries = entries.filter(([, details]) => details.facultyRec);

    return sortEntries(entries);
}

function handleAdvancedFilter() {
    activeSubjectFilter = document.getElementById('filterSubject')?.value || '';
    activeYearFilter = document.getElementById('filterYear')?.value || '';
    activeAvailabilityFilter = document.getElementById('filterAvailability')?.value || '';
    activeFacultyRecFilter = document.getElementById('filterFacultyRec')?.value || '';
    renderListView(getFilteredEntries(), currentQuery);
}

function resetAdvancedFilters() {
    activeSubjectFilter = ''; activeYearFilter = ''; activeAvailabilityFilter = ''; activeFacultyRecFilter = '';
    if (document.getElementById('filterSubject')) document.getElementById('filterSubject').value = '';
    if (document.getElementById('filterYear')) document.getElementById('filterYear').value = '';
    if (document.getElementById('filterAvailability')) document.getElementById('filterAvailability').value = '';
    if (document.getElementById('filterFacultyRec')) document.getElementById('filterFacultyRec').value = '';
    renderListView(getFilteredEntries(), currentQuery);
}

function populateFilterOptions() {
    const subjectSelect = document.getElementById('filterSubject');
    const yearSelect = document.getElementById('filterYear');
    if (!subjectSelect || !yearSelect) return;
    const subjects = new Set(); const years = new Set();
    Object.values(inventory).forEach(item => {
        if (item.subject) subjects.add(item.subject);
        if (item.year) years.add(item.year);
    });
    const currentSubject = subjectSelect.value;
    subjectSelect.innerHTML = '<option value="">All Subjects</option>';
    Array.from(subjects).sort().forEach(sub => { subjectSelect.innerHTML += `<option value="${sub}">${sub}</option>`; });
    subjectSelect.value = currentSubject;
    const currentYear = yearSelect.value;
    yearSelect.innerHTML = '<option value="">All Years</option>';
    Array.from(years).sort((a, b) => b - a).forEach(year => { yearSelect.innerHTML += `<option value="${year}">${year}</option>`; });
    yearSelect.value = currentYear;
}

function sortEntries(entries) {
    const sorted = [...entries];
    if (sortMode === 'name') sorted.sort((a, b) => a[0].localeCompare(b[0]));
    else if (sortMode === 'oldest') sorted.sort((a, b) => InventoryHelpers.getDateValue(a[1].dateAdded) - InventoryHelpers.getDateValue(b[1].dateAdded));
    else sorted.sort((a, b) => InventoryHelpers.getDateValue(b[1].dateAdded) - InventoryHelpers.getDateValue(a[1].dateAdded));
    return sorted;
}

function cycleSortMode() {
    const modes = ['newest', 'oldest', 'name'];
    sortMode = modes[(modes.indexOf(sortMode) + 1) % modes.length];
    updateFilterButtonLabel();
    renderListView(getFilteredEntries(), currentQuery);
    showMessage(`Sorted by ${sortMode}`, 'info', 1500);
}

function updateFilterButtonLabel() {
    const button = document.getElementById('filterBtn');
    if (!button) return;
    const labels = { newest: 'Sort: Newest', oldest: 'Sort: Oldest', name: 'Sort: Name' };
    button.innerHTML = `<i class="fas fa-filter"></i> ${labels[sortMode]}`;
}

function resetFilters() {
    currentQuery = ''; activeTagFilter = ''; activeBinFilter = '';
    const queryInput = document.getElementById('searchQuery');
    if (queryInput) queryInput.value = '';
    renderTagList(); renderListView(getFilteredEntries(), currentQuery);
}

function showAllItems() { resetFilters(); switchView('list'); }
function focusTopTagFromDashboard() {
    const { tagCounts } = getInventoryStats();
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topTag) { showMessage('No tags available yet', 'info'); return; }
    filterByTag(topTag);
}

function filterRecentItems() {
    currentQuery = ''; activeTagFilter = ''; activeBinFilter = '';
    const recentEntries = Object.entries(inventory).filter(([, details]) => InventoryHelpers.isRecentDate(details.dateAdded));
    switchView('list'); renderListView(sortEntries(recentEntries), 'recent');
}

function filterByBin(bin) {
    activeBinFilter = bin; activeTagFilter = ''; currentQuery = '';
    const queryInput = document.getElementById('searchQuery');
    if (queryInput) queryInput.value = '';
    switchView('list'); renderListView(getFilteredEntries(), '');
    showMessage(`Showing titles from container ${bin}`, 'info', 1500);
}

function renderRequestsView() {
    const container = document.getElementById('requestsList');
    if (!container) return;
    const currentRole = localStorage.getItem('lisCurrentRole');
    const isStudent = currentRole === 'Student';
    const currentUser = localStorage.getItem('lisCurrentUser') || localStorage.getItem('lisCurrentRole') || 'Anonymous Student';
    const filter = document.getElementById('requestStatusFilter')?.value || 'all';
    let entries = Object.values(requests);
    if (isStudent) entries = entries.filter(r => r.studentId === currentUser);
    if (filter !== 'all') entries = entries.filter(r => r.status === filter);
    entries.sort((a, b) => new Date(b.dateRequested) - new Date(a.dateRequested));
    if (entries.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px; background: rgba(255,255,255,0.03); border-radius: 20px; border: 2px dashed var(--border-color);"><i class="fas fa-paper-plane" style="font-size: 3rem; color: var(--text-muted); opacity: 0.2; margin-bottom: 20px;"></i><h3 style="color: var(--text-main);">No requests found</h3><p style="color: var(--text-muted);">Restricted books will appear here once you request access.</p></div>`;
        return;
    }
    container.innerHTML = entries.map(req => {
        const statusClass = req.status.toLowerCase();
        const date = new Date(req.dateRequested).toLocaleDateString();
        return `<div class="item-card animate-fade-in"><div class="card-updates"><span class="status-badge status-${statusClass}">${req.status}</span></div><h4 class="card-title">${req.bookTitle}</h4><div class="card-meta">Requested by: ${req.studentId}</div><div class="card-meta">${date}</div>${!isStudent && req.status === 'Pending' ? `<div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-color);"><button class="btn-secondary" style="background: #22c55e; color: white; border: none; flex: 1;" onclick="handleRequestUpdate('${req.id}', 'Approved')">Approve</button><button class="btn-secondary" style="background: #ef4444; color: white; border: none; flex: 1;" onclick="handleRequestUpdate('${req.id}', 'Rejected')">Reject</button></div>` : ''}</div>`;
    }).join('');
}

function updateRequestBadge() {
    const badge = document.getElementById('requestBadge');
    const navItem = document.getElementById('navRequests');
    if (!badge || !navItem) return;
    const currentRole = localStorage.getItem('lisCurrentRole');
    const isStudent = currentRole === 'Student';
    const currentUser = localStorage.getItem('lisCurrentUser') || localStorage.getItem('lisCurrentRole') || 'Anonymous Student';
    const label = isStudent ? 'Request' : 'Access Requests';
    navItem.innerHTML = `${label} <span id="requestBadge" class="nav-badge hidden">0</span>`;
    const newBadge = document.getElementById('requestBadge');
    let count = 0;
    if (isStudent) count = Object.values(requests).filter(r => r.studentId === currentUser && r.status !== 'Pending').length;
    else count = Object.values(requests).filter(r => r.status === 'Pending').length;
    if (count > 0 && newBadge) { newBadge.textContent = count; newBadge.classList.remove('hidden'); }
    else if (newBadge) newBadge.classList.add('hidden');
}

