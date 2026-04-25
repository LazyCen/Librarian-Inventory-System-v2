/**
 * Student Specific Logic for Librarian Inventory System
 * This file contains functions and logic accessible to students.
 */

/**
 * Submit a new access request for a restricted book
 * @param {string} bookName - Title of the book being requested
 */
let pendingRequestBook = null;

function submitAccessRequest(bookName) {
    pendingRequestBook = bookName;
    document.getElementById('requestAccessMessage').textContent = `Are you sure you want to request access to '${bookName}'?`;
    document.getElementById('requestAccessModal').classList.remove('hidden');
}

function closeRequestAccessModal() {
    pendingRequestBook = null;
    document.getElementById('requestAccessModal').classList.add('hidden');
}

function confirmRequestAccess() {
    if (!pendingRequestBook) return;

    const bookName = pendingRequestBook;
    const currentUser = localStorage.getItem('lisCurrentUser') || localStorage.getItem('lisCurrentRole') || 'Anonymous Student';
    const requestId = 'REQ-' + Date.now();
    
    requests[requestId] = {
        id: requestId,
        bookTitle: bookName,
        studentId: currentUser,
        status: 'Pending',
        dateRequested: new Date().toISOString(),
        dateUpdated: new Date().toISOString()
    };
    
    StorageManager.saveRequests(requests);
    updateRequestBadge();
    renderListView();
    showMessage(`Request submitted for '${bookName}'`, 'success');
    
    closeRequestAccessModal();
}
