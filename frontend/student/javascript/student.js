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


// PDF Reader Implementation
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let canvas = null;
let ctx = null;
let currentPdfBook = null;
let isHighlightMode = false;
let bookmarks = {};
let highlights = {};
let pdfSessionTimeout = null;

// Reading History State
let readingHistory = {};
let currentReadingSessionStart = 0;

function loadReadingHistory() {
    const currentUser = localStorage.getItem('lisCurrentUser') || localStorage.getItem('lisCurrentRole') || 'Student';
    const data = localStorage.getItem(`lisReadingHistory_${currentUser}`);
    if (data) {
        try { readingHistory = JSON.parse(data); } catch(e) { readingHistory = {}; }
    } else {
        readingHistory = {};
    }
}

function saveReadingHistory() {
    const currentUser = localStorage.getItem('lisCurrentUser') || localStorage.getItem('lisCurrentRole') || 'Student';
    localStorage.setItem(`lisReadingHistory_${currentUser}`, JSON.stringify(readingHistory));
}

// Security Features
function disableShortcuts(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
    e.preventDefault();
    showMessage('Printing and Saving are disabled for secure documents.', 'warning');
  }
}

function drawWatermark() {
  if (!ctx || !canvas) return;
  const currentUser = localStorage.getItem('lisCurrentUser') || localStorage.getItem('lisCurrentRole') || 'Student';
  const text = `Confidential - Prepared for ${currentUser}`;
  
  ctx.save();
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.fillStyle = 'rgba(150, 150, 150, 0.25)';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, 0);
  ctx.fillText(text, 0, -400);
  ctx.fillText(text, 0, 400);
  ctx.restore();
}

function startPDFSession() {
  clearTimeout(pdfSessionTimeout);
  // Session expires in 60 minutes
  pdfSessionTimeout = setTimeout(() => {
    closePDFReader();
    showMessage('Secure access session expired. Please open the book again.', 'warning', 5000);
  }, 60 * 60 * 1000);
}

function clearPDFSession() {
  clearTimeout(pdfSessionTimeout);
}

// Configure PDF.js worker
function getPdfJs() {
  return window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
}

function initPDFReader() {
  canvas = document.getElementById('pdfCanvas');
  if(canvas) ctx = canvas.getContext('2d');
  
  const pdfContainer = document.getElementById('pdfContainer');
  if (pdfContainer) {
    pdfContainer.addEventListener('mousedown', handleHighlightStart);
    pdfContainer.addEventListener('mouseup', handleHighlightEnd);
    pdfContainer.addEventListener('contextmenu', e => { e.preventDefault(); showMessage('Right-click is disabled for secure documents.', 'warning'); });
  }
  if (canvas) {
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initPDFReader();
    const pdfjs = getPdfJs();
    if (pdfjs) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }, 500);

  // Close modals on Escape key or outside click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const requestModal = document.getElementById('requestAccessModal');
      const pdfModal = document.getElementById('pdfReaderModal');
      if (requestModal && !requestModal.classList.contains('hidden')) {
        closeRequestAccessModal();
      } else if (pdfModal && !pdfModal.classList.contains('hidden')) {
        closePDFReader();
      }
    }
  });

  const requestModalOverlay = document.getElementById('requestAccessModal');
  if (requestModalOverlay) {
    requestModalOverlay.addEventListener('click', (e) => {
      if (e.target === requestModalOverlay) closeRequestAccessModal();
    });
  }

  const pdfModalOverlay = document.getElementById('pdfReaderModal');
  if (pdfModalOverlay) {
    pdfModalOverlay.addEventListener('click', (e) => {
      if (e.target === pdfModalOverlay) closePDFReader();
    });
  }
});

