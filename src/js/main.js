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

/**
 * Initialize the application when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('Librarian Inventory System Initialized');

    // Load saved data from browser's local storage
    inventory = StorageManager.loadInventory();

    // Render the initial view
    renderListView();
    renderBinStatus();
    renderTagList();
    switchView('dashboard');
    updateFilterButtonLabel();

    // Set up form submission handler for adding items
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItem);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.getElementById('addItemModal')?.classList.contains('hidden')) {
            closeAddItemModal();
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

    // Students cannot access the Bins view — redirect silently to dashboard
    const currentRole = localStorage.getItem('lisCurrentRole');
    if (view === 'bins' && currentRole === 'Student') {
        console.warn('Student role: Bins Status view is restricted. Redirecting to dashboard.');
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
        dashboard: 'Dashboard'
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
    if (view === 'bins') renderBinStatus();
    if (view === 'dashboard') renderDashboardView();
    
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
    ]; // Expanded palette: Blue, Green, Red, Orange, Purple, Pink, Cyan, Lime, Amber, Emerald, Indigo, Violet
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;



    data.forEach(([label, count], i) => {
        const percent = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
        const dashArray = (count / total) * circumference;

        // SVG Segment
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "donut-segment");
        circle.setAttribute("data-label", label);
        circle.setAttribute("data-index", i.toString());
        circle.setAttribute("cx", "100");
        circle.setAttribute("cy", "100");
        circle.setAttribute("r", radius.toString());
        circle.setAttribute("stroke", colors[i % colors.length]);
        circle.setAttribute("stroke-dasharray", `${dashArray} ${circumference - dashArray}`);
        circle.setAttribute("stroke-dashoffset", circumference.toString()); // Start from full circumference for animation
        circle.style.setProperty('--dash-offset', (-currentOffset).toString());
        circle.onmouseenter = () => highlightCategory(label, true);
        circle.onmouseleave = () => highlightCategory(label, false);
        circle.onclick = () => filterByTag(label);
        svg.appendChild(circle);

        // Track original currentOffset for use inside GSAP
        const targetOffset = -currentOffset;
        
        // Use GSAP to animate stroke-dashoffset
        if (typeof gsap !== 'undefined') {
            gsap.to(circle, {
                strokeDashoffset: targetOffset,
                duration: 1.2,
                ease: "power2.out",
                delay: i * 0.1
            });
        } else {
            // Fallback
            setTimeout(() => {
                circle.setAttribute("stroke-dashoffset", targetOffset.toString());
            }, 50 * i);
        }

        currentOffset += dashArray;

        // List Item
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

        // Update Center text and icon to top status
        if (i === 0) {
            const iconEl = document.getElementById('donutCenterIcon');
            if (iconEl) iconEl.innerHTML = '<i class="fas fa-tag" style="color: var(--primary);"></i>';

            document.getElementById('donutCenterText').textContent = label;
            document.getElementById('donutCenterSub').textContent = `${count.toLocaleString()} Total Books`;
        }
    });
}

/**
 * Highlights a category in both the donut chart and the legend
 * @param {string} label - The category label to highlight
 * @param {boolean} active - Whether to turn highlight on or off
 */
function highlightCategory(label, active) {
    const segments = document.querySelectorAll(`.donut-segment[data-label="${label}"]`);
    const listItems = document.querySelectorAll(`.category-item[data-label="${label}"]`);

    segments.forEach(el => {
        if (active) {
            el.classList.add('highlighted');
        } else {
            el.classList.remove('highlighted');
        }
    });

    listItems.forEach(el => {
        if (active) {
            el.classList.add('highlighted');
        } else {
            el.classList.remove('highlighted');
        }
    });
}

/**
 * Render a simplified list of borrowed books for the dashboard
 */
