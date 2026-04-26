/**
 * Faculty Specific Logic for Librarian Inventory System
 * This file contains functions and logic accessible only to faculty members.
 */

/**
 * Handle adding or updating an item in the inventory
 * @param {Event} e - Form submission event
 */
function handleAddItem(e) {
    if (e) e.preventDefault();

    const currentRole = localStorage.getItem('lisCurrentRole');
    if (currentRole === 'Student') {
        showMessage('Students are not authorized to modify the catalog.', 'error');
        return;
    }

    const itemName = document.getElementById('itemName').value.trim();
    const itemAuthor = document.getElementById('itemAuthor').value.trim();
    const itemTags = document.getElementById('itemTags').value.trim();
    const binSelect = document.getElementById('itemBinSelection');
    const selectedBin = binSelect ? binSelect.value : 'Added';
    const isBorrowed = selectedBin === 'Borrowed';
    const itemBorrower = document.getElementById('itemBorrower').value.trim();
    const itemReturnerInput = document.getElementById('itemReturner');
    const itemReturner = itemReturnerInput ? itemReturnerInput.value.trim() : '';

    const itemISBN = document.getElementById('itemISBN')?.value.trim() || '';
    const itemYear = document.getElementById('itemYear')?.value.trim() || '';
    const itemDept = document.getElementById('itemDept')?.value.trim() || '';
    const itemSubject = document.getElementById('itemSubject')?.value.trim() || '';
    const itemKeywords = document.getElementById('itemKeywords')?.value.trim() || '';
    const itemFacultyRec = document.getElementById('itemFacultyRec')?.checked || false;
    const itemRestricted = document.getElementById('itemRestricted')?.checked || false;

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

        const currentBin = InventoryHelpers.getEffectiveBin(existingData);
        if (selectedBin === 'Returned' && currentBin !== 'Borrowed' && currentBin !== 'Returned') {
            showMessage("You can't returned the book, it is not borrowed", 'error');
            return;
        }

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
            returner: selectedBin === 'Returned' ? itemReturner : '',
            isbn: itemISBN,
            year: itemYear,
            department: itemDept,
            subject: itemSubject,
            keywords: itemKeywords,
            facultyRec: itemFacultyRec,
            isRestricted: itemRestricted
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
            isbn: itemISBN,
            year: itemYear,
            department: itemDept,
            subject: itemSubject,
            keywords: itemKeywords,
            facultyRec: itemFacultyRec,
            isRestricted: itemRestricted,
            dateAdded: new Date().toISOString()
        };
        showMessage(`Catalog updated: '${itemName}' (#${newId}) marked as ${assignedBin}`, 'success');
    }

    StorageManager.saveInventory(inventory);
    setItemFormMode('add');

    document.getElementById('addItemForm').reset();
    if (typeof closeAddItemModal === 'function') closeAddItemModal();

    renderListView();
    renderBinStatus();
    renderTagList();
    renderDashboardView();
    updateFilterButtonLabel();
    populateFilterOptions();
}

/**
 * Delete an item from the inventory
 * @param {string} itemName - Name of the item to delete
 */
function deleteItem(itemName) {
    const currentRole = localStorage.getItem('lisCurrentRole');
    if (currentRole === 'Student') {
        showMessage('Students cannot delete catalog items.', 'error');
        return;
    }

    openConfirmModal(`Remove "${itemName}" from the catalog?`, () => {
        delete inventory[itemName];
        StorageManager.saveInventory(inventory);
        renderListView();
        renderBinStatus();
        renderTagList();
        renderDashboardView();
        populateFilterOptions();
        showMessage('You Successfully Remove the Book', 'info', 1800);
    });
}

/**
 * Open the modal to edit an existing item
 * @param {string} itemName - Name of the item to edit
 */
function openEditItemModal(itemName) {
    const currentRole = localStorage.getItem('lisCurrentRole');
    if (currentRole === 'Student') {
        showMessage('Student access is restricted to requesting materials.', 'error');
        return;
    }

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

    if (document.getElementById('itemISBN')) document.getElementById('itemISBN').value = itemData.isbn || '';
    if (document.getElementById('itemYear')) document.getElementById('itemYear').value = itemData.year || '';
    if (document.getElementById('itemDept')) document.getElementById('itemDept').value = itemData.department || '';
    if (document.getElementById('itemSubject')) document.getElementById('itemSubject').value = itemData.subject || '';
    if (document.getElementById('itemKeywords')) document.getElementById('itemKeywords').value = itemData.keywords || '';
    if (document.getElementById('itemFacultyRec')) document.getElementById('itemFacultyRec').checked = itemData.facultyRec || false;

    toggleBorrowerField();

    document.getElementById('addItemModal').classList.remove('hidden');
}

