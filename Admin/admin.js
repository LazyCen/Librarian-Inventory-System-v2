/* ===== ADMIN PANEL JS ===== */

// --- Constants ---
const INVENTORY_KEY = 'chaosInventory';
const AUTH_USERS_KEY = 'lisAuthUsers';
const ONLINE_USERS_KEY = 'lisOnlineUsers';
const CURRENT_ROLE_KEY = 'lisCurrentRole';
const CURRENT_USER_KEY = 'lisCurrentUser';

// --- State ---
let currentSection = 'overview';
let requestFilter = 'all';
let userFilter = 'all';
let bookFilter = 'all';
let pendingConfirmFn = null;
let activityLog = [];

// --- Helpers ---
function getInventory() {
  try { return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '{}'); } catch { return {}; }
}
function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]'); } catch { return []; }
}
function getOnlineSet() {
  try { return new Set(JSON.parse(localStorage.getItem(ONLINE_USERS_KEY) || '[]')); } catch { return new Set(); }
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
function initials(name, email) {
  if (name && name.trim()) {
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : p[0].slice(0,2).toUpperCase();
  }
  return (email||'?')[0].toUpperCase();
}
function avatarColor(email) {
  const pal = ['#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d'];
  let h = 0;
  for (let i=0; i<(email||'').length; i++) h = (h*31+email.charCodeAt(i))|0;
  return pal[Math.abs(h)%pal.length];
}
function statusBadge(bin) {
  const map = {
    Borrowed: 'badge-borrowed', Returned: 'badge-returned',
    Books: 'badge-books', Added: 'badge-added'
  };
  return `<span class="status-badge ${map[bin]||'badge-added'}"><i class="fas fa-circle" style="font-size:.4rem"></i>${bin||'Unknown'}</span>`;
}
function showToast(msg, type='info') {
  const t = document.getElementById('adminToast');
  t.textContent = msg;
  t.className = `admin-toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.add('hidden'), 3200);
}
function logActivity(type, title, meta) {
  activityLog.unshift({ type, title, meta, time: new Date().toISOString() });
  if (activityLog.length > 80) activityLog.pop();
  if (currentSection === 'activity') renderActivity();
}

// --- AUTH ---
function toggleAdminPw(btn) {
  const inp = btn.closest('.field-wrap').querySelector('input');
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  btn.querySelector('i').className = showing ? 'fas fa-eye' : 'fas fa-eye-slash';
}

document.addEventListener('DOMContentLoaded', () => {
  // Load current user profile into sidebar
  const currentEmail = localStorage.getItem(CURRENT_USER_KEY);
  if (currentEmail) {
    const users = getUsers();
    const me = users.find(u => u.email === currentEmail);
    if (me) {
      document.querySelector('.admin-name').textContent = me.fullName || me.email.split('@')[0];
      document.querySelector('.admin-email').textContent = `${me.role || 'Faculty'} Admin`;
      document.querySelector('.admin-avatar').textContent = initials(me.fullName, me.email);
      document.querySelector('.admin-avatar').style.background = avatarColor(me.email);
    }
  }

  // Seed activity log from existing inventory data
  const inv = getInventory();
  Object.entries(inv).forEach(([name, d]) => {
    if (d.isBorrowed) logActivity('borrow', `"${name}" borrowed`, `by ${d.borrower||'Unknown'}`);
    if (d.bin === 'Returned') logActivity('return', `"${name}" returned`, `by ${d.returner||'Unknown'}`);
  });
  getUsers().forEach(u => logActivity('user', `${u.fullName||u.email} registered`, u.role||'Faculty'));

  document.getElementById('adminConfirm').addEventListener('click', e => {
    if (e.target === document.getElementById('adminConfirm')) closeAdminConfirm();
  });

  // Approve expiry custom date toggle
  const expSel = document.getElementById('approveExpiry');
  if (expSel) {
    expSel.addEventListener('change', () => {
      document.getElementById('approveCustomDateWrap').classList.toggle('hidden', expSel.value !== 'custom');
    });
  }
  // Navigation Toggle
  const toggleBtn = document.getElementById('mobileToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMobileSidebar();
    });
  }

  // Sidebar Close Button (Mobile)
  const closeBtn = document.getElementById('mobileClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMobileSidebar();
    });
  }

  // Sidebar Overlay (Mobile)
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      closeMobileSidebar();
    });
  }

  refreshAll();
});

// --- NAVIGATION ---
const SECTION_ICONS = {
  overview:'fa-chart-pie', requests:'fa-inbox',
  users:'fa-users', books:'fa-book-open', activity:'fa-clock-rotate-left',
  reports:'fa-chart-line'
};
const SECTION_LABELS = {
  overview:'Overview', requests:'Access Requests',
  users:'Users', books:'Books', activity:'Activity Log',
  reports:'Reports & Analytics'
};

function switchSection(name) {
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const sec = document.getElementById(`section-${name}`);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-section="${name}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('topbarTitle').textContent = SECTION_LABELS[name]||name;
  currentSection = name;
  // Render relevant section
  if (name==='overview') renderOverview();
  if (name==='requests') renderRequests();
  if (name==='users') renderUsers();
  if (name==='books') renderBooks();
  if (name==='activity') renderActivity();
  if (name==='reports') renderReports();
  closeMobileSidebar();
}

// --- MOBILE SIDEBAR ---
// --- SIDEBAR TOGGLE ---
function toggleMobileSidebar() {
  const sb = document.getElementById('adminSidebar');
  const ov = document.getElementById('sidebarOverlay');
  const body = document.body;
  const isMobile = window.innerWidth <= 900;
  
  if (isMobile) {
    const isOpen = sb.classList.contains('open');
    if (!isOpen) {
      sb.classList.add('open');
      if (ov) {
        ov.classList.add('active');
        ov.classList.remove('hidden');
      }
    } else {
      sb.classList.remove('open');
      if (ov) {
        ov.classList.remove('active');
        ov.classList.add('hidden');
      }
    }
  } else {
    // Desktop: Toggle collapsed state
    body.classList.toggle('sidebar-collapsed');
  }
}

function closeMobileSidebar() {
  const sb = document.getElementById('adminSidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) {
    ov.classList.remove('active');
    ov.classList.add('hidden');
  }
}

// --- REFRESH ALL ---
function refreshAll() {
  // Optimize rendering for large datasets (500+ users/items) by deferring non-critical renders
  requestAnimationFrame(() => {
    renderOverview();
    setTimeout(() => {
      renderRequests();
      renderUsers();
      renderBooks();
      renderActivity();
      renderReports();
      updateRequestBadge();
    }, 0);
  });
}

function updateRequestBadge() {
  const requests = getRequests();
  const count = Object.values(requests).filter(r=>r.status==='Pending').length;
  const badge = document.getElementById('navRequestsBadge');
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
}

// --- OVERVIEW ---
function getRequests() {
  try { return JSON.parse(localStorage.getItem('librarianRequests') || '{}'); } catch { return {}; }
}
function getAllReadingHistories() {
  const histories = {};
  const users = getUsers();
  for (const u of users) {
    const key = `lisReadingHistory_${u.email}`;
    try {
      const d = localStorage.getItem(key);
      if (d) histories[u.email] = { user: u, data: JSON.parse(d) };
    } catch {}
  }
  return histories;
}

function renderOverview() {
  const inv = getInventory();
  const users = getUsers();
  const items = Object.entries(inv);
  const requests = getRequests();
  const reqEntries = Object.values(requests);
  const students = users.filter(u => (u.role||'Faculty') === 'Student');
  const pendingReqs = reqEntries.filter(r => r.status === 'Pending');
  const colors = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#f43f5e','#06b6d4','#10b981','#ec4899'];

  // Stat cards
  document.getElementById('statTotalBooks').textContent = items.length;
  document.getElementById('statStudents').textContent = students.length;
  document.getElementById('statTotalRequests').textContent = reqEntries.length;
  document.getElementById('statPendingApprovals').textContent = pendingReqs.length;

  // Most Requested Books
  const reqCounts = {};
  reqEntries.forEach(r => { reqCounts[r.bookTitle] = (reqCounts[r.bookTitle]||0) + 1; });
  const topRequested = Object.entries(reqCounts).sort((a,b) => b[1]-a[1]).slice(0,5);
  const mrEl = document.getElementById('overviewMostRequested');
  if (!topRequested.length) {
    mrEl.innerHTML = `<div class="mini-empty">No requests yet</div>`;
  } else {
    const mrMax = topRequested[0][1];
    mrEl.innerHTML = topRequested.map(([title,cnt],i) => `
      <div class="mini-row"><div class="mini-rank">${i+1}</div>
        <div class="mini-info" style="flex:1"><div class="mini-name">${title}</div>
          <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${(cnt/mrMax*100).toFixed(0)}%;background:${colors[i%8]}"></div></div>
        </div><div class="mini-count">${cnt}</div></div>`).join('');
  }

  // Most Read Books (from reading histories)
  const allHist = getAllReadingHistories();
  const readCounts = {};
  Object.values(allHist).forEach(({ data }) => {
    Object.entries(data).forEach(([book, h]) => {
      readCounts[book] = (readCounts[book]||0) + (h.sessions||1);
    });
  });
  const topRead = Object.entries(readCounts).sort((a,b) => b[1]-a[1]).slice(0,5);
  const rdEl = document.getElementById('overviewMostRead');
  if (!topRead.length) {
    rdEl.innerHTML = `<div class="mini-empty">No reading data yet</div>`;
  } else {
    const rdMax = topRead[0][1];
    rdEl.innerHTML = topRead.map(([title,cnt],i) => `
      <div class="mini-row"><div class="mini-rank">${i+1}</div>
        <div class="mini-info" style="flex:1"><div class="mini-name">${title}</div>
          <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${(cnt/rdMax*100).toFixed(0)}%;background:${colors[(i+3)%8]}"></div></div>
        </div><div class="mini-count">${cnt} sess.</div></div>`).join('');
  }

  // Recently Active Users
  const online = getOnlineSet();
  const activeUsers = [...users].sort((a,b) => {
    const aOn = online.has(a.email) ? 1 : 0;
    const bOn = online.has(b.email) ? 1 : 0;
    if (bOn !== aOn) return bOn - aOn;
    return new Date(b.createdAt||0) - new Date(a.createdAt||0);
  }).slice(0,6);
  const auEl = document.getElementById('overviewActiveUsers');
  if (!activeUsers.length) {
    auEl.innerHTML = `<div class="mini-empty">No users yet</div>`;
  } else {
    auEl.innerHTML = activeUsers.map(u => `
      <div class="mini-row">
        <div class="mini-avatar" style="background:${avatarColor(u.email)};color:#fff">${initials(u.fullName,u.email)}</div>
        <div class="mini-info">
          <div class="mini-name">${u.fullName||u.email.split('@')[0]}</div>
          <div class="mini-meta">${u.role||'Faculty'} · ${online.has(u.email)?'<span style="color:#4ade80">Online</span>':'Offline'}</div>
        </div>
      </div>`).join('');
  }

  // Reading Duration per Student
  const durations = [];
  Object.entries(allHist).forEach(([email, { user: u, data }]) => {
    let totalMs = 0;
    Object.values(data).forEach(h => { totalMs += (h.timeSpentMs||0); });
    if (totalMs > 0) durations.push({ name: u.fullName||u.email.split('@')[0], email, totalMs });
  });
  durations.sort((a,b) => b.totalMs - a.totalMs);
  const durEl = document.getElementById('overviewReadingDuration');
  if (!durations.length) {
    durEl.innerHTML = `<div class="mini-empty">No reading data yet</div>`;
  } else {
    const durMax = durations[0].totalMs;
    durEl.innerHTML = durations.slice(0,6).map((d,i) => {
      const mins = Math.floor(d.totalMs/60000); const secs = Math.floor((d.totalMs%60000)/1000);
      const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      return `<div class="mini-row">
        <div class="mini-avatar" style="background:${avatarColor(d.email)};color:#fff">${initials(d.name,d.email)}</div>
        <div class="mini-info" style="flex:1"><div class="mini-name">${d.name}</div>
          <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${(d.totalMs/durMax*100).toFixed(0)}%;background:${colors[(i+1)%8]}"></div></div>
        </div><div class="mini-count">${label}</div></div>`;
    }).join('');
  }

  // Category bars
  const tagCounts = {};
  items.forEach(([,d])=>(d.tags||[]).forEach(t=>{ tagCounts[t]=(tagCounts[t]||0)+1; }));
  const sortedTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]);
  const tagMax = sortedTags[0]?.[1] || 1;
  const oc = document.getElementById('overviewCategories');
  if (!sortedTags.length) {
    oc.innerHTML = `<div class="mini-empty">No categories added yet</div>`;
  } else {
    oc.innerHTML = sortedTags.slice(0,10).map(([tag,cnt],i)=>`
      <div class="cat-bar-row">
        <span class="cat-name">${tag}</span>
        <div class="cat-track"><div class="cat-fill" style="width:${(cnt/tagMax*100).toFixed(1)}%;background:${colors[i%colors.length]}"></div></div>
        <span class="cat-count">${cnt}</span>
      </div>`).join('');
  }

  // Usage chart
  updateUsageChart('daily');
}

// --- ACCESS REQUEST MANAGEMENT ---
let pendingApproveId = null;
let pendingRejectId = null;

function filterRequests(f, btn) {
  requestFilter = f;
  document.querySelectorAll('#requestTabs .filter-tab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderRequests();
}

function reqStatusBadge(status) {
  const map = {
    Pending: 'badge-pending', Approved: 'badge-approved',
    Rejected: 'badge-rejected', Expired: 'badge-expired', Revoked: 'badge-revoked'
  };
  return `<span class="status-badge ${map[status]||'badge-pending'}">${status||'Pending'}</span>`;
}

function checkExpiredRequests() {
  const requests = getRequests();
  const now = new Date();
  let changed = false;
  Object.values(requests).forEach(r => {
    if (r.status === 'Approved' && r.expiresAt && new Date(r.expiresAt) < now) {
      r.status = 'Expired';
      r.dateUpdated = now.toISOString();
      changed = true;
    }
  });
  if (changed) saveRequests(requests);
  return requests;
}

function saveRequests(requests) {
  localStorage.setItem('librarianRequests', JSON.stringify(requests));
}

function renderRequests() {
  const requests = checkExpiredRequests();
  const q = (document.getElementById('requestSearch')?.value||'').toLowerCase();
  let items = Object.entries(requests);

  if (requestFilter !== 'all') items = items.filter(([,r]) => r.status === requestFilter);
  if (q) items = items.filter(([,r]) =>
    (r.bookTitle||'').toLowerCase().includes(q) ||
    (r.studentId||'').toLowerCase().includes(q) ||
    (r.id||'').toLowerCase().includes(q)
  );

  // Sort: Pending first, then by date descending
  items.sort((a,b) => {
    if (a[1].status === 'Pending' && b[1].status !== 'Pending') return -1;
    if (b[1].status === 'Pending' && a[1].status !== 'Pending') return 1;
    return new Date(b[1].dateRequested||0) - new Date(a[1].dateRequested||0);
  });

  const tbody = document.getElementById('requestsTbody');
  const empty = document.getElementById('requestsEmpty');
  if (!items.length) {
    tbody.innerHTML=''; empty.classList.remove('hidden'); return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = items.map(([id,r]) => {
    const expires = r.expiresAt ? fmtDate(r.expiresAt) : '—';
    const remarks = r.remarks || '—';
    let actions = '';
    if (r.status === 'Pending') {
      actions = `
        <button class="tbl-btn approve" onclick="openApproveModal('${esc(id)}')"><i class="fas fa-check"></i> Approve</button>
        <button class="tbl-btn danger" onclick="openRejectModal('${esc(id)}')"><i class="fas fa-times"></i> Reject</button>`;
    } else if (r.status === 'Approved') {
      actions = `
        <button class="tbl-btn revoke" onclick="revokeAccess('${esc(id)}')"><i class="fas fa-ban"></i> Revoke</button>`;
    } else {
      actions = `
        <button class="tbl-btn danger" onclick="deleteRequest('${esc(id)}')"><i class="fas fa-trash"></i></button>`;
    }
    return `<tr>
      <td data-label="ID" style="font-weight:700;color:var(--text-muted);font-size:.78rem">${r.id||id}</td>
      <td data-label="Student"><div style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:${avatarColor(r.studentId)};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.7rem;color:#fff;flex-shrink:0">${initials('',r.studentId)}</div>
        <span style="font-weight:600">${r.studentId||'—'}</span>
      </div></td>
      <td data-label="Book Title" style="font-weight:600">${r.bookTitle||'—'}</td>
      <td data-label="Status">${reqStatusBadge(r.status)}</td>
      <td data-label="Requested" style="color:var(--text-muted)">${fmtDate(r.dateRequested)}</td>
      <td data-label="Expires" style="color:var(--text-muted)">${expires}</td>
      <td data-label="Remarks" style="color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.remarks||'').replace(/"/g,'&quot;')}">${remarks}</td>
      <td data-label="Actions"><div class="tbl-actions">${actions}</div></td>
    </tr>`;
  }).join('');
}

// --- Approve Flow ---
function openApproveModal(reqId) {
  pendingApproveId = reqId;
  const requests = getRequests();
  const r = requests[reqId];
  if (!r) return;
  document.getElementById('approveMsg').textContent = `Approve "${r.studentId}" access to "${r.bookTitle}"?`;
  document.getElementById('approveExpiry').value = '30';
  document.getElementById('approveCustomDateWrap').classList.add('hidden');
  openModal('approveModal');
}

function executeApprove() {
  if (!pendingApproveId) return;
  const requests = getRequests();
  const r = requests[pendingApproveId];
  if (!r) { closeModal('approveModal'); return; }

  const sel = document.getElementById('approveExpiry').value;
  let expiryDate;
  if (sel === 'custom') {
    const custom = document.getElementById('approveCustomDate').value;
    if (!custom) { showToast('Please select a custom expiry date.', 'error'); return; }
    expiryDate = new Date(custom + 'T23:59:59');
  } else {
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(sel));
  }

  r.status = 'Approved';
  r.expiresAt = expiryDate.toISOString();
  r.dateUpdated = new Date().toISOString();
  r.remarks = '';
  saveRequests(requests);
  closeModal('approveModal');
  pendingApproveId = null;
  logActivity('return', `Request approved: "${r.bookTitle}"`, `Student: ${r.studentId} · Expires: ${fmtDate(r.expiresAt)}`);
  showToast(`Access approved for "${r.bookTitle}"`, 'success');
  refreshAll();
}

// --- Reject Flow ---
function openRejectModal(reqId) {
  pendingRejectId = reqId;
  const requests = getRequests();
  const r = requests[reqId];
  if (!r) return;
  document.getElementById('rejectMsg').textContent = `Reject "${r.studentId}" access to "${r.bookTitle}"?`;
  document.getElementById('rejectRemarks').value = '';
  openModal('rejectModal');
}

function executeReject() {
  if (!pendingRejectId) return;
  const requests = getRequests();
  const r = requests[pendingRejectId];
  if (!r) { closeModal('rejectModal'); return; }

  const remarks = document.getElementById('rejectRemarks').value.trim();
  r.status = 'Rejected';
  r.dateUpdated = new Date().toISOString();
  r.remarks = remarks || 'No reason provided';
  r.expiresAt = null;
  saveRequests(requests);
  closeModal('rejectModal');
  pendingRejectId = null;
  logActivity('borrow', `Request rejected: "${r.bookTitle}"`, `Student: ${r.studentId} · Reason: ${r.remarks}`);
  showToast(`Access rejected for "${r.bookTitle}"`, 'info');
  refreshAll();
}

// --- Revoke Access ---
function revokeAccess(reqId) {
  openAdminConfirm('Revoke Access', 'This will immediately revoke the student\'s access to this book.', () => {
    const requests = getRequests();
    const r = requests[reqId];
    if (!r) return;
    r.status = 'Revoked';
    r.dateUpdated = new Date().toISOString();
    r.expiresAt = null;
    saveRequests(requests);
    logActivity('borrow', `Access revoked: "${r.bookTitle}"`, `Student: ${r.studentId}`);
    showToast(`Access revoked for "${r.bookTitle}"`, 'info');
    refreshAll();
  });
}

// --- Delete Request ---
function deleteRequest(reqId) {
  openAdminConfirm('Delete Request', 'Remove this request record permanently?', () => {
    const requests = getRequests();
    delete requests[reqId];
    saveRequests(requests);
    showToast('Request removed.', 'success');
    refreshAll();
  });
}

// --- USERS TABLE ---
function filterUsers(f, btn) {
  userFilter = f;
  document.querySelectorAll('#userTabs .filter-tab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderUsers();
}

function getLoginHistory() {
  try { return JSON.parse(localStorage.getItem('lisLoginHistory') || '[]'); } catch { return []; }
}
function saveLoginHistory(log) {
  localStorage.setItem('lisLoginHistory', JSON.stringify(log));
}

function renderUsers() {
  const users = getUsers();
  const online = getOnlineSet();
  const q = (document.getElementById('userSearch')?.value||'').toLowerCase();
  let list = [...users];

  if (userFilter === 'Active') {
    list = list.filter(u => u.active !== false);
  } else if (userFilter === 'Inactive') {
    list = list.filter(u => u.active === false);
  } else if (userFilter !== 'all') {
    list = list.filter(u => (u.role||'Faculty') === userFilter);
  }

  if (q) list = list.filter(u =>
    (u.fullName||'').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );

  const tbody = document.getElementById('usersTbody');
  const empty = document.getElementById('usersEmpty');
  if (!list.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  tbody.innerHTML = list.map(u => {
    const isOn = online.has(u.email);
    const role = u.role||'Faculty';
    const isActive = u.active !== false;
    const lastLogin = u.lastLogin ? fmtDate(u.lastLogin) : '—';

    const toggleLabel = isActive ? 'Deactivate' : 'Activate';
    const toggleClass = isActive ? 'danger' : 'approve';
    const toggleIcon = isActive ? 'fa-user-slash' : 'fa-user-check';

    return `<tr${!isActive ? ' style="opacity:.55"' : ''}>
      <td data-label="Name">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:${avatarColor(u.email)};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;color:#fff;flex-shrink:0">${initials(u.fullName,u.email)}</div>
          <span style="font-weight:600">${u.fullName||'—'}</span>
        </div>
      </td>
      <td data-label="Email" style="color:var(--text-muted)">${u.email}</td>
      <td data-label="Role">
        <select class="role-select" onchange="changeUserRole('${esc(u.email)}', this.value)" ${!isActive ? 'disabled' : ''}>
          <option value="Faculty" ${role==='Faculty'?'selected':''}>Faculty</option>
          <option value="Student" ${role==='Student'?'selected':''}>Student</option>
        </select>
      </td>
      <td data-label="Status"><span class="status-badge ${isActive?'badge-approved':'badge-rejected'}">${isActive?'Active':'Inactive'}</span></td>
      <td data-label="Online"><span class="status-badge ${isOn?'badge-online':'badge-offline'}">${isOn?'Online':'Offline'}</span></td>
      <td data-label="Last Login" style="color:var(--text-muted);font-size:.82rem">${lastLogin}</td>
      <td data-label="Joined" style="color:var(--text-muted)">${fmtDate(u.createdAt)}</td>
      <td data-label="Actions"><div class="tbl-actions">
        <button class="tbl-btn" onclick="showUserDetail('${esc(u.email)}')"><i class="fas fa-eye"></i></button>
        <button class="tbl-btn" onclick="resetUserPassword('${esc(u.email)}')" title="Reset Password"><i class="fas fa-key"></i></button>
        <button class="tbl-btn ${toggleClass}" onclick="toggleUserActive('${esc(u.email)}')" title="${toggleLabel}"><i class="fas ${toggleIcon}"></i></button>
        <button class="tbl-btn danger" onclick="confirmDeleteUser('${esc(u.email)}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

