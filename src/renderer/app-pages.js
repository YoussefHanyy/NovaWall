/* ═══════════════════════════════════════
   NovaWall — Playlists, Settings, Actions
   ═══════════════════════════════════════ */

// ─── Playlists Page ───
function renderPlaylists() {
  console.log('Rendering playlists page, state.playlists:', state.playlists);
  const pls = state.playlists;
  return `
    <div class="page-header">
      <div><h1 class="page-title">Playlists</h1><p class="page-subtitle">Auto-rotate your wallpapers</p></div>
      <div class="playlist-create-row">
        <input id="new-playlist-name" class="input" type="text" placeholder="New playlist name" value="${state.newPlaylistName || ''}" oninput="state.newPlaylistName=this.value" />
        <button class="btn btn-primary" onclick="createPlaylistInline()">+ Create</button>
      </div>
    </div>
    <div class="playlist-list">
      ${pls.length ? pls.map(p => {
        const count = p.items ? p.items.length : 0;
        return `<div class="playlist-card ${p.is_active ? 'active-playlist' : ''}" onclick="selectPlaylist('${p.id}')">
          <div class="playlist-info">
            <div class="playlist-icon">${p.is_active ? '▶' : '🎵'}</div>
            <div><div class="playlist-name">${p.name}</div>
            <div class="playlist-meta">${count} wallpapers</div>
            <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
              <select class="input" style="width:110px; padding:4px 8px; font-size:12px;" onchange="event.stopPropagation();updatePlaylistInterval('${p.id}', this.value)">
                <option value="60000" ${p.interval_ms==60000?'selected':''}>1 Min</option>
                <option value="300000" ${p.interval_ms==300000?'selected':''}>5 Min</option>
                <option value="900000" ${p.interval_ms==900000?'selected':''}>15 Min</option>
                <option value="3600000" ${p.interval_ms==3600000?'selected':''}>1 Hour</option>
                <option value="86400000" ${p.interval_ms==86400000?'selected':''}>1 Day</option>
              </select>
              <select class="input" style="width:100px; padding:4px 8px; font-size:12px;" onchange="event.stopPropagation();updatePlaylistShuffle('${p.id}', this.value)">
                <option value="0" ${!p.shuffle?'selected':''}>Sequential</option>
                <option value="1" ${p.shuffle?'selected':''}>Shuffle</option>
              </select>
            </div></div>
          </div>
          <div class="playlist-actions">
            ${p.is_active
              ? `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();deactivatePlaylist('${p.id}')">⏸ Stop</button>`
              : `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();activatePlaylist('${p.id}')">▶ Play</button>`}
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openEditPlaylistModal('${p.id}')">View</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deletePlaylist('${p.id}')">✕</button>
          </div>
        </div>`;
      }).join('') : emptyState('No playlists yet', 'Create a playlist to auto-rotate wallpapers')}
    </div>
    ${renderPlaylistDetails()}
  `;
}

function formatInterval(ms) {
  if (!ms) return '1 hour';
  if (ms < 60000) return Math.round(ms / 1000) + 's';
  if (ms < 3600000) return Math.round(ms / 60000) + ' min';
  if (ms < 86400000) return Math.round(ms / 3600000) + ' hour';
  return Math.round(ms / 86400000) + ' day';
}