/**
 * Render the bin status view
 */
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

/**
 * Handle request updates (Approve/Reject) by Faculty
 */
function handleRequestUpdate(requestId, newStatus) {
    if (!requests[requestId]) return;
    
    requests[requestId].status = newStatus;
    requests[requestId].dateUpdated = new Date().toISOString();
    
    StorageManager.saveRequests(requests);
    updateRequestBadge();
    renderRequestsView();
    showMessage(`Request ${newStatus.toLowerCase()} successfully`, 'info');
}

/**
 * Toggles the borrower/returner name field based on selected bin
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
            if (borrowerInput) borrowerInput.value = '';
        }
    }

    const returnerGroup = document.getElementById('returnerFieldGroup');
    const returnerInput = document.getElementById('itemReturner');
    if (returnerGroup) {
        if (isReturned) {
            returnerGroup.classList.remove('hidden');
        } else {
            returnerGroup.classList.add('hidden');
            if (returnerInput) returnerInput.value = '';
        }
    }
}

/**
 * Configure the item form for add or edit mode
 */
function setItemFormMode(mode = 'add', itemName = '', currentBin = '') {
    const modalTitle = document.getElementById('itemModalTitle');
    const submitBtn = document.getElementById('itemSubmitBtn');
    const facultyFields = document.getElementById('facultyOnlyFields');
    const currentRole = localStorage.getItem('lisCurrentRole');

    if (facultyFields) {
        if (currentRole === 'Student') {
            facultyFields.classList.add('hidden');
        } else {
            facultyFields.classList.remove('hidden');
        }
    }

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

/**
 * Opens the "Add Item" modal overlay by removing its 'hidden' class.
 * This function allows users to upload or add new items/documents to their inventory.
 */
function openAddItemModal() {
    if (typeof setItemFormMode === 'function') {
        setItemFormMode('add');
    }
    const modal = document.getElementById('addItemModal');
    modal.classList.remove('hidden');
    
    if (typeof gsap !== 'undefined') {
        const modalContent = modal.querySelector('.modal-content');
        gsap.fromTo(modalContent, 
            { y: -50, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)" }
        );
    }
}

/**
 * Closes the "Add Item" modal overlay by adding the 'hidden' class.
 * This is triggered upon successful item addition or when the user manually closes the modal.
 */
function closeAddItemModal() {
    const form = document.getElementById('addItemForm');
    if (form) form.reset();
    if (typeof setItemFormMode === 'function') {
        setItemFormMode('add');
    }
    document.getElementById('addItemModal').classList.add('hidden');
}

/**
 * Handle triggering a summary report display in the console and via message
 */
function handleShowSummaryReport() {
    if (typeof reportGenerator === 'undefined') {
        console.error('ReportGenerator not found. Make sure reports.js is loaded.');
        return;
    }

    const report = reportGenerator.generateSummaryReport(inventory);
    reportGenerator.printReport(report);
    
    // Show a summary message to the user
    const metrics = report.metrics;
    const msg = `Analytics Summary: ${metrics.totalItems} Titles, ${metrics.uniqueTags} Categories. Detailed report printed to console.`;
    
    if (typeof showMessage === 'function') {
        showMessage(msg, 'success', 5000);
    } else {
        alert(msg);
    }
}

/**
 * Handle downloading the full inventory report as JSON
 */
function handleDownloadReport() {
    if (typeof reportGenerator === 'undefined') {
        console.error('ReportGenerator not found. Make sure reports.js is loaded.');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `librarian_report_${timestamp}.json`;
    
    // Generate all reports and export the summary/detailed bundle
    const allReports = reportGenerator.generateAllReports(inventory, bins);
    reportGenerator.exportReportAsJSON(allReports, filename);
    
    if (typeof showMessage === 'function') {
        showMessage(`Report generated and downloading: ${filename}`, 'info');
    }
}