// --- ACTIVATE / DEACTIVATE ---
function toggleUserActive(email) {
  let users = getUsers();
  const u = users.find(x => x.email === email);
  if (!u) return;
  const newState = u.active === false ? true : false;
  const label = newState ? 'Activate' : 'Deactivate';
  openAdminConfirm(`${label} User`, `${label} account for "${u.fullName || email}"?`, () => {
    let users2 = getUsers();
    const u2 = users2.find(x => x.email === email);
    if (u2) {
      u2.active = newState;
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users2));
      logActivity('user', `User "${email}" ${newState ? 'activated' : 'deactivated'}`, 'Admin action');
      showToast(`Account ${newState ? 'activated' : 'deactivated'}.`, newState ? 'success' : 'info');
      refreshAll();
    }
  });
}

// --- RESET PASSWORD ---
function resetUserPassword(email) {
  openAdminConfirm('Reset Password', `Reset password for "${email}" to the default "password123"?`, () => {
    let users = getUsers();
    const u = users.find(x => x.email === email);
    if (u) {
      u.password = 'password123';
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
      logActivity('user', `Password reset for "${email}"`, 'Admin action');
      showToast(`Password reset to default for "${email}".`, 'success');
    }
  });
}

// --- CHANGE ROLE ---
function changeUserRole(email, newRole) {
  let users = getUsers();
  const u = users.find(x => x.email === email);
  if (!u || u.role === newRole) return;
  u.role = newRole;
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  logActivity('user', `Role changed for "${email}"`, `New role: ${newRole}`);
  showToast(`Role updated to ${newRole}.`, 'success');
  refreshAll();
}