function renderPlaylistDetails() {
  if (!state.selectedPlaylistId) return '';
  const playlist = state.playlists.find(p => p.id === state.selectedPlaylistId);
  if (!playlist) return '';
  const items = playlist.items || [];
  return `
    <div class="playlist-details">
      <div class="page-header" style="margin-top:24px;">
        <div style="width:100%; display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap;">
          <div style="flex:1; min-width:220px;">
            <h1 class="page-title" style="margin-bottom:6px;">${playlist.name}</h1>
            <p class="page-subtitle" style="margin:0;">${items.length} wallpaper${items.length !== 1 ? 's' : ''} in this playlist</p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button class="btn btn-secondary" onclick="closePlaylistDetails()">Close</button>
          </div>
        </div>
      </div>
      <div style="margin-top:16px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input id="rename-playlist-name" class="input" type="text" value="${state.playlistRenameTargetId===playlist.id ? state.playlistRenameDraft : playlist.name}" placeholder="Rename playlist" style="flex:1; min-width:220px; padding:10px 14px;" oninput="state.playlistRenameDraft=this.value" />
        <button class="btn btn-primary" onclick="confirmEditPlaylistInline('${playlist.id}')">Save</button>
        <button class="btn btn-secondary" onclick="cancelPlaylistRename()">Cancel</button>
      </div>
      <div class="playlist-detail-card">
        <div style="margin-bottom:12px; display:flex; gap:12px; flex-wrap:wrap;">
          <div><strong>Rotation:</strong> ${playlist.shuffle ? 'Shuffle' : 'Sequential'}</div>
          <div><strong>Interval:</strong> ${formatInterval(playlist.interval_ms)}</div>
          <div><strong>Status:</strong> ${playlist.is_active ? 'Active' : 'Inactive'}</div>
        </div>
        <div class="playlist-items-table">
          ${items.length ? items.map((wp, index) => {
            const fileUrl = 'file:///' + wp.path.replace(/\\/g, '/');
            const isVideo = wp.type === 'mp4' || wp.type === 'webm';
            const thumb = isVideo
              ? `<video src="${fileUrl}" muted loop preload="metadata"></video>`
              : `<img src="${fileUrl}" alt="${wp.name}" loading="lazy">`;
            return `<div class="playlist-item-row">
              <div class="playlist-item-index">${index + 1}</div>
              <div class="playlist-item-thumb">${thumb}</div>
              <div class="playlist-item-meta">
                <div class="playlist-item-name">${wp.name}</div>
                <div class="playlist-item-sub">${wp.category} · ${formatSize(wp.file_size)}</div>
              </div>
              <div class="playlist-item-actions">
                <button class="btn btn-sm" onclick="movePlaylistItem('${playlist.id}','${wp.id}','up')">↑</button>
                <button class="btn btn-sm" onclick="movePlaylistItem('${playlist.id}','${wp.id}','down')">↓</button>
                <button class="btn btn-sm btn-secondary" onclick="applyWallpaper('${wp.id}')">Apply</button>
                <button class="btn btn-sm btn-danger" onclick="removeFromPlaylist('${playlist.id}','${wp.id}')">Remove</button>
              </div>
            </div>`;
          }).join('') : `<div class="empty-state" style="margin:0; padding:24px"><p>This playlist has no wallpapers yet.</p><small>Add wallpapers from the library and reorder them here.</small></div>`}
        </div>
      </div>
    </div>`;
}

// ─── Settings Page ───
function renderSettings() {
  const s = state.settings;
  return `
    <div class="page-header"><div><h1 class="page-title">Settings</h1></div></div>
    <div class="settings-section">
      <div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Performance</div>
      <div class="slider-row"><div class="toggle-label">FPS Limit<small>Lower saves resources</small></div>
        <div class="slider-control"><input type="range" min="10" max="60" step="5" value="${s.fps_limit||30}" onchange="updateSetting('fps_limit',this.value);this.nextElementSibling.textContent=this.value+'fps'"><span class="slider-value">${s.fps_limit||30}fps</span></div></div>
      <div class="toggle-row"><div class="toggle-label">Pause during fullscreen<small>Saves resources while gaming</small></div>
        <div class="toggle ${s.pause_fullscreen!=='false'?'active':''}" onclick="toggleSetting(this,'pause_fullscreen')"></div></div>
      <div class="toggle-row"><div class="toggle-label">GPU Acceleration</div>
        <div class="toggle ${s.gpu_acceleration!=='false'?'active':''}" onclick="toggleSetting(this,'gpu_acceleration')"></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/></svg> Battery</div>
      <div class="toggle-row"><div class="toggle-label">Battery Saver<small>Reduce FPS on battery</small></div>
        <div class="toggle ${s.battery_saver!=='false'?'active':''}" onclick="toggleSetting(this,'battery_saver')"></div></div>
      <div class="slider-row"><div class="toggle-label">Battery Threshold</div>
        <div class="slider-control"><input type="range" min="10" max="80" step="5" value="${s.battery_threshold||30}" onchange="updateSetting('battery_threshold',this.value);this.nextElementSibling.textContent=this.value+'%'"><span class="slider-value">${s.battery_threshold||30}%</span></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Display</div>
      <div class="toggle-row"><div class="toggle-label">Default Fit Mode</div>
        <select class="input" style="width:120px" onchange="updateSetting('default_fit_mode',this.value)">
          <option value="fill" ${s.default_fit_mode==='fill'?'selected':''}>Fill</option>
          <option value="stretch" ${s.default_fit_mode==='stretch'?'selected':''}>Stretch</option>
          <option value="center" ${s.default_fit_mode==='center'?'selected':''}>Center</option></select></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> General</div>
      <div class="toggle-row"><div class="toggle-label">Start with Windows</div>
        <div class="toggle ${s.start_with_windows==='true'?'active':''}" onclick="toggleSetting(this,'start_with_windows')"></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> Data</div>
      <div class="flex-gap-8"><button class="btn btn-secondary" onclick="importCollection()">Import Collection</button></div>
    </div>`;
}