function renderDashboardBorrowedList() {
    const container = document.getElementById('dashBorrowedList');
    if (!container) return;

    const borrowedItems = Object.entries(inventory).filter(([, details]) => details.isBorrowed);

    if (borrowedItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); border: 2px dashed #f1f5f9; border-radius: 12px;">
                <i class="fas fa-check-circle" style="font-size: 2rem; color: #22c55e; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>No books currently borrowed. Everything is in stock!</p>
            </div>
        `;
        return;
    }

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
                                <i class="fas fa-user-tag"></i> ${details.borrower || 'Unknown'}
                            </div>
                        </div>
                        <button class="btn-manage" onclick="openEditItemModal('${name.replace(/'/g, "\\'")}')">
                            Manage
                        </button>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

/**
 * Render a simplified list of returned books for the dashboard
 */
function renderDashboardReturnedList() {
    const container = document.getElementById('dashReturnedList');
    if (!container) return;

    const returnedItems = Object.entries(inventory).filter(([, details]) => details.bin === 'Returned');

    if (returnedItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); border: 2px dashed #f1f5f9; border-radius: 12px;">
                <i class="fas fa-info-circle" style="font-size: 2rem; color: var(--primary); margin-bottom: 12px; opacity: 0.5;"></i>
                <p>No books recently returned yet.</p>
            </div>
        `;
        return;
    }

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
                                <i class="fas fa-user-check"></i> ${details.returner || 'Unknown'}
                            </div>
                        </div>
                        <button class="btn-manage" onclick="openEditItemModal('${name.replace(/'/g, "\\'")}')">
                            Manage
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}



/**
 * Toggles the borrower name field based on whether the borrowed checkbox is checked
 */
function toggleBorrowerField() {
    const select = document.getElementById('itemBinSelection');
    const isBorrowed = select && select.value === 'Borrowed';
    const isReturned = select && select.value === 'Returned';

    const borrowerGroup = document.getElementById('borrowerFieldGroup');
    const borrowerInput = document.getElementById('itemBorrower');
    if (borrowerGroup) {
        if (isBorrowed) {
            borrowerGroup.classList.remove('hidden');
        } else {
            borrowerGroup.classList.add('hidden');
            if (borrowerInput) borrowerInput.value = ''; // Clear if unchecking
        }
    }

    const returnerGroup = document.getElementById('returnerFieldGroup');
    const returnerInput = document.getElementById('itemReturner');
    if (returnerGroup) {
        if (isReturned) {
            returnerGroup.classList.remove('hidden');
        } else {
            returnerGroup.classList.add('hidden');
            if (returnerInput) returnerInput.value = ''; // Clear if unchecking
        }
    }
}

