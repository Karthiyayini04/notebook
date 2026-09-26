// ── API helper ─────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const token = localStorage.getItem('nb_token');
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── State ──────────────────────────────────────────────────────────────────
let notes = [];
let tags = JSON.parse(localStorage.getItem('nb_tags') || '[]'); // tags are local
let activeNoteId = null;
let activeTagFilter = 'all';
let saveTimer = null;
let quill = null;
let currentUser = null;

// ── Auth ───────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('nb_token'); }
function saveSession(token, username) {
  localStorage.setItem('nb_token', token);
  localStorage.setItem('nb_user', username);
}
function clearSession() {
  localStorage.removeItem('nb_token');
  localStorage.removeItem('nb_user');
}
function isLoggedIn() { return !!getToken(); }

// ── Show/hide pages ────────────────────────────────────────────────────────
function showApp(username) {
  currentUser = username;
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  document.getElementById('userDisplay').textContent = username;
  document.getElementById('userAvatar').textContent = username[0].toUpperCase();
  loadNotes();
}

function showAuth() {
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('authPage').classList.remove('hidden');
}

// ── Auth forms ─────────────────────────────────────────────────────────────
function setAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.textContent = loading
    ? (btnId === 'loginBtn' ? 'Signing in…' : 'Creating account…')
    : (btnId === 'loginBtn' ? 'Sign in' : 'Create account');
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  setAuthError('loginError', '');
  setLoading('loginBtn', true);
  try {
    const data = await api('POST', '/api/auth/login', {
      username: document.getElementById('loginUsername').value.trim(),
      password: document.getElementById('loginPassword').value
    });
    saveSession(data.token, data.username);
    showApp(data.username);
  } catch (err) {
    setAuthError('loginError', err.message);
  } finally {
    setLoading('loginBtn', false);
  }
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  setAuthError('registerError', '');
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;
  if (password !== confirm) {
    setAuthError('registerError', 'Passwords do not match');
    return;
  }
  setLoading('registerBtn', true);
  try {
    const data = await api('POST', '/api/auth/register', { username, password });
    saveSession(data.token, data.username);
    showApp(data.username);
  } catch (err) {
    setAuthError('registerError', err.message);
  } finally {
    setLoading('registerBtn', false);
  }
});

// Tab switching
document.getElementById('loginTab').addEventListener('click', () => {
  document.getElementById('loginTab').classList.add('active');
  document.getElementById('registerTab').classList.remove('active');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  setAuthError('loginError', '');
});
document.getElementById('registerTab').addEventListener('click', () => {
  document.getElementById('registerTab').classList.add('active');
  document.getElementById('loginTab').classList.remove('active');
  document.getElementById('registerForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
  setAuthError('registerError', '');
});

// Password toggle
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// Logout
document.getElementById('userMenuBtn').addEventListener('click', () => {
  document.getElementById('userDropdown').classList.toggle('hidden');
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  notes = [];
  activeNoteId = null;
  showAuth();
});
document.addEventListener('click', e => {
  if (!e.target.closest('.user-menu-wrap')) {
    document.getElementById('userDropdown').classList.add('hidden');
  }
});

// ── Load notes from backend ────────────────────────────────────────────────
async function loadNotes() {
  try {
    notes = await api('GET', '/api/notes');
    renderTagsSidebar();
    renderNotesList();
    if (notes.length) openNote(notes[0].id);
  } catch (err) {
    if (err.message.includes('401') || err.message.toLowerCase().includes('token')) {
      clearSession(); showAuth();
    }
    document.getElementById('notesList').innerHTML =
      '<div class="empty-list">Failed to load notes.</div>';
  }
}

// ── Notes CRUD ─────────────────────────────────────────────────────────────
async function createNote() {
  const note = await api('POST', '/api/notes', { title: '', content: '', tags: [] });
  notes.unshift(note);
  return note;
}

async function saveNote(id) {
  const title = document.getElementById('noteTitle').value;
  const content = quill.getText();
  const delta = JSON.stringify(quill.getContents());
  const note = getNote(id);
  if (!note) return;

  try {
    const updated = await api('PUT', '/api/notes/' + id, {
      title,
      content: delta, // storing delta as content for rich text
      tags: note.tags || []
    });
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], ...updated, title, tags: note.tags };
      notes.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    setSaveStatus('Saved');
    renderNotesList();
    setTimeout(() => setSaveStatus(''), 1500);
  } catch { setSaveStatus('Error saving'); }
}