// ─── Actions ───
async function applyWallpaper(id) {
  if (!window.novawall) return;
  await window.novawall.setWallpaper(id);
  state.settings.last_wallpaper_id = id;
  showToast('Wallpaper applied!'); renderPage();
}
async function toggleFav(e, id) {
  if (e) e.stopPropagation();
  if (!window.novawall) return;
  const wp = await window.novawall.toggleFavorite(id);
  const idx = state.wallpapers.findIndex(w => w.id === id);
  if (idx >= 0 && wp) state.wallpapers[idx] = wp;
  showToast(wp.is_favorite ? 'Added to favorites' : 'Removed from favorites'); renderPage();
}
async function deleteWallpaper(e, id) {
  if (e) e.stopPropagation();
  const confirmed = window.novawall ? await window.novawall.showConfirm('Delete this wallpaper?') : confirm('Delete this wallpaper?');
  if (!confirmed) return;
  if (window.novawall) await window.novawall.removeWallpaper(id);
  state.wallpapers = state.wallpapers.filter(w => w.id !== id);
  showToast('Wallpaper deleted', 'error'); renderPage();
}
function previewWallpaper(e, id) {
  if (e) e.stopPropagation();
  const wp = state.wallpapers.find(w => w.id === id); if (!wp) return;
  const modal = document.getElementById('preview-modal');
  const player = document.getElementById('preview-player');
  const info = document.getElementById('preview-info');
  const isVideo = wp.type === 'mp4' || wp.type === 'webm';
  const src = `file:///${wp.path.replace(/\\/g, '/')}`;
  player.innerHTML = isVideo ? `<video src="${src}" autoplay loop controls style="width:100%;max-height:60vh;object-fit:contain"></video>` : `<img src="${src}" style="width:100%;max-height:60vh;object-fit:contain">`;
  info.innerHTML = `<h3 style="margin-bottom:8px">${wp.name}</h3><p style="color:var(--text-muted);font-size:13px">${wp.category} · ${wp.type.toUpperCase()} · ${formatSize(wp.file_size)}</p>
    <div style="margin-top:16px;display:flex;gap:8px"><button class="btn btn-primary" onclick="applyWallpaper('${wp.id}');closePreview()">Apply</button><button class="btn btn-secondary" onclick="closePreview()">Close</button></div>`;
  modal.classList.remove('hidden');
}
function closePreview() { document.getElementById('preview-modal').classList.add('hidden'); document.getElementById('preview-player').innerHTML = ''; }

function createNewPlaylist() {
  openCreatePlaylistModal();
}

function openCreatePlaylistModal() {
  console.log('Opening create playlist modal');
  const modal = document.getElementById('create-playlist-modal');
  const input = document.getElementById('create-playlist-name');
  console.log('Modal element:', modal, 'Input element:', input);
  if (!modal || !input) {
    console.error('Modal or input elements not found!');
    return;
  }
  input.value = '';
  modal.classList.remove('hidden');
  console.log('Modal should now be visible');
  setTimeout(() => input.focus(), 100);
}

function closeCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  if (modal) modal.classList.add('hidden');
}

async function confirmCreatePlaylist() {
  const input = document.getElementById('create-playlist-name');
  if (!input) {
    console.error('Create playlist input not found');
    return;
  }
  const name = input.value.trim();
  if (!name) {
    showToast('Playlist name is required', 'error');
    return;
  }
  try {
    if (!window.novawall) {
      console.error('window.novawall not available');
      showToast('Error: Backend not available', 'error');
      return;
    }
    const pl = await window.novawall.createPlaylist({ name });
    state.playlists.unshift(pl);
    showToast('Playlist created!');
    closeCreatePlaylistModal();
    renderPage();
  } catch (e) {
    console.error('Create playlist error:', e);
    showToast('Failed to create playlist: ' + e.message, 'error');
  }
}

function openEditPlaylistModal(playlistId) {
  const modal = document.getElementById('edit-playlist-modal');
  const input = document.getElementById('edit-playlist-name');
  if (!modal || !input) return;
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) return;
  playlistEditTargetId = playlistId;
  input.value = playlist.name;
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
}

function closeEditPlaylistModal() {
  const modal = document.getElementById('edit-playlist-modal');
  if (modal) modal.classList.add('hidden');
  playlistEditTargetId = null;
}

async function confirmEditPlaylist() {
  const input = document.getElementById('edit-playlist-name');
  if (!input) {
    console.error('Edit playlist input not found');
    return;
  }
  const name = input.value.trim();
  if (!name) {
    showToast('Playlist name is required', 'error');
    return;
  }
  if (!playlistEditTargetId) {
    console.error('No playlist target ID');
    showToast('Error: No playlist selected', 'error');
    return;
  }
  try {
    if (!window.novawall) {
      console.error('window.novawall not available');
      showToast('Error: Backend not available', 'error');
      return;
    }
    const updated = await window.novawall.updatePlaylist(playlistEditTargetId, { name });
    const idx = state.playlists.findIndex(p => p.id === playlistEditTargetId);
    if (idx >= 0) state.playlists[idx] = updated;
    if (state.selectedPlaylistId === playlistEditTargetId) state.selectedPlaylistId = playlistEditTargetId;
    showToast('Playlist renamed!');
    closeEditPlaylistModal();
    renderPage();
  } catch (e) {
    console.error('Edit playlist error:', e);
    showToast('Failed to rename playlist: ' + e.message, 'error');
  }
}

async function activatePlaylist(id) { if (window.novawall) await window.novawall.activatePlaylist(id); state.playlists.forEach(p => p.is_active = p.id === id ? 1 : 0); showToast('Playlist activated!'); renderPage(); }
async function deactivatePlaylist(id) { if (window.novawall) await window.novawall.deactivatePlaylist(id); state.playlists.forEach(p => { if (p.id === id) p.is_active = 0; }); renderPage(); }
async function deletePlaylist(id) { 
  const confirmed = window.novawall ? await window.novawall.showConfirm('Delete playlist?') : confirm('Delete?');
  if (!confirmed) return; 
  if (window.novawall) await window.novawall.deletePlaylist(id); 
  state.playlists = state.playlists.filter(p => p.id !== id); renderPage(); 
}

async function updatePlaylistInterval(id, val) {
  if (window.novawall) await window.novawall.updatePlaylist(id, { interval_ms: parseInt(val) });
  const p = state.playlists.find(x => x.id === id);
  if (p) p.interval_ms = parseInt(val);
  renderPage();
}

async function updatePlaylistShuffle(id, val) {
  if (window.novawall) await window.novawall.updatePlaylist(id, { shuffle: val === "1" ? 1 : 0 });
  const p = state.playlists.find(x => x.id === id);
  if (p) p.shuffle = val === "1" ? 1 : 0;
  renderPage();
}

async function selectPlaylist(id) {
  if (!window.novawall) return;
  const playlist = await window.novawall.getPlaylist(id);
  if (!playlist) return;
  state.selectedPlaylistId = id;
  const index = state.playlists.findIndex(p => p.id === id);
  if (index >= 0) state.playlists[index] = playlist;
  renderPage();
}