function setItemFormMode(mode = 'add', itemName = '', currentBin = '') {
    const modalTitle = document.getElementById('itemModalTitle');
    const submitBtn = document.getElementById('itemSubmitBtn');

    const isEditMode = mode === 'edit';
    editingItemName = isEditMode ? itemName : null;

    if (modalTitle) {
        modalTitle.textContent = isEditMode ? 'Update Book' : 'Register New Book';
    }

    if (submitBtn) {
        submitBtn.innerHTML = isEditMode
            ? '<i class="fas fa-pen"></i> Save Changes'
            : 'Add to Catalog';
    }

    // dynamically set options
    const binSelect = document.getElementById('itemBinSelection');
    if (binSelect) {
        if (!isEditMode) {
            binSelect.innerHTML = '<option value="Added">Register</option>';
            binSelect.value = 'Added';
            toggleBorrowerField();
        } else {
            const options = {
                'Books': '<option value="Books">In Library</option><option value="Borrowed">Borrow Book</option><option value="Returned">Returned</option>',
                'Added': '<option value="Added">Added</option><option value="Books">Register Book</option>',
                'Borrowed': '<option value="Borrowed">Currently Borrowed</option><option value="Returned">Returned</option>',
                'Returned': '<option value="Returned">Returned</option><option value="Books">Back to Library</option>'
            };
            binSelect.innerHTML = options[currentBin] || `
                <option value="Books">Books</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Returned">Returned</option>
            `;
        }
    }
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

function handleAddItem(e) {
    e.preventDefault();

    const itemName = document.getElementById('itemName').value.trim();
    const itemAuthor = document.getElementById('itemAuthor').value.trim();
    const itemTags = document.getElementById('itemTags').value.trim();
    const binSelect = document.getElementById('itemBinSelection');
    const selectedBin = binSelect ? binSelect.value : 'Added';
    const isBorrowed = selectedBin === 'Borrowed';
    const itemBorrower = document.getElementById('itemBorrower').value.trim();
    const itemReturnerInput = document.getElementById('itemReturner');
    const itemReturner = itemReturnerInput ? itemReturnerInput.value.trim() : '';

    if (!itemName) {
        showMessage('Please enter a book title', 'error');
        return;
    }

    if (!editingItemName && inventory[itemName]) {
        showMessage('Title already exists in catalog', 'error');
        return;
    }

    const parsedTags = itemTags
        .split(',')
        .map(tag => {
            const t = tag.trim().toLowerCase();
            // Title Case: capitalize first letter of each word and after hyphens
            return t.split(/([- ])/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        })
        .filter(tag => tag.length > 0);

    if (editingItemName) {
        if (itemName !== editingItemName && inventory[itemName]) {
            showMessage('Another title already uses that name', 'error');
            return;
        }

        const existingData = inventory[editingItemName];
        if (!existingData) {
            showMessage('Original title not found', 'error');
            setItemFormMode('add');
            return;
        }

        // Validation: Can't return if not borrowed
        const currentBin = InventoryHelpers.getEffectiveBin(existingData);
        if (selectedBin === 'Returned' && currentBin !== 'Borrowed' && currentBin !== 'Returned') {
            showMessage("You can't returned the book, it is not borrowed", 'error');
            return;
        }

        // Validation: Can't borrow if already borrowed
        if (selectedBin === 'Borrowed' && currentBin === 'Borrowed') {
            showMessage("sorry, this book is already borrowed", 'error');
            return;
        }

        delete inventory[editingItemName];
        inventory[itemName] = {
            ...existingData,
            author: itemAuthor,
            bin: selectedBin,
            tags: parsedTags,
            isBorrowed: isBorrowed,
            borrower: isBorrowed ? itemBorrower : '',
            returner: selectedBin === 'Returned' ? itemReturner : ''
        };
        let successMsg = 'You successfully updated the book';
        if (selectedBin === 'Borrowed') successMsg = 'Successfully Borrowed the book';
        if (selectedBin === 'Returned') successMsg = 'Successfully Returned the book';

        showMessage(successMsg, 'success', 3000);
    } else {
        const assignedBin = selectedBin;
        const newId = InventoryHelpers.generateUniqueId(inventory);
        inventory[itemName] = {
            id: newId,
            author: itemAuthor,
            bin: assignedBin,
            tags: parsedTags,
            isBorrowed: isBorrowed,
            borrower: isBorrowed ? itemBorrower : '',
            returner: selectedBin === 'Returned' ? itemReturner : '',
            dateAdded: new Date().toISOString()
        };
        showMessage(`Catalog updated: '${itemName}' (#${newId}) marked as ${assignedBin}`, 'success');
    }

    StorageManager.saveInventory(inventory);
    setItemFormMode('add');

    // Clear and close
    document.getElementById('addItemForm').reset();
    if (typeof closeAddItemModal === 'function') closeAddItemModal();

    // Refresh
    renderListView();
    renderBinStatus();
    renderTagList();
    renderDashboardView();
    updateFilterButtonLabel();
}

/**
 * Handle search functionality
 */
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

/**
 * Render the complete list of all inventory items
 * Updated to match RegTech card design
 */
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

        return `
            <div class="item-card ${cardClass}">
                <div class="card-options" onclick="openEditItemModal('${safeName}')">
                    <i class="fas fa-pen"></i>
                </div>
                <div class="card-icon">#${bookId}</div>
                <div class="card-updates">Catalog record ${statusBadge}</div>
                <h4 class="card-title">${name}</h4>
                ${authorHtml}
                <div class="card-body-row">
                    <div class="card-main-meta">
                        <div class="card-meta"><i class="far fa-calendar"></i> Added ${date}</div>
                        <div class="card-meta"><i class="fas fa-box"></i> Bin/Status: ${details.bin}</div>
                        <div class="card-meta"><i class="fas fa-tags"></i> ${categoryCount} categories</div>
                        ${actionHtml}
                    </div>
                    <div class="card-side-tags">
                        ${tagBadges}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 14px; border-top: 1px solid var(--border-color);">
                    <button class="btn-secondary" style="padding: 8px 10px; font-size: 0.8rem;" onclick="openEditItemModal('${safeName}')">
                        <i class="fas fa-pen"></i> Update
                    </button>
                    <button class="btn-secondary btn-delete" style="padding: 8px 10px; font-size: 0.8rem;" onclick="deleteItem('${safeName}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // GSAP Stagger Animation for the rendered items
    if (typeof gsap !== 'undefined') {
        const cards = container.querySelectorAll('.item-card');
        gsap.from(cards, {
            duration: 0.6,
            y: 30,
            opacity: 0,
            stagger: 0.08,
            ease: "back.out(1.2)",
            clearProps: "all" // remove inline styles after animation so hover works optimally
        });
    }
}

/**
 * Render the tags list in the right sidebar
 */
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

function deleteItem(itemName) {
    openConfirmModal(`Remove "${itemName}" from the catalog?`, () => {
        delete inventory[itemName];
        StorageManager.saveInventory(inventory);
        renderListView();
        renderBinStatus();
        renderTagList();
        renderDashboardView();
        showMessage('You Successfully Remove the Book', 'info', 1800);
    });
}

function openEditItemModal(itemName) {
    const itemData = inventory[itemName];
    if (!itemData) {
        showMessage('Book not found', 'error');
        return;
    }

    const itemNameInput = document.getElementById('itemName');
    const itemAuthorInput = document.getElementById('itemAuthor');
    const itemTagsInput = document.getElementById('itemTags');
    const itemBorrowerInput = document.getElementById('itemBorrower');
    const itemReturnerInput = document.getElementById('itemReturner');
    const binSelect = document.getElementById('itemBinSelection');
    if (!itemNameInput || !itemTagsInput) return;

    const currentBin = InventoryHelpers.getEffectiveBin(itemData);
    setItemFormMode('edit', itemName, currentBin);
    itemNameInput.value = itemName;
    if (itemAuthorInput) itemAuthorInput.value = itemData.author || '';
    itemTagsInput.value = itemData.tags.join(', ');
    if (binSelect) {
        binSelect.value = currentBin;
    }
    if (itemBorrowerInput) itemBorrowerInput.value = itemData.borrower || '';
    if (itemReturnerInput) itemReturnerInput.value = itemData.returner || '';

    // Toggle borrower/returner field visibility
    toggleBorrowerField();

    document.getElementById('addItemModal').classList.remove('hidden');
}

function renderBinStatus() {
    const container = document.getElementById('binStatus');
    if (!container) return;

    container.innerHTML = bins.map((bin) => {
        const isBooksBin = bin === 'Books';
        const itemCount = isBooksBin 
            ? Object.values(inventory).filter(item => InventoryHelpers.getEffectiveBin(item) !== 'Added').length 
            : Object.values(inventory).filter(item => InventoryHelpers.getEffectiveBin(item) === bin).length;

        let iconStr = '<i class="fas fa-box"></i>';
        if (bin === 'Added') iconStr = '<i class="fas fa-plus-circle"></i>';
        if (bin === 'Borrowed') iconStr = '<i class="fas fa-hand-holding-hand"></i>';
        if (bin === 'Returned') iconStr = '<i class="fas fa-undo"></i>';
        if (bin === 'Books') iconStr = '<i class="fas fa-book-open"></i>';

        const titleText = isBooksBin ? 'Books' : `${bin} Books`;

        return `
            <div class="bin-card" onclick="filterByBin('${bin}')">
                <div class="bin-card-header">
                    <div class="bin-card-icon" style="background: none; color: inherit; font-size: 1.5rem;">
                        ${iconStr}
                    </div>
                </div>
                <h4 class="card-title">${titleText}</h4>
                <div class="card-meta">
                    <i class="fas fa-book"></i> ${itemCount} Titles
                </div>
                <div class="card-details">
                    View titles <i class="fas fa-arrow-right"></i>
                </div>
            </div>
        `;
    }).join('');
}

function getFilteredEntries() {
    let entries = Object.entries(inventory);
    if (currentQuery) {
        entries = entries.filter(([name, details]) =>
            name.toLowerCase().includes(currentQuery) ||
            (details.tags && details.tags.some(tag => tag.includes(currentQuery))) ||
            (details.id && details.id.toString().includes(currentQuery)) ||
            (details.author && details.author.toLowerCase().includes(currentQuery)) ||
            (details.borrower && details.borrower.toLowerCase().includes(currentQuery))
        );
    }
    if (activeTagFilter) {
        entries = entries.filter(([, details]) => details.tags && details.tags.includes(activeTagFilter));
    }
    if (activeBinFilter) {
        if (activeBinFilter === 'Books') {
            // "Books" bin shows everything that has been registered/processed (not "Added" status)
            entries = entries.filter(([, details]) => InventoryHelpers.getEffectiveBin(details) !== 'Added');
        } else {
            entries = entries.filter(([, details]) => InventoryHelpers.getEffectiveBin(details) === activeBinFilter);
        }
    } else {
        // Default "Books" view (no active filter) also excludes "Added" items
        entries = entries.filter(([, details]) => InventoryHelpers.getEffectiveBin(details) !== 'Added');
    }
    entries = sortEntries(entries);
    return entries;
}

function sortEntries(entries) {
    const sorted = [...entries];
    if (sortMode === 'name') {
        sorted.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (sortMode === 'oldest') {
        sorted.sort((a, b) => InventoryHelpers.getDateValue(a[1].dateAdded) - InventoryHelpers.getDateValue(b[1].dateAdded));
    } else {
        sorted.sort((a, b) => InventoryHelpers.getDateValue(b[1].dateAdded) - InventoryHelpers.getDateValue(a[1].dateAdded));
    }
    return sorted;
}

function cycleSortMode() {
    const modes = ['newest', 'oldest', 'name'];
    const currentIndex = modes.indexOf(sortMode);
    sortMode = modes[(currentIndex + 1) % modes.length];
    updateFilterButtonLabel();
    renderListView(getFilteredEntries(), currentQuery);
    showMessage(`Sorted by ${sortMode}`, 'info', 1500);
}

function updateFilterButtonLabel() {
    const button = document.getElementById('filterBtn');
    if (!button) return;
    const labels = {
        newest: 'Sort: Newest',
        oldest: 'Sort: Oldest',
        name: 'Sort: Name'
    };
    button.innerHTML = `<i class="fas fa-filter"></i> ${labels[sortMode]}`;
}

function resetFilters() {
    currentQuery = '';
    activeTagFilter = '';
    activeBinFilter = '';
    const queryInput = document.getElementById('searchQuery');
    if (queryInput) queryInput.value = '';
    renderTagList();
    renderListView(getFilteredEntries(), currentQuery);
}

function showAllItems() {
    resetFilters();
    switchView('list');
}

function focusTopTagFromDashboard() {
    const { tagCounts } = getInventoryStats();
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topTag) {
        showMessage('No tags available yet', 'info');
        return;
    }
    filterByTag(topTag);
}

function filterRecentItems() {
    currentQuery = '';
    activeTagFilter = '';
    activeBinFilter = '';
    const recentEntries = Object.entries(inventory).filter(([, details]) => InventoryHelpers.isRecentDate(details.dateAdded));
    switchView('list');
    renderListView(sortEntries(recentEntries), 'recent');
}

function filterByBin(bin) {
    activeBinFilter = bin;
    activeTagFilter = '';
    currentQuery = '';
    const queryInput = document.getElementById('searchQuery');
    if (queryInput) queryInput.value = '';
    switchView('list');
    renderListView(getFilteredEntries(), '');
    showMessage(`Showing titles from ${bin}`, 'info', 1500);
}

// End of application logic




console.log('Main Logic Updated for New Dashboard');
