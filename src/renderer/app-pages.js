/* ═══════════════════════════════════════
   NovaWall — Playlists, Settings, Actions
   ═══════════════════════════════════════ */

// ─── Playlists Page ───
function renderPlaylists() {
  const pls = state.playlists;
  return `
    <div class="page-header">
      <div><h1 class="page-title">Playlists</h1><p class="page-subtitle">Auto-rotate your wallpapers</p></div>
      <button class="btn btn-primary" onclick="createNewPlaylist()">+ New Playlist</button>
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
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();selectPlaylist('${p.id}')">View</button>
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
        <div><h1 class="page-title">${playlist.name}</h1><p class="page-subtitle">${items.length} wallpaper${items.length !== 1 ? 's' : ''} in this playlist</p></div>
        <button class="btn btn-secondary" onclick="closePlaylistDetails()">Close</button>
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
            return `<div class="playlist-item-row">
              <div class="playlist-item-index">${index + 1}</div>
              <div class="playlist-item-thumb"><img src="${fileUrl}" alt="${wp.name}" loading="lazy"></div>
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
      <div class="settings-section-title">⚡ Performance</div>
      <div class="slider-row"><div class="toggle-label">FPS Limit<small>Lower saves resources</small></div>
        <div class="slider-control"><input type="range" min="10" max="60" step="5" value="${s.fps_limit||30}" onchange="updateSetting('fps_limit',this.value);this.nextElementSibling.textContent=this.value+'fps'"><span class="slider-value">${s.fps_limit||30}fps</span></div></div>
      <div class="toggle-row"><div class="toggle-label">Pause during fullscreen<small>Saves resources while gaming</small></div>
        <div class="toggle ${s.pause_fullscreen!=='false'?'active':''}" onclick="toggleSetting(this,'pause_fullscreen')"></div></div>
      <div class="toggle-row"><div class="toggle-label">GPU Acceleration</div>
        <div class="toggle ${s.gpu_acceleration!=='false'?'active':''}" onclick="toggleSetting(this,'gpu_acceleration')"></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">🔋 Battery</div>
      <div class="toggle-row"><div class="toggle-label">Battery Saver<small>Reduce FPS on battery</small></div>
        <div class="toggle ${s.battery_saver!=='false'?'active':''}" onclick="toggleSetting(this,'battery_saver')"></div></div>
      <div class="slider-row"><div class="toggle-label">Battery Threshold</div>
        <div class="slider-control"><input type="range" min="10" max="80" step="5" value="${s.battery_threshold||30}" onchange="updateSetting('battery_threshold',this.value);this.nextElementSibling.textContent=this.value+'%'"><span class="slider-value">${s.battery_threshold||30}%</span></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">🖥️ Display</div>
      <div class="toggle-row"><div class="toggle-label">Default Fit Mode</div>
        <select class="input" style="width:120px" onchange="updateSetting('default_fit_mode',this.value)">
          <option value="fill" ${s.default_fit_mode==='fill'?'selected':''}>Fill</option>
          <option value="stretch" ${s.default_fit_mode==='stretch'?'selected':''}>Stretch</option>
          <option value="center" ${s.default_fit_mode==='center'?'selected':''}>Center</option></select></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">🚀 General</div>
      <div class="toggle-row"><div class="toggle-label">Start with Windows</div>
        <div class="toggle ${s.start_with_windows==='true'?'active':''}" onclick="toggleSetting(this,'start_with_windows')"></div></div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">📦 Data</div>
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

async function createNewPlaylist() {
  const name = window.novawall ? await window.novawall.showPrompt('Playlist name:') : prompt('Playlist name:');
  if (!name) return;
  if (window.novawall) { const pl = await window.novawall.createPlaylist({ name }); state.playlists.unshift(pl); showToast('Playlist created!'); renderPage(); }
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

async function addToPlaylist(e, wid) {
  if (e) e.stopPropagation();
  const activePl = state.playlists.find(p => p.is_active) || state.playlists[0];
  if (!activePl) {
    showToast('Create a playlist first!', 'error');
    return;
  }
  if (window.novawall) {
    const updated = await window.novawall.addToPlaylist(activePl.id, wid);
    const idx = state.playlists.findIndex(p => p.id === activePl.id);
    if (idx >= 0) state.playlists[idx] = updated;
    showToast(`Added to ${activePl.name}`);
  }
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