function closePlaylistDetails() {
  state.selectedPlaylistId = null;
  renderPage();
}

async function removeFromPlaylist(pid, wid) {
  if (!window.novawall) return;
  const updated = await window.novawall.removeFromPlaylist(pid, wid);
  const idx = state.playlists.findIndex(p => p.id === pid);
  if (idx >= 0) state.playlists[idx] = updated;
  if (state.selectedPlaylistId === pid) state.selectedPlaylistId = pid;
  showToast('Wallpaper removed from playlist', 'error');
  renderPage();
}

async function movePlaylistItem(pid, wid, direction) {
  if (!window.novawall) return;
  const updated = await window.novawall.movePlaylistItem(pid, wid, direction);
  const idx = state.playlists.findIndex(p => p.id === pid);
  if (idx >= 0) state.playlists[idx] = updated;
  renderPage();
}

let pendingWallpaperIdForPlaylist = null;
let playlistEditTargetId = null;

function addToPlaylist(e, wid) {
  e.stopPropagation();
  if (!state.playlists || state.playlists.length === 0) {
    showToast('Create a playlist first!', 'error');
    return;
  }
  pendingWallpaperIdForPlaylist = wid;
  const button = e.target.closest('button') || e.target;
  openPlaylistSelectDropdown(button);
}