async function deleteNoteById(id) {
  await api('DELETE', '/api/notes/' + id);
  notes = notes.filter(n => n.id !== id);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getNote(id) { return notes.find(n => n.id === id); }
function setSaveStatus(msg) { document.getElementById('saveStatus').textContent = msg; }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month:'short', day:'numeric' });
}
function plainText(content) {
  try {
    const delta = JSON.parse(content);
    if (delta.ops) return delta.ops.map(op => typeof op.insert === 'string' ? op.insert : '').join('').replace(/\n/g,' ').trim();
  } catch {}
  return (content || '').replace(/<[^>]+>/g, '').trim();
}
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Render ─────────────────────────────────────────────────────────────────
function getFiltered() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  return notes.filter(n => {
    const tagOk = activeTagFilter === 'all' || (n.tags||[]).includes(activeTagFilter);
    if (!tagOk) return false;
    if (!q) return true;
    return (n.title + ' ' + plainText(n.content)).toLowerCase().includes(q);
  });
}

function renderNotesList() {
  const el = document.getElementById('notesList');
  const filtered = getFiltered();
  if (!filtered.length) { el.innerHTML = '<div class="empty-list">No notes found.</div>'; return; }
  el.innerHTML = filtered.map(n => {
    const preview = plainText(n.content).slice(0, 60) || 'No content';
    const tagPills = (n.tags||[]).slice(0,2).map(t => `<span class="note-item-tag">${esc(t)}</span>`).join('');
    return `<div class="note-item ${n.id===activeNoteId?'active':''}" data-id="${n.id}">
      <div class="note-item-title">${esc(n.title)||'Untitled'}</div>
      <div class="note-item-preview">${esc(preview)}</div>
      <div class="note-item-meta">${timeAgo(n.updatedAt)} ${tagPills}</div>
    </div>`;
  }).join('');
  el.querySelectorAll('.note-item').forEach(el => {
    el.addEventListener('click', () => openNote(el.dataset.id));
  });
}

function renderTagsSidebar() {
  const el = document.getElementById('tagsList');
  const allBtn = `<button class="tag-filter ${activeTagFilter==='all'?'active':''}" data-tag="all">All notes</button>`;
  const tagBtns = tags.map(t =>
    `<button class="tag-filter ${activeTagFilter===t?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`
  ).join('');
  el.innerHTML = allBtn + tagBtns;
  el.querySelectorAll('.tag-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTagFilter = btn.dataset.tag;
      renderTagsSidebar(); renderNotesList();
    });
  });
}

// ── Open note ──────────────────────────────────────────────────────────────
function openNote(id) {
  activeNoteId = id;
  const note = getNote(id);
  if (!note) return;
  document.getElementById('editorPlaceholder').classList.add('hidden');
  document.getElementById('editorContainer').classList.remove('hidden');
  document.getElementById('noteTitle').value = note.title || '';
  try {
    const delta = JSON.parse(note.content);
    if (delta && delta.ops) { quill.setContents(delta, 'silent'); }
    else { quill.setText(note.content || '', 'silent'); }
  } catch { quill.setText(note.content || '', 'silent'); }
  renderActiveTags();
  renderNotesList();
  setSaveStatus('');
}

function renderActiveTags() {
  const note = getNote(activeNoteId);
  if (!note) return;
  const el = document.getElementById('activeTagsDisplay');
  el.innerHTML = (note.tags||[]).map(t => `
    <span class="active-tag">${esc(t)}
      <button data-tag="${esc(t)}" title="Remove">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>`).join('');
  el.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => removeTagFromNote(btn.dataset.tag));
  });
}

function removeTagFromNote(tag) {
  const note = getNote(activeNoteId);
  if (!note) return;
  note.tags = (note.tags||[]).filter(t => t !== tag);
  renderActiveTags(); renderNotesList();
  scheduleSave();
}

// ── Auto-save ──────────────────────────────────────────────────────────────
function scheduleSave() {
  setSaveStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (activeNoteId) saveNote(activeNoteId); }, 800);
}

// ── Tag modal ──────────────────────────────────────────────────────────────
function saveTags() { localStorage.setItem('nb_tags', JSON.stringify(tags)); }

