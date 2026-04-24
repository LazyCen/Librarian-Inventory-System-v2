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

  refreshAll();
});

// --- NAVIGATION ---
const SECTION_ICONS = {
  overview:'fa-chart-pie', requests:'fa-inbox',
  users:'fa-users', books:'fa-book-open', activity:'fa-clock-rotate-left'
};
const SECTION_LABELS = {
  overview:'Overview', requests:'All Requests',
  users:'Users', books:'Books', activity:'Activity Log'
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
  closeMobileSidebar();
}

// --- MOBILE SIDEBAR ---
function toggleMobileSidebar() {
  const sb = document.getElementById('adminSidebar');
  const ov = document.getElementById('sidebarOverlay');
  const isOpen = sb.classList.contains('open');
  sb.classList.toggle('open', !isOpen);
  ov.classList.toggle('active', !isOpen);
  ov.classList.toggle('hidden', isOpen);
}
function closeMobileSidebar() {
  document.getElementById('adminSidebar').classList.remove('open');
  const ov = document.getElementById('sidebarOverlay');
  ov.classList.remove('active');
  ov.classList.add('hidden');
}

// --- REFRESH ALL ---
function refreshAll() {
  renderOverview();
  renderRequests();
  renderUsers();
  renderBooks();
  renderActivity();
  updateRequestBadge();
}

function updateRequestBadge() {
  const inv = getInventory();
  const count = Object.values(inv).filter(d=>d.isBorrowed).length;
  const badge = document.getElementById('navRequestsBadge');
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
}

// --- OVERVIEW ---
function renderOverview() {
  const inv   = getInventory();
  const users = getUsers();
  const items = Object.entries(inv);
  const borrowed  = items.filter(([,d])=>d.isBorrowed);
  const returned  = items.filter(([,d])=>d.bin==='Returned');
  const tagSet    = new Set();
  items.forEach(([,d])=>(d.tags||[]).forEach(t=>tagSet.add(t)));

  document.getElementById('statTotalBooks').textContent     = items.length;
  document.getElementById('statBorrowed').textContent       = borrowed.length;
  document.getElementById('statReturned').textContent       = returned.length;
  document.getElementById('statUsers').textContent          = users.length;
  document.getElementById('statPendingRequests').textContent= borrowed.length;
  document.getElementById('statCategories').textContent     = tagSet.size;

  // Recent borrows
  const ob = document.getElementById('overviewBorrows');
  if (!borrowed.length) {
    ob.innerHTML = `<div class="mini-empty"><i class="fas fa-check-circle"></i>No active borrows</div>`;
  } else {
    ob.innerHTML = borrowed.slice(0,5).map(([name,d])=>`
      <div class="mini-row">
        <div class="mini-id amber">#${d.id||'?'}</div>
        <div class="mini-info">
          <div class="mini-name">${name}</div>
          <div class="mini-meta"><i class="fas fa-user-tag"></i> ${d.borrower||'Unknown'}</div>
        </div>
      </div>`).join('');
  }

  // Recent returns
  const or = document.getElementById('overviewReturns');
  if (!returned.length) {
    or.innerHTML = `<div class="mini-empty"><i class="fas fa-inbox"></i>No returns yet</div>`;
  } else {
    or.innerHTML = returned.slice(0,5).map(([name,d])=>`
      <div class="mini-row">
        <div class="mini-id green">#${d.id||'?'}</div>
        <div class="mini-info">
          <div class="mini-name">${name}</div>
          <div class="mini-meta"><i class="fas fa-user-check"></i> ${d.returner||'Unknown'}</div>
        </div>
      </div>`).join('');
  }

  // Users
  const ou = document.getElementById('overviewUsers');
  if (!users.length) {
    ou.innerHTML = `<div class="mini-empty"><i class="fas fa-user-slash"></i>No users yet</div>`;
  } else {
    const online = getOnlineSet();
    ou.innerHTML = users.slice(0,5).map(u=>`
      <div class="mini-row">
        <div class="mini-avatar" style="background:${avatarColor(u.email)};color:#fff">${initials(u.fullName,u.email)}</div>
        <div class="mini-info">
          <div class="mini-name">${u.fullName||u.email.split('@')[0]}</div>
          <div class="mini-meta">${u.role||'Faculty'} · ${online.has(u.email)?'<span style="color:#4ade80">Online</span>':'Offline'}</div>
        </div>
      </div>`).join('');
  }

  // Category bars
  const tagCounts = {};
  items.forEach(([,d])=>(d.tags||[]).forEach(t=>{ tagCounts[t]=(tagCounts[t]||0)+1; }));
  const sorted = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]);
  const max = sorted[0]?.[1] || 1;
  const colors = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#f43f5e','#06b6d4','#10b981','#ec4899'];
  const oc = document.getElementById('overviewCategories');
  if (!sorted.length) {
    oc.innerHTML = `<div class="mini-empty"><i class="fas fa-tags"></i>No categories added yet</div>`;
  } else {
    oc.innerHTML = sorted.slice(0,10).map(([tag,cnt],i)=>`
      <div class="cat-bar-row">
        <span class="cat-name">${tag}</span>
        <div class="cat-track"><div class="cat-fill" style="width:${(cnt/max*100).toFixed(1)}%;background:${colors[i%colors.length]}"></div></div>
        <span class="cat-count">${cnt}</span>
      </div>`).join('');
  }
}