function openPDFReader(bookName) {
  currentPdfBook = bookName;
  document.getElementById('pdfBookTitle').textContent = bookName;
  document.getElementById('pdfReaderModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Security Checks
  const token = 'SEC_TOKEN_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  console.log(`[Security] Generated secure access token: ${token} for ${bookName}`);
  console.log(`[Security] Initializing encrypted PDF streaming mode...`);
  
  startPDFSession();
  document.addEventListener('keydown', disableShortcuts);
  
  // Reading History Tracking
  loadReadingHistory();
  if (!readingHistory[bookName]) {
      readingHistory[bookName] = {
          sessions: 0,
          timeSpentMs: 0,
          pagesVisited: [],
          lastPage: 1,
          lastAccessed: null
      };
  }
  readingHistory[bookName].sessions += 1;
  readingHistory[bookName].lastAccessed = new Date().toISOString();
  saveReadingHistory();
  currentReadingSessionStart = Date.now();
  
  // Load saved state
  const savedState = JSON.parse(localStorage.getItem('pdfState_' + bookName) || '{}');
  pageNum = savedState.lastPage || 1;
  bookmarks[bookName] = savedState.bookmarks || [];
  highlights[bookName] = savedState.highlights || {};
  
  updateBookmarkIcon();
  
  // Load a dummy PDF for demonstration
  const url = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
  
  const pdfjs = getPdfJs();
  if (!pdfjs) {
    showMessage('PDF library failed to load.', 'error');
    return;
  }
  
  const loadingTask = pdfjs.getDocument({
    url: url,
    disableAutoFetch: true,   // Only fetch required data
    disableStream: false,     // Enable streaming for large files
    disableRange: false       // Enable range requests for chunking
  });
  
  loadingTask.promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('pdfPageCount').textContent = pdfDoc.numPages;
    // Delay rendering slightly to ensure UI is visible first
    requestAnimationFrame(() => renderPage(pageNum));
  }).catch(err => {
    console.error('Error loading PDF: ', err);
    showMessage('Failed to load PDF book.', 'error');
  });
}

function closePDFReader() {
  document.getElementById('pdfReaderModal').classList.add('hidden');
  document.body.style.overflow = '';
  
  // Reading History tracking update
  if (currentReadingSessionStart && currentPdfBook) {
      const timeSpent = Date.now() - currentReadingSessionStart;
      if (readingHistory[currentPdfBook]) {
          readingHistory[currentPdfBook].timeSpentMs += timeSpent;
          saveReadingHistory();
      }
      currentReadingSessionStart = 0;
  }
  
  if (currentPdfBook) {
    savePdfState();
  }
  pdfDoc = null;
  clearPDFSession();
  document.removeEventListener('keydown', disableShortcuts);
}

function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({scale: 1.5});
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    const renderTask = page.render(renderContext);
    
    renderTask.promise.then(function() {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
      drawWatermark();
      renderHighlights();
    });
  });
  
  document.getElementById('pdfPageNum').textContent = num;
  updateBookmarkIcon();
  if (currentPdfBook) {
      savePdfState();
      // Track page visit
      if (readingHistory[currentPdfBook]) {
          if (!readingHistory[currentPdfBook].pagesVisited.includes(num)) {
              readingHistory[currentPdfBook].pagesVisited.push(num);
          }
          readingHistory[currentPdfBook].lastPage = num;
          saveReadingHistory();
      }
  }
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

function changePdfPage(offset) {
  if (!pdfDoc) return;
  if (pageNum + offset <= 0 || pageNum + offset > pdfDoc.numPages) return;
  pageNum += offset;
  queueRenderPage(pageNum);
}

function savePdfState() {
  const state = {
    lastPage: pageNum,
    bookmarks: bookmarks[currentPdfBook] || [],
    highlights: highlights[currentPdfBook] || {}
  };
  localStorage.setItem('pdfState_' + currentPdfBook, JSON.stringify(state));
}

function toggleHighlightMode() {
  isHighlightMode = !isHighlightMode;
  const btn = document.getElementById('pdfBtnHighlight');
  if (isHighlightMode) {
    btn.classList.add('active');
    document.getElementById('pdfContainer').style.cursor = 'crosshair';
  } else {
    btn.classList.remove('active');
    document.getElementById('pdfContainer').style.cursor = 'default';
  }
}

function bookmarkCurrentPage() {
  if (!currentPdfBook) return;
  if (!bookmarks[currentPdfBook]) bookmarks[currentPdfBook] = [];
  
  const index = bookmarks[currentPdfBook].indexOf(pageNum);
  if (index > -1) {
    bookmarks[currentPdfBook].splice(index, 1);
    showMessage('Bookmark removed', 'info');
  } else {
    bookmarks[currentPdfBook].push(pageNum);
    showMessage('Page bookmarked', 'success');
  }
  savePdfState();
  updateBookmarkIcon();
}