function renderModalTags() {
  const note = getNote(activeNoteId);
  const el = document.getElementById('modalTagsList');
  if (!tags.length) { el.innerHTML = '<span style="color:var(--text-muted);font-size:13px">No tags yet.</span>'; return; }
  el.innerHTML = tags.map(t => {
    const has = note && (note.tags||[]).includes(t);
    return `<span class="modal-tag" style="${has ? 'background:var(--accent-light);color:var(--accent)' : ''}">
      <span data-tag="${esc(t)}" class="modal-tag-label" style="cursor:pointer">${esc(t)}</span>
      <button data-del="${esc(t)}" title="Delete tag">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>`;
  }).join('');
  el.querySelectorAll('.modal-tag-label').forEach(lbl => {
    lbl.addEventListener('click', () => {
      const note = getNote(activeNoteId); if (!note) return;
      const tag = lbl.dataset.tag;
      if ((note.tags||[]).includes(tag)) note.tags = note.tags.filter(t => t !== tag);
      else { note.tags = note.tags || []; note.tags.push(tag); }
      renderActiveTags(); renderNotesList(); renderModalTags(); scheduleSave();
    });
  });
  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.del;
      tags = tags.filter(t => t !== tag);
      notes.forEach(n => { n.tags = (n.tags||[]).filter(t => t !== tag); });
      saveTags();
      if (activeTagFilter === tag) activeTagFilter = 'all';
      renderTagsSidebar(); renderNotesList(); renderActiveTags(); renderModalTags();
    });
  });
}

// ── Theme ──────────────────────────────────────────────────────────────────
function initTheme() {
  const stored = localStorage.getItem('nb_theme') || 'light';
  document.documentElement.setAttribute('data-theme', stored);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nb_theme', next);
  });
}

// ── Quill ──────────────────────────────────────────────────────────────────
function initQuill() {
  quill = new Quill('#quillEditor', {
    theme: 'snow',
    placeholder: 'Start writing…',
    modules: {
      toolbar: [
        [{ header: [1,2,3,false] }],
        ['bold','italic','underline','strike'],
        ['blockquote','code-block'],
        [{ list:'ordered' },{ list:'bullet' }],
        ['link'],['clean']
      ]
    }
  });
  quill.on('text-change', () => { if (activeNoteId) scheduleSave(); });
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initQuill();

  // Check existing session
  if (isLoggedIn()) {
    showApp(localStorage.getItem('nb_user'));
  }

  // New note
  const newNote = async () => {
    try {
      const note = await createNote();
      renderTagsSidebar(); renderNotesList();
      openNote(note.id);
      document.getElementById('noteTitle').focus();
    } catch { alert('Failed to create note. Check your connection.'); }
  };
  document.getElementById('newNoteBtn').addEventListener('click', newNote);
  document.getElementById('placeholderNewBtn').addEventListener('click', newNote);

  // Title changes
  document.getElementById('noteTitle').addEventListener('input', scheduleSave);

  // Search
  document.getElementById('searchInput').addEventListener('input', renderNotesList);

  // Delete
  document.getElementById('deleteNoteBtn').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('hidden');
  });
  document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.add('hidden');
  });
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    document.getElementById('deleteModal').classList.add('hidden');
    if (!activeNoteId) return;
    try {
      await deleteNoteById(activeNoteId);
      activeNoteId = null;
      document.getElementById('editorPlaceholder').classList.remove('hidden');
      document.getElementById('editorContainer').classList.add('hidden');
      renderNotesList(); renderTagsSidebar();
    } catch { alert('Failed to delete note.'); }
  });

  // Tag modal
  document.getElementById('tagAddBtn').addEventListener('click', () => {
    renderModalTags();
    document.getElementById('tagModal').classList.remove('hidden');
    document.getElementById('newTagInput').focus();
  });
  document.getElementById('closeTagModal').addEventListener('click', () => {
    document.getElementById('tagModal').classList.add('hidden');
  });
  document.getElementById('tagModal').addEventListener('click', e => {
    if (e.target === document.getElementById('tagModal'))
      document.getElementById('tagModal').classList.add('hidden');
  });
  document.getElementById('deleteModal').addEventListener('click', e => {
    if (e.target === document.getElementById('deleteModal'))
      document.getElementById('deleteModal').classList.add('hidden');
  });

  const addTagAction = () => {
    const val = document.getElementById('newTagInput').value.trim();
    if (!val || tags.includes(val)) { document.getElementById('newTagInput').value=''; return; }
    tags.push(val); saveTags();
    renderTagsSidebar(); renderModalTags();
    document.getElementById('newTagInput').value = '';
  };
  document.getElementById('addTagBtn').addEventListener('click', addTagAction);
  document.getElementById('newTagInput').addEventListener('keydown', e => { if (e.key==='Enter') addTagAction(); });
});