// --- BOOKS TABLE ---
function filterBooks(f, btn) {
  bookFilter = f;
  document.querySelectorAll('#bookTabs .filter-tab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBooks();
}

function getBookPopularity(bookName) {
  // Count from requests + reading history sessions
  const reqs = getRequests();
  let score = Object.values(reqs).filter(r => r.bookTitle === bookName).length;
  const allHist = getAllReadingHistories();
  Object.values(allHist).forEach(({ data }) => {
    if (data[bookName]) score += (data[bookName].sessions || 1);
  });
  return score;
}

function accessBadge(level) {
  const map = {
    Public: 'badge-approved', Restricted: 'badge-pending', Faculty: 'badge-faculty'
  };
  return `<span class="status-badge ${map[level]||'badge-pending'}">${level||'Restricted'}</span>`;
}

function renderBooks() {
  const inv = getInventory();
  const q = (document.getElementById('bookSearch')?.value||'').toLowerCase();
  let items = Object.entries(inv);

  if (bookFilter === 'Archived') {
    items = items.filter(([,d]) => d.archived);
  } else if (bookFilter !== 'all') {
    items = items.filter(([,d]) => d.bin === bookFilter && !d.archived);
  } else {
    items = items.filter(([,d]) => !d.archived);
  }

  if (q) items = items.filter(([name,d]) =>
    name.toLowerCase().includes(q) || (d.author||'').toLowerCase().includes(q) ||
    (d.tags||[]).some(t => t.toLowerCase().includes(q))
  );

  const tbody = document.getElementById('booksTbody');
  const empty = document.getElementById('booksEmpty');
  if (!items.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  tbody.innerHTML = items.map(([name,d]) => {
    const tags = (d.tags||[]).map(t=>`<span style="background:rgba(59,130,246,.12);color:#60a5fa;padding:2px 7px;border-radius:99px;font-size:.72rem">${t}</span>`).join(' ')||'—';
    const pop = getBookPopularity(name);
    const popBar = `<div style="display:flex;align-items:center;gap:8px"><div class="rank-bar-track" style="width:60px;margin:0"><div class="rank-bar-fill" style="width:${Math.min(pop*10,100)}%;background:#3b82f6"></div></div><span style="font-size:.78rem;color:var(--text-muted)">${pop}</span></div>`;
    const access = d.accessLevel || 'Restricted';

    let actions = '';
    if (d.archived) {
      actions = `
        <button class="tbl-btn approve" onclick="unarchiveBook('${esc(name)}')"><i class="fas fa-box-open"></i> Restore</button>
        <button class="tbl-btn danger" onclick="confirmDeleteBook('${esc(name)}')"><i class="fas fa-trash"></i></button>`;
    } else {
      actions = `
        <button class="tbl-btn" onclick="openEditBookModal('${esc(name)}')"><i class="fas fa-pen"></i> Edit</button>
        <button class="tbl-btn" onclick="archiveBook('${esc(name)}')"><i class="fas fa-archive"></i></button>
        <button class="tbl-btn danger" onclick="confirmDeleteBook('${esc(name)}')"><i class="fas fa-trash"></i></button>`;
    }

    return `<tr>
      <td data-label="ID" style="font-weight:700;color:var(--text-muted)">#${d.id||'?'}</td>
      <td data-label="Title" style="font-weight:600">${name}${d.pdfFileName ? ' <i class="fas fa-file-pdf" style="color:#f43f5e;font-size:.7rem" title="PDF attached"></i>' : ''}</td>
      <td data-label="Author" style="color:var(--text-muted)">${d.author||'—'}</td>
      <td data-label="Status">${d.archived ? '<span class="status-badge badge-expired">Archived</span>' : statusBadge(d.bin)}</td>
      <td data-label="Categories" style="max-width:160px">${tags}</td>
      <td data-label="Access">${accessBadge(access)}</td>
      <td data-label="Popularity">${popBar}</td>
      <td data-label="Date Added" style="color:var(--text-muted)">${fmtDate(d.dateAdded)}</td>
      <td data-label="Actions"><div class="tbl-actions">${actions}</div></td>
    </tr>`;
  }).join('');
}

// --- ADD BOOK ---
function openAddBookModal() {
  document.getElementById('bookFormTitle').textContent = 'Add New Book';
  document.getElementById('bookFormSaveBtn').textContent = 'Add Book';
  document.getElementById('bookFormOrigName').value = '';
  document.getElementById('bookFormName').value = '';
  document.getElementById('bookFormAuthor').value = '';
  document.getElementById('bookFormTags').value = '';
  document.getElementById('bookFormAccess').value = 'Restricted';
  document.getElementById('bookFormPdf').value = '';
  document.getElementById('bookFormPdfStatus').textContent = '';
  openModal('bookFormModal');
}

// --- EDIT BOOK ---
function openEditBookModal(name) {
  const inv = getInventory();
  const d = inv[name];
  if (!d) return;
  document.getElementById('bookFormTitle').textContent = 'Edit Book';
  document.getElementById('bookFormSaveBtn').textContent = 'Save Changes';
  document.getElementById('bookFormOrigName').value = name;
  document.getElementById('bookFormName').value = name;
  document.getElementById('bookFormAuthor').value = d.author || '';
  document.getElementById('bookFormTags').value = (d.tags||[]).join(', ');
  document.getElementById('bookFormAccess').value = d.accessLevel || 'Restricted';
  document.getElementById('bookFormPdf').value = '';
  document.getElementById('bookFormPdfStatus').textContent = d.pdfFileName ? `Current: ${d.pdfFileName}` : '';
  openModal('bookFormModal');
}

// --- SAVE BOOK (add or edit) ---
function saveBookForm() {
  const origName = document.getElementById('bookFormOrigName').value;
  const name = document.getElementById('bookFormName').value.trim();
  if (!name) { showToast('Book title is required.', 'error'); return; }

  const inv = getInventory();
  const isEdit = !!origName;

  // Check for duplicate name (only if new or renamed)
  if (!isEdit && inv[name]) { showToast('A book with this title already exists.', 'error'); return; }
  if (isEdit && origName !== name && inv[name]) { showToast('A book with this new title already exists.', 'error'); return; }

  const author = document.getElementById('bookFormAuthor').value.trim();
  const tagsStr = document.getElementById('bookFormTags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const accessLevel = document.getElementById('bookFormAccess').value;
  const pdfInput = document.getElementById('bookFormPdf');
  let pdfFileName = isEdit ? (inv[origName]?.pdfFileName || '') : '';
  if (pdfInput.files && pdfInput.files[0]) {
    pdfFileName = pdfInput.files[0].name;
  }

  if (isEdit) {
    const existing = inv[origName];
    if (origName !== name) delete inv[origName];
    inv[name] = { ...existing, author, tags, accessLevel, pdfFileName };
    inv[name].dateUpdated = new Date().toISOString();
  } else {
    // Generate unique ID
    let id;
    do { id = Math.floor(1000 + Math.random() * 9000).toString(); }
    while (Object.values(inv).some(d => d.id === id));

    inv[name] = {
      id, author, tags, accessLevel, pdfFileName,
      bin: 'Books', isBorrowed: false, borrower: '',
      dateAdded: new Date().toISOString(), archived: false
    };
  }

  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  closeModal('bookFormModal');
  logActivity('register', isEdit ? `Book "${name}" updated` : `Book "${name}" added`, `by Admin`);
  showToast(isEdit ? `"${name}" updated.` : `"${name}" added to catalog.`, 'success');
  refreshAll();
}

// --- ARCHIVE / UNARCHIVE ---
function archiveBook(name) {
  openAdminConfirm('Archive Book', `Move "${name}" to the archive? It will be hidden from the main library.`, () => {
    const inv = getInventory();
    if (inv[name]) {
      inv[name].archived = true;
      inv[name].dateUpdated = new Date().toISOString();
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
      logActivity('register', `Book "${name}" archived`, 'Admin action');
      showToast(`"${name}" archived.`, 'info');
      refreshAll();
    }
  });
}

function unarchiveBook(name) {
  const inv = getInventory();
  if (inv[name]) {
    inv[name].archived = false;
    inv[name].dateUpdated = new Date().toISOString();
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
    logActivity('register', `Book "${name}" restored from archive`, 'Admin action');
    showToast(`"${name}" restored.`, 'success');
    refreshAll();
  }
}

// --- ACTIVITY LOG ---
function renderActivity() {
  const el = document.getElementById('activityTimeline');
  const em = document.getElementById('activityEmpty');
  if (!activityLog.length) { el.innerHTML=''; em.classList.remove('hidden'); return; }
  em.classList.add('hidden');
  const iconMap = { borrow:'fa-hand-holding-hand', return:'fa-undo-alt', register:'fa-book-open', user:'fa-user-plus' };
  el.innerHTML = activityLog.map(a=>`
    <div class="activity-item">
      <div class="act-icon ${a.type}"><i class="fas ${iconMap[a.type]||'fa-circle'}"></i></div>
      <div class="act-body">
        <div class="act-title">${a.title}</div>
        <div class="act-meta">${a.meta||''}</div>
      </div>
      <div class="act-time">${fmtDate(a.time)}<br><small>${fmtTime(a.time)}</small></div>
    </div>`).join('');
}

// --- DETAIL MODALS ---
function showBookDetail(name) {
  const inv = getInventory();
  const d = inv[name];
  if (!d) return;
  const body = document.getElementById('bookDetailBody');
  const person = d.isBorrowed ? d.borrower : d.bin==='Returned' ? d.returner : '—';
  const personLabel = d.isBorrowed ? 'Borrowed By' : d.bin==='Returned' ? 'Returned By' : 'Person';
  const pop = getBookPopularity(name);
  body.innerHTML = `<div class="detail-grid">
    <div class="detail-field"><label>Book ID</label><span>#${d.id||'?'}</span></div>
    <div class="detail-field"><label>Status</label><span>${d.archived ? 'Archived' : (d.bin||'—')}</span></div>
    <div class="detail-field full"><label>Title</label><span>${name}</span></div>
    <div class="detail-field full"><label>Author</label><span>${d.author||'—'}</span></div>
    <div class="detail-field full"><label>Categories</label><span>${(d.tags||[]).join(', ')||'—'}</span></div>
    <div class="detail-field"><label>Access Level</label><span>${d.accessLevel||'Restricted'}</span></div>
    <div class="detail-field"><label>${personLabel}</label><span>${person||'—'}</span></div>
    <div class="detail-field"><label>PDF File</label><span>${d.pdfFileName||'None'}</span></div>
    <div class="detail-field"><label>Popularity</label><span>${pop} interaction(s)</span></div>
    <div class="detail-field"><label>Date Added</label><span>${fmtDate(d.dateAdded)}</span></div>
    <div class="detail-field"><label>Last Updated</label><span>${fmtDate(d.dateUpdated)}</span></div>
  </div>`;
  openModal('bookDetailModal');
}

function showUserDetail(email) {
  const users = getUsers();
  const u = users.find(x=>x.email===email);
  if (!u) return;
  const online = getOnlineSet();
  const body = document.getElementById('userDetailBody');
  const inv = getInventory();
  
  // Calculate stats
  const borrowCount = Object.values(inv).filter(d=>d.borrower===u.email||d.borrower===u.fullName).length;
  const loginLog = getLoginHistory().filter(h => h.email === email).slice(0, 10);
  const isActive = u.active !== false;

  let auditHTML = '';
  if (!loginLog.length) {
    auditHTML = `<div class="mini-empty">No login history recorded</div>`;
  } else {
    auditHTML = loginLog.map(h => `
      <div class="audit-row">
        <div class="audit-info">
          <span class="audit-action">${h.action === 'login' ? '🔑 Login' : '🚪 Logout'}</span>
          <span class="audit-time">${fmtDate(h.time)} ${fmtTime(h.time)}</span>
        </div>
        <div class="audit-meta">${h.ip || 'Unknown IP'} · ${h.device || 'Browser Session'}</div>
      </div>
    `).join('');
  }

  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-field full" style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
        <div style="width:52px;height:52px;border-radius:50%;background:${avatarColor(u.email)};display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:800;color:#fff">${initials(u.fullName,u.email)}</div>
        <div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text)">${u.fullName||'—'}</div>
          <div style="color:var(--text-muted);font-size:.85rem">${u.email}</div>
        </div>
      </div>
      <div class="detail-field"><label>ID Number</label><span>${u.idNumber||'—'}</span></div>
      <div class="detail-field"><label>Role</label><span>${u.role||'Faculty'}</span></div>
      <div class="detail-field"><label>Account Status</label><span>${isActive ? '🟢 Active' : '🔴 Deactivated'}</span></div>
      <div class="detail-field"><label>Online Status</label><span>${online.has(u.email)?'🟢 Online':'⚫ Offline'}</span></div>
      <div class="detail-field"><label>Joined</label><span>${fmtDate(u.createdAt)}</span></div>
      <div class="detail-field"><label>Last Login</label><span>${u.lastLogin ? fmtDate(u.lastLogin) : 'Never'}</span></div>
      <div class="detail-field full">
        <label>Activity Stats</label>
        <div style="font-size:.9rem;color:var(--text-muted);margin-top:4px">
          ${borrowCount} book record(s) · ${loginLog.length} recent session(s)
        </div>
      </div>
      <div class="detail-field full" style="margin-top:10px">
        <label>Login History Audit (Recent 10)</label>
        <div class="audit-container">${auditHTML}</div>
      </div>
    </div>`;
  openModal('userDetailModal');
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// --- CONFIRM / DELETE ---
function openAdminConfirm(title, msg, fn) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  pendingConfirmFn = fn;
  document.getElementById('adminConfirm').classList.remove('hidden');
}
function closeAdminConfirm() {
  document.getElementById('adminConfirm').classList.add('hidden');
  pendingConfirmFn = null;
}
function executeAdminConfirm() {
  const fn = pendingConfirmFn;
  closeAdminConfirm();
  if (typeof fn === 'function') fn();
}

function confirmDeleteBook(name) {
  openAdminConfirm('Delete Book', `Remove "${name}" from the catalog? This cannot be undone.`, () => {
    const inv = getInventory();
    delete inv[name];
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
    logActivity('register', `Book "${name}" deleted by Admin`, 'Admin action');
    showToast(`"${name}" removed from catalog.`, 'success');
    refreshAll();
  });
}

function confirmDeleteUser(email) {
  openAdminConfirm('Remove User', `Remove user "${email}" from the system? This cannot be undone.`, () => {
    let users = getUsers().filter(u=>u.email!==email);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    logActivity('user', `User "${email}" removed by Admin`, 'Admin action');
    showToast(`User removed.`, 'success');
    refreshAll();
  });
}

// --- USAGE CHART ---
function updateUsageChart(mode, btn) {
  if (btn) {
    document.querySelectorAll('#usageTabs .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const canvas = document.getElementById('usageChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 300 * dpr;
  canvas.style.height = '300px';
  canvas.style.width = '100%';
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 300;

  // Gather timestamps
  const timestamps = [];
  const inv = getInventory();
  Object.values(inv).forEach(d => { if (d.dateAdded) timestamps.push(new Date(d.dateAdded)); });
  const reqs = getRequests();
  Object.values(reqs).forEach(r => { if (r.dateRequested) timestamps.push(new Date(r.dateRequested)); });

  // Build buckets
  const now = new Date();
  let labels = [], counts = [];
  if (mode === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      labels.push(d.toLocaleDateString('en-US',{weekday:'short'}));
      counts.push(timestamps.filter(t => t.toISOString().slice(0,10) === key).length);
    }
  } else if (mode === 'weekly') {
    for (let i = 3; i >= 0; i--) {
      const wEnd = new Date(now); wEnd.setDate(wEnd.getDate() - i*7);
      const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6);
      labels.push(`${wStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${wEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`);
      counts.push(timestamps.filter(t => t >= wStart && t <= wEnd).length);
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-US',{month:'short',year:'2-digit'}));
      counts.push(timestamps.filter(t => t.getMonth()===d.getMonth() && t.getFullYear()===d.getFullYear()).length);
    }
  }

  const max = Math.max(...counts, 1);
  const pad = {top:30, right:20, bottom:40, left:44};
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = Math.min(40, (chartW / labels.length) * 0.5);

  ctx.clearRect(0,0,W,H);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(240,246,255,0.35)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(max - (max/4)*i), pad.left - 8, y + 4);
  }

  // Bars
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#7c3aed');

  labels.forEach((lbl, i) => {
    const x = pad.left + (chartW / labels.length) * (i + 0.5) - barW/2;
    const barH = (counts[i] / max) * chartH;
    const y = pad.top + chartH - barH;

    ctx.fillStyle = gradient;
    ctx.beginPath();
    const r = 4;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, pad.top + chartH);
    ctx.lineTo(x, pad.top + chartH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();

    // Value on top
    if (counts[i] > 0) {
      ctx.fillStyle = '#f0f6ff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(counts[i], x + barW/2, y - 8);
    }

    // Label
    ctx.fillStyle = 'rgba(240,246,255,0.5)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, x + barW/2, H - pad.bottom + 18);
  });
}

function esc(str) { return (str||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

// --- REPORTS & ANALYTICS ---
function renderReports() {
  if (currentSection !== 'reports') return;

  const allHist = getAllReadingHistories();
  const reqs = getRequests();
  const users = getUsers();
  const loginHist = getLoginHistory();

  // 1. Most Active Students
  const studentActivity = {};
  loginHist.forEach(h => {
    if (h.action === 'login') {
      studentActivity[h.email] = (studentActivity[h.email] || 0) + 1;
    }
  });
  const sortedStudents = Object.entries(studentActivity).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const activeStudentsHTML = sortedStudents.length ? sortedStudents.map(([email, count]) => {
    const u = users.find(x => x.email === email);
    const name = u ? u.fullName || email : email;
    return `
      <div class="mini-row">
        <div class="mini-avatar" style="background:${avatarColor(email)};color:#fff">${initials(name, email)}</div>
        <div class="mini-info" style="flex:1">
          <div class="mini-name">${name}</div>
        </div>
        <div class="mini-count">${count} logins</div>
      </div>
    `;
  }).join('') : '<div class="mini-empty">No activity data</div>';
  document.getElementById('reportMostActiveStudents').innerHTML = activeStudentsHTML;

  // 2. Most Requested Books
  const bookReqCounts = {};
  Object.values(reqs).forEach(r => {
    bookReqCounts[r.bookTitle] = (bookReqCounts[r.bookTitle] || 0) + 1;
  });
  const sortedBooks = Object.entries(bookReqCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const requestedBooksHTML = sortedBooks.length ? sortedBooks.map(([title, count], i) => `
    <div class="mini-row">
      <div class="mini-rank">${i+1}</div>
      <div class="mini-info" style="flex:1">
        <div class="mini-name">${title}</div>
      </div>
      <div class="mini-count">${count} requests</div>
    </div>
  `).join('') : '<div class="mini-empty">No requests found</div>';
  document.getElementById('reportMostRequestedBooks').innerHTML = requestedBooksHTML;

  // 3. Draw Charts
  drawReadingAnalyticsChart();
  drawPeakHoursChart();
  drawDepartmentUsageChart(users);
}

function drawReadingAnalyticsChart() {
  const canvas = document.getElementById('readingAnalyticsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  if (rect.width === 0) return;
  
  canvas.width = rect.width * dpr;
  canvas.height = 250 * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 250;
  
  ctx.clearRect(0, 0, W, H);
  
  // Mock data for last 7 days reading sessions
  const data = [12, 25, 18, 30, 22, 45, 38];
  const max = Math.max(...data, 10);
  
  // Fill gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
  
  ctx.beginPath();
  ctx.moveTo(0, H - 20);
  data.forEach((val, i) => {
    const x = (W / (data.length - 1)) * i;
    const y = H - (val / max) * (H - 40) - 20;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(W, H - 20);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Line
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = (W / (data.length - 1)) * i;
    const y = H - (val / max) * (H - 40) - 20;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Points
  data.forEach((val, i) => {
    const x = (W / (data.length - 1)) * i;
    const y = H - (val / max) * (H - 40) - 20;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  
  // Labels
  ctx.fillStyle = 'rgba(240,246,255,0.5)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  days.forEach((day, i) => {
    const x = (W / (data.length - 1)) * i;
    ctx.fillText(day, x === 0 ? x + 10 : x === W ? x - 15 : x, H - 5);
  });
}

function drawPeakHoursChart() {
  const canvas = document.getElementById('peakHoursChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  if (rect.width === 0) return;
  
  canvas.width = rect.width * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 200;
  
  ctx.clearRect(0, 0, W, H);
  
  const data = [15, 45, 30, 10]; // Morning, Afternoon, Evening, Night
  const labels = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const max = Math.max(...data, 10);
  
  const barW = Math.min(40, (W / data.length) - 10);
  data.forEach((val, i) => {
    const x = (W / data.length) * (i + 0.5) - barW/2;
    const barH = (val / max) * (H - 30);
    const y = H - 20 - barH;
    
    // Bar gradient
    const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
    gradient.addColorStop(0, '#f59e0b');
    gradient.addColorStop(1, '#d97706');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    const r = 4;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();
    
    // Value
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(val, x + barW/2, y - 5);
    
    // Label
    ctx.fillStyle = 'rgba(240,246,255,0.5)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(labels[i], x + barW/2, H - 2);
  });
}

function drawDepartmentUsageChart(users) {
  const canvas = document.getElementById('departmentUsageChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  if (rect.width === 0) return;
  
  canvas.width = rect.width * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 200;
  
  ctx.clearRect(0, 0, W, H);
  
  const facultyCount = users.filter(u => u.role === 'Faculty').length || 1; // Fallback to 1 to show chart
  const studentCount = users.filter(u => u.role === 'Student').length || 1;
  const total = facultyCount + studentCount;
  
  const cx = W / 2, cy = H / 2 - 10;
  const r = Math.min(cx, cy) - 20;
  
  let startAngle = -Math.PI / 2;
  const data = [
    { val: facultyCount, color: '#3b82f6', label: 'Faculty' },
    { val: studentCount, color: '#8b5cf6', label: 'Student' }
  ];
  
  data.forEach(d => {
    const sliceAngle = (d.val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.fillStyle = d.color;
    ctx.fill();
    startAngle += sliceAngle;
  });
  
  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.65, 0, 2 * Math.PI);
  // Need to get computed style background color to match properly
  const bgColor = window.getComputedStyle(canvas.parentElement).backgroundColor || '#1e293b'; // Fallback
  ctx.fillStyle = bgColor;
  ctx.fill();
  
  // Legend
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3b82f6';
  ctx.fillText(`Faculty: ${Math.round((facultyCount/total)*100)}%`, W/4, H - 2);
  ctx.fillStyle = '#8b5cf6';
  ctx.fillText(`Student: ${Math.round((studentCount/total)*100)}%`, (W/4)*3, H - 2);
}

function exportReport(format) {
  if (format === 'pdf') {
    showToast('Preparing PDF Report...', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  } else if (format === 'excel') {
    const users = getUsers();
    const reqs = getRequests();
    
    let csv = "REPORT: SYSTEM SUMMARY\\n\\n";
    csv += "USERS\\n";
    csv += "Name,Email,Role,Status,Joined\\n";
    users.forEach(u => {
      csv += `"${u.fullName || ''}","${u.email}","${u.role}","${u.active !== false ? 'Active' : 'Inactive'}","${u.createdAt}"\\n`;
    });
    
    csv += "\\nREQUESTS\\n";
    csv += "Request ID,Student,Book Title,Status,Requested Date\\n";
    Object.values(reqs).forEach(r => {
      csv += `"${r.id}","${r.studentId}","${r.bookTitle}","${r.status}","${r.dateRequested}"\\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Librarian_Analytics_Report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Analytics Data Exported to CSV.', 'success');
  }
}