// --- REQUESTS TABLE ---
function filterRequests(f, btn) {
  requestFilter = f;
  document.querySelectorAll('#requestTabs .filter-tab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderRequests();
}

function renderRequests() {
  const inv = getInventory();
  const q   = (document.getElementById('requestSearch')?.value||'').toLowerCase();
  let items = Object.entries(inv);

  if (requestFilter !== 'all') items = items.filter(([,d])=>d.bin===requestFilter);
  if (q) items = items.filter(([name,d])=>
    name.toLowerCase().includes(q) ||
    (d.borrower||'').toLowerCase().includes(q) ||
    (d.returner||'').toLowerCase().includes(q) ||
    (d.author||'').toLowerCase().includes(q)
  );

  const tbody = document.getElementById('requestsTbody');
  const empty = document.getElementById('requestsEmpty');
  if (!items.length) {
    tbody.innerHTML=''; empty.classList.remove('hidden'); return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = items.map(([name,d])=>{
    const person = d.isBorrowed ? (d.borrower||'—') : d.bin==='Returned' ? (d.returner||'—') : '—';
    const personLabel = d.isBorrowed ? `<i class="fas fa-user-tag" style="color:#f59e0b"></i> ${person}`
                      : d.bin==='Returned' ? `<i class="fas fa-user-check" style="color:#4ade80"></i> ${person}` : '—';
    const tags = (d.tags||[]).map(t=>`<span style="background:rgba(59,130,246,.12);color:#60a5fa;padding:2px 7px;border-radius:99px;font-size:.72rem">${t}</span>`).join(' ') || '—';
    return `<tr>
      <td style="font-weight:700;color:var(--text-muted)">#${d.id||'?'}</td>
      <td style="font-weight:600">${name}</td>
      <td style="color:var(--text-muted)">${d.author||'—'}</td>
      <td>${statusBadge(d.bin)}</td>
      <td>${personLabel}</td>
      <td style="max-width:180px">${tags}</td>
      <td style="color:var(--text-muted)">${fmtDate(d.dateAdded)}</td>
      <td><div class="tbl-actions">
        <button class="tbl-btn" onclick="showBookDetail('${esc(name)}')"><i class="fas fa-eye"></i> View</button>
        <button class="tbl-btn danger" onclick="confirmDeleteBook('${esc(name)}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

// --- USERS TABLE ---
function filterUsers(f, btn) {
  userFilter = f;
  document.querySelectorAll('#section-users .filter-tab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderUsers();
}

function renderUsers() {
  const users  = getUsers();
  const online = getOnlineSet();
  const q = (document.getElementById('userSearch')?.value||'').toLowerCase();
  let list = [...users];
  if (userFilter !== 'all') list = list.filter(u=>(u.role||'Faculty')===userFilter);
  if (q) list = list.filter(u=>
    (u.fullName||'').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );

  const tbody = document.getElementById('usersTbody');
  const empty = document.getElementById('usersEmpty');
  if (!list.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = list.map(u=>{
    const isOn = online.has(u.email);
    const role = u.role||'Faculty';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:${avatarColor(u.email)};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;color:#fff;flex-shrink:0">${initials(u.fullName,u.email)}</div>
          <span style="font-weight:600">${u.fullName||'—'}</span>
        </div>
      </td>
      <td style="color:var(--text-muted)">${u.email}</td>
      <td><span class="status-badge ${role==='Student'?'badge-student':'badge-faculty'}">${role}</span></td>
      <td><span class="status-badge ${isOn?'badge-online':'badge-offline'}">${isOn?'Online':'Offline'}</span></td>
      <td style="color:var(--text-muted)">${fmtDate(u.createdAt)}</td>
      <td><div class="tbl-actions">
        <button class="tbl-btn" onclick="showUserDetail('${esc(u.email)}')"><i class="fas fa-eye"></i> View</button>
        <button class="tbl-btn danger" onclick="confirmDeleteUser('${esc(u.email)}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

// --- BOOKS TABLE ---
function filterBooks(f, btn) {
  bookFilter = f;
  document.querySelectorAll('#section-books .filter-tab').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBooks();
}

function renderBooks() {
  const inv = getInventory();
  const q   = (document.getElementById('bookSearch')?.value||'').toLowerCase();
  let items = Object.entries(inv);
  if (bookFilter !== 'all') items = items.filter(([,d])=>d.bin===bookFilter);
  if (q) items = items.filter(([name,d])=>
    name.toLowerCase().includes(q)||(d.author||'').toLowerCase().includes(q)
  );

  const tbody = document.getElementById('booksTbody');
  const empty = document.getElementById('booksEmpty');
  if (!items.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = items.map(([name,d])=>{
    const person = d.isBorrowed ? `<i class="fas fa-user-tag" style="color:#f59e0b"></i> ${d.borrower||'—'}`
                 : d.bin==='Returned' ? `<i class="fas fa-user-check" style="color:#4ade80"></i> ${d.returner||'—'}` : '—';
    const tags = (d.tags||[]).map(t=>`<span style="background:rgba(59,130,246,.12);color:#60a5fa;padding:2px 7px;border-radius:99px;font-size:.72rem">${t}</span>`).join(' ')||'—';
    return `<tr>
      <td style="font-weight:700;color:var(--text-muted)">#${d.id||'?'}</td>
      <td style="font-weight:600">${name}</td>
      <td style="color:var(--text-muted)">${d.author||'—'}</td>
      <td>${statusBadge(d.bin)}</td>
      <td style="max-width:180px">${tags}</td>
      <td>${person}</td>
      <td style="color:var(--text-muted)">${fmtDate(d.dateAdded)}</td>
      <td><div class="tbl-actions">
        <button class="tbl-btn" onclick="showBookDetail('${esc(name)}')"><i class="fas fa-eye"></i> View</button>
        <button class="tbl-btn danger" onclick="confirmDeleteBook('${esc(name)}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');
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
  body.innerHTML = `<div class="detail-grid">
    <div class="detail-field"><label>Book ID</label><span>#${d.id||'?'}</span></div>
    <div class="detail-field"><label>Status</label><span>${d.bin||'—'}</span></div>
    <div class="detail-field full"><label>Title</label><span>${name}</span></div>
    <div class="detail-field full"><label>Author</label><span>${d.author||'—'}</span></div>
    <div class="detail-field full"><label>Categories</label><span>${(d.tags||[]).join(', ')||'—'}</span></div>
    <div class="detail-field"><label>${personLabel}</label><span>${person||'—'}</span></div>
    <div class="detail-field"><label>Date Added</label><span>${fmtDate(d.dateAdded)}</span></div>
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
  const borrowCount = Object.values(inv).filter(d=>d.borrower===u.email||d.borrower===u.fullName).length;
  body.innerHTML = `<div class="detail-grid">
    <div class="detail-field full" style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
      <div style="width:52px;height:52px;border-radius:50%;background:${avatarColor(u.email)};display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:800;color:#fff">${initials(u.fullName,u.email)}</div>
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--text)">${u.fullName||'—'}</div>
        <div style="color:var(--text-muted);font-size:.85rem">${u.email}</div>
      </div>
    </div>
    <div class="detail-field"><label>ID Number</label><span>${u.idNumber||'—'}</span></div>
    <div class="detail-field"><label>Role</label><span>${u.role||'Faculty'}</span></div>
    <div class="detail-field"><label>Status</label><span>${online.has(u.email)?'🟢 Online':'⚫ Offline'}</span></div>
    <div class="detail-field"><label>Joined</label><span>${fmtDate(u.createdAt)}</span></div>
    <div class="detail-field"><label>Activity</label><span>${borrowCount} borrow record(s)</span></div>
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

// --- UTILITY ---
function esc(str) { return (str||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