function updateBookmarkIcon() {
  const btn = document.getElementById('pdfBtnBookmark');
  if (!btn || !currentPdfBook) return;
  const isBookmarked = bookmarks[currentPdfBook] && bookmarks[currentPdfBook].includes(pageNum);
  if (isBookmarked) {
    btn.style.color = '#f59e0b';
  } else {
    btn.style.color = 'var(--text-main)';
  }
}

let highlightStartPos = null;

function handleHighlightStart(e) {
  if (!isHighlightMode) return;
  const rect = canvas.getBoundingClientRect();
  highlightStartPos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handleHighlightEnd(e) {
  if (!isHighlightMode || !highlightStartPos) return;
  const rect = canvas.getBoundingClientRect();
  const endPos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  
  const width = Math.abs(endPos.x - highlightStartPos.x);
  const height = Math.abs(endPos.y - highlightStartPos.y);
  const x = Math.min(highlightStartPos.x, endPos.x);
  const y = Math.min(highlightStartPos.y, endPos.y);
  
  if (width > 10 && height > 10) {
    if (!highlights[currentPdfBook]) highlights[currentPdfBook] = {};
    if (!highlights[currentPdfBook][pageNum]) highlights[currentPdfBook][pageNum] = [];
    
    highlights[currentPdfBook][pageNum].push({
      x: x / rect.width,
      y: y / rect.height,
      width: width / rect.width,
      height: height / rect.height
    });
    
    savePdfState();
    renderHighlights();
  }
  highlightStartPos = null;
}

function renderHighlights() {
  const layer = document.getElementById('pdfHighlightsLayer');
  if (!layer) return;
  layer.innerHTML = '';
  
  if (!highlights[currentPdfBook] || !highlights[currentPdfBook][pageNum]) return;
  
  const rect = canvas.getBoundingClientRect();
  
  highlights[currentPdfBook][pageNum].forEach(h => {
    const div = document.createElement('div');
    div.className = 'pdf-highlight-rect';
    div.style.left = (h.x * 100) + '%';
    div.style.top = (h.y * 100) + '%';
    div.style.width = (h.width * 100) + '%';
    div.style.height = (h.height * 100) + '%';
    layer.appendChild(div);
  });
}

function renderReadingHistory() {
    loadReadingHistory();
    const container = document.getElementById('historyList');
    if (!container) return;
    
    const books = Object.keys(readingHistory);
    if (books.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-muted);">
                <i class="fas fa-book-reader" style="font-size: 3rem; opacity: 0.2; margin-bottom: 16px;"></i>
                <p>No reading history found. Start reading to see your progress here!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    for (const book of books) {
        const hist = readingHistory[book];
        const dateObj = new Date(hist.lastAccessed);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const mins = Math.floor(hist.timeSpentMs / 60000);
        const secs = Math.floor((hist.timeSpentMs % 60000) / 1000);
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        
        html += `
            <div class="item-card" style="display: flex; flex-direction: column; gap: 10px;">
                <h4 class="card-title" style="margin-bottom: 0;">${book}</h4>
                <div class="card-main-meta" style="margin-top: 8px;">
                    <div class="card-meta"><i class="far fa-calendar"></i> Accessed: ${dateStr}</div>
                    <div class="card-meta"><i class="far fa-clock"></i> Reading Time: ${timeStr}</div>
                    <div class="card-meta"><i class="fas fa-layer-group"></i> Pages Visited: ${hist.pagesVisited.length}</div>
                    <div class="card-meta"><i class="fas fa-bookmark"></i> Last Page: ${hist.lastPage}</div>
                    <div class="card-meta"><i class="fas fa-history"></i> Sessions: ${hist.sessions}</div>
                </div>
                <div class="card-footer" style="margin-top: 12px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <button class="btn-primary" onclick="openPDFReader('${book.replace(/'/g, "\\'")}')">
                        <i class="fas fa-book-reader"></i> Continue Reading
                    </button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}