function openPlaylistSelectDropdown(button) {
  const dropdown = document.getElementById('playlist-select-dropdown');
  if (!dropdown) return;
  const list = document.getElementById('playlist-select-list');
  list.innerHTML = state.playlists.map(p => 
    `<button type="button" onclick="event.stopPropagation(); confirmAddToPlaylist('${p.id}')">
      <span style="font-size: 14px;">${p.is_active ? '▶' : '🎵'}</span>
      ${p.name}
    </button>`
  ).join('');

  dropdown.classList.remove('hidden');

  const rect = button.getBoundingClientRect();
  const dropdownWidth = 260;
  const dropdownHeight = Math.min(240, state.playlists.length * 48 + 48);
  let left = rect.left;
  let top = rect.bottom + 6;

  if (left + dropdownWidth > window.innerWidth - 12) {
    left = window.innerWidth - dropdownWidth - 12;
  }
  if (top + dropdownHeight > window.innerHeight - 12) {
    top = rect.top - dropdownHeight - 6;
  }

  dropdown.style.width = dropdownWidth + 'px';
  dropdown.style.left = `${Math.max(left, 12)}px`;
  dropdown.style.top = `${Math.max(top, 12)}px`;

  const closeHandler = (e) => {
    if (!dropdown.contains(e.target)) {
      closePlaylistSelectDropdown();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 0);
}

function closePlaylistSelectDropdown() {
  const dropdown = document.getElementById('playlist-select-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
  pendingWallpaperIdForPlaylist = null;
}

async function confirmAddToPlaylist(pid) {
  if (!window.novawall || !pendingWallpaperIdForPlaylist) return;
  const pl = state.playlists.find(p => p.id === pid);
  const updated = await window.novawall.addToPlaylist(pid, pendingWallpaperIdForPlaylist);
  const idx = state.playlists.findIndex(p => p.id === pid);
  if (idx >= 0) state.playlists[idx] = updated;
  showToast(`Added to ${pl ? pl.name : 'playlist'}`);
  closePlaylistSelectDropdown();
}
async function importCollection() { if (window.novawall) { await window.novawall.importCollection(); await loadData(); showToast('Imported!'); renderPage(); } }
function updateSetting(key, val) { if (window.novawall) window.novawall.setSetting(key, String(val)); state.settings[key] = String(val); }
function toggleSetting(el, key) { const active = el.classList.toggle('active'); updateSetting(key, active ? 'true' : 'false'); }
function setFilter(f) { state.activeFilter = f; renderPage(); }
function onSearch(q) { state.searchQuery = q; renderPage(); }
function playCardVideo(c) { const v = c.querySelector('video'); if (v) v.play().catch(()=>{}); }
function pauseCardVideo(c) { const v = c.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }

// ─── Import Modal ───
function openImportModal() { document.getElementById('import-modal').classList.remove('hidden'); populateCategorySelect(); }
function closeImportModal() { document.getElementById('import-modal').classList.add('hidden'); state.importPendingFiles = []; document.getElementById('import-options').classList.add('hidden'); }
function switchImportTab(tab) {
  document.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('import-file-tab').classList.toggle('hidden', tab !== 'file');
  document.getElementById('import-url-tab').classList.toggle('hidden', tab !== 'url');
}
function populateCategorySelect() {
  const sel = document.getElementById('import-category');
  if (sel) sel.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
async function browseFiles() {
  if (!window.novawall) return;
  const files = await window.novawall.openFileDialog();
  if (files && files.length) { state.importPendingFiles = files; document.getElementById('import-name').value = files[0].split(/[/\\]/).pop().replace(/\.\w+$/, ''); document.getElementById('import-options').classList.remove('hidden'); }
}
async function importFromUrl() {
  const url = document.getElementById('import-url-input').value.trim(); if (!url) return;
  try { showToast('Downloading...'); const wp = await window.novawall.importWallpaperFromUrl(url); state.wallpapers.unshift(wp); showToast('Imported!'); closeImportModal(); renderPage(); }
  catch (e) { showToast('Failed: ' + e.message, 'error'); }
}
async function confirmImport() {
  const name = document.getElementById('import-name').value.trim() || 'Untitled';
  const category = document.getElementById('import-category').value || 'uncategorized';
  for (const fp of state.importPendingFiles) { try { const wp = await window.novawall.addWallpaper({ path: fp, name, category }); state.wallpapers.unshift(wp); } catch (e) { showToast('Failed', 'error'); } }
  showToast(`${state.importPendingFiles.length} wallpaper(s) imported!`); closeImportModal(); renderPage();
}
function attachPageListeners() {}

// ─── Inline Playlist Helpers ───
async function createPlaylistInline() {
  const input = document.getElementById('new-playlist-name');
  if (!input) return;
  const name = input.value.trim();
  if (!name) { showToast('Enter a playlist name', 'error'); return; }
  if (!window.novawall) { showToast('Backend not available', 'error'); return; }
  try {
    const pl = await window.novawall.createPlaylist({ name });
    state.playlists.unshift(pl);
    state.newPlaylistName = '';
    showToast('Playlist created!');
    renderPage();
  } catch (e) {
    showToast('Failed to create playlist: ' + e.message, 'error');
  }
}

async function confirmEditPlaylistInline(playlistId) {
  const input = document.getElementById('rename-playlist-name');
  if (!input) return;
  const name = input.value.trim();
  if (!name) { showToast('Playlist name is required', 'error'); return; }
  if (!window.novawall) { showToast('Backend not available', 'error'); return; }
  try {
    const updated = await window.novawall.updatePlaylist(playlistId, { name });
    const idx = state.playlists.findIndex(p => p.id === playlistId);
    if (idx >= 0) state.playlists[idx] = updated;
    state.playlistRenameDraft = '';
    state.playlistRenameTargetId = null;
    showToast('Playlist renamed!');
    renderPage();
  } catch (e) {
    showToast('Failed to rename playlist: ' + e.message, 'error');
  }
}

function cancelPlaylistRename() {
  state.playlistRenameDraft = '';
  state.playlistRenameTargetId = null;
  renderPage();
}

// ─── Drop Zone & Init ───
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('drop-zone');
  if (dz) {
    ['dragenter','dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('drag-over'); }));
    ['dragleave','drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('drag-over'); }));
    dz.addEventListener('drop', ev => { const files = Array.from(ev.dataTransfer.files).map(f => f.path); if (files.length) { state.importPendingFiles = files; document.getElementById('import-name').value = files[0].split(/[/\\]/).pop().replace(/\.\w+$/, ''); document.getElementById('import-options').classList.remove('hidden'); } });
  }
  loadData().then(() => renderPage());
});
if (window.novawall) { window.novawall.onWallpaperChanged(wp => { state.settings.last_wallpaper_id = wp.id; renderPage(); }); }
