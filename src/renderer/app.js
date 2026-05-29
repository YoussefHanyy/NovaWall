/* ═══════════════════════════════════════
   NovaWall — UI Application (Part 1: Core)
   ═══════════════════════════════════════ */

// ─── State ───
const state = {
  currentPage: 'home',
  wallpapers: [],
  playlists: [],
  categories: [],
  settings: {},
  searchQuery: '',
  activeFilter: 'all',
  selectedPlaylistId: null,
  newPlaylistName: '',
  playlistRenameDraft: '',
  playlistRenameTargetId: null,
  importPendingFiles: [],
};

// ─── Toast System ───
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-dot"></span>${msg}`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── Navigation ───
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentPage = btn.dataset.page;
    renderPage();
  });
});

async function loadData() {
  if (!window.novawall) return;
  try {
    state.wallpapers = await window.novawall.getWallpapers({}) || [];
    state.playlists = await window.novawall.getPlaylists() || [];
    state.categories = await window.novawall.getCategories() || [];
    state.settings = await window.novawall.getAllSettings() || {};
  } catch (e) { console.warn('Failed to load data:', e); }
}

function renderPage() {
  const content = document.getElementById('content');
  content.style.animation = 'none';
  content.offsetHeight; // reflow
  content.style.animation = 'fadeIn 0.3s ease';
  
  const pages = { home: renderHome, playlists: renderPlaylists, favorites: renderFavorites, settings: renderSettings };
  const renderer = pages[state.currentPage] || renderHome;
  content.innerHTML = renderer();
  attachPageListeners();
}

// ─── Home Page ───
function renderHome() {
  const totalWp = state.wallpapers.length;
  const favCount = state.wallpapers.filter(w => w.is_favorite).length;
  const plCount = state.playlists.length;
  const recent = state.wallpapers.slice(0, 6);

  return `
    <div class="page-header">
      <div><h1 class="page-title">Welcome to NovaWall</h1><p class="page-subtitle">Your desktop, your canvas</p></div>
      <button class="btn btn-primary" onclick="openImportModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Wallpaper
      </button>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${totalWp}</div><div class="stat-label">Wallpapers</div></div>
      <div class="stat-card"><div class="stat-value">${favCount}</div><div class="stat-label">Favorites</div></div>
      <div class="stat-card"><div class="stat-value">${plCount}</div><div class="stat-label">Playlists</div></div>
      <div class="stat-card"><div class="stat-value">${state.settings.fps_limit || 30}</div><div class="stat-label">FPS Limit</div></div>
    </div>
    <h3 class="section-heading">Recent Wallpapers</h3>
    ${recent.length ? `<div class="wallpaper-grid">${recent.map(w => wallpaperCard(w)).join('')}</div>` : emptyState('No wallpapers yet', 'Import your first wallpaper to get started')}
  `;
}


// ─── Favorites Page ───
function renderFavorites() {
  const favs = state.wallpapers.filter(w => w.is_favorite);
  return `
    <div class="page-header"><div><h1 class="page-title">Favorites</h1><p class="page-subtitle">${favs.length} favorites</p></div></div>
    ${favs.length ? `<div class="wallpaper-grid">${favs.map(w => wallpaperCard(w)).join('')}</div>` : emptyState('No favorites yet', 'Click the heart icon on any wallpaper')}
  `;
}

// ─── Wallpaper Card ───
function wallpaperCard(wp) {
  const isActive = state.settings.last_wallpaper_id === wp.id;
  const mediaTag = mediaThumb(wp);

  return `
    <div class="wallpaper-card ${isActive ? 'card-active-ring' : ''}" ondblclick="applyWallpaper('${wp.id}')" onmouseenter="playCardVideo(this)" onmouseleave="pauseCardVideo(this)">
      ${mediaTag}
      <span class="card-badge">${wp.type.toUpperCase()}</span>
      <div class="card-actions">
        <button onclick="toggleFav(event, '${wp.id}')" title="Favorite" class="${wp.is_favorite ? 'favorited' : ''}">♥</button>
        <button onclick="addToPlaylist(event, '${wp.id}')" title="Add to playlist">➕</button>
        <button onclick="previewWallpaper(event, '${wp.id}')" title="Preview">▶</button>
        <button onclick="deleteWallpaper(event, '${wp.id}')" title="Delete">✕</button>
      </div>
      <div class="card-overlay">
        <div class="card-title">${wp.name}</div>
        <div class="card-meta">${wp.category} · ${formatSize(wp.file_size)}</div>
      </div>
    </div>`;
}

function emptyState(title, sub) {
  return `<div class="empty-state">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    <p>${title}</p><small>${sub}</small>
  </div>`;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ─── Media Helpers ───
function isVideo(wp) { return wp.type === 'mp4' || wp.type === 'webm'; }
function fileUrl(wp) { return 'file:///' + wp.path.replace(/\\/g, '/'); }
function mediaThumb(wp) {
  return isVideo(wp)
    ? `<video src="${fileUrl(wp)}" muted loop preload="metadata"></video>`
    : `<img src="${fileUrl(wp)}" loading="lazy" alt="${wp.name}">`;
}
