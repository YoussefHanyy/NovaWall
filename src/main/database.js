const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * DatabaseManager — JSON file-based storage for NovaWall.
 * Uses atomic writes and in-memory caching for performance.
 */
class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath.replace('.db', '.json');
    this.data = null;
  }

  initialize() {
    if (fs.existsSync(this.dbPath)) {
      try { 
        this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8')); 
      } catch (e) {
        console.error('Failed to parse db:', e);
        if (fs.existsSync(this.dbPath + '.tmp')) {
          try { this.data = JSON.parse(fs.readFileSync(this.dbPath + '.tmp', 'utf-8')); }
          catch (e2) { this.data = null; }
        } else {
          this.data = null;
        }
        if (!this.data) {
          try { fs.renameSync(this.dbPath, this.dbPath + '.corrupted.' + Date.now()); } catch(e3) {}
        }
      }
    }
    if (!this.data) {
      this.data = { wallpapers: [], playlists: [], playlist_items: [], schedules: [], settings: {}, categories: [] };
      this._seedDefaults();
      this._save();
    }
  }

  _save() {
    try { 
      const tempPath = this.dbPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbPath);
    } catch (e) { 
      console.error('DB save error:', e); 
    }
  }

  _seedDefaults() {
    const defaults = {
      start_with_windows: 'false', pause_fullscreen: 'true', battery_saver: 'true',
      battery_threshold: '30', fps_limit: '30', default_fit_mode: 'fill',
      default_volume: '0', theme: 'dark', last_wallpaper_id: '', gpu_acceleration: 'true',
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (this.data.settings[k] === undefined) this.data.settings[k] = v;
    }
    const cats = [
      { id: 'nature', name: 'Nature', color: '#22c55e' },
      { id: 'abstract', name: 'Abstract', color: '#8b5cf6' },
      { id: 'anime', name: 'Anime', color: '#ec4899' },
      { id: 'space', name: 'Space', color: '#3b82f6' },
      { id: 'gaming', name: 'Gaming', color: '#ef4444' },
      { id: 'minimal', name: 'Minimal', color: '#6b7280' },
      { id: 'uncategorized', name: 'Uncategorized', color: '#6366f1' },
    ];
    cats.forEach(c => { if (!this.data.categories.find(x => x.id === c.id)) this.data.categories.push(c); });
    
    // Add a default playlist if none exist
    if (this.data.playlists.length === 0) {
      this.data.playlists.push({
        id: 'default',
        name: 'My Playlist',
        interval_ms: 3600000, // 1 hour
        shuffle: 0,
        is_active: 0,
        created_at: new Date().toISOString(),
        items: []
      });
    }
  }

  // ─── Wallpapers ───
  getWallpapers(filters = {}) {
    let list = [...this.data.wallpapers];
    if (filters.category) list = list.filter(w => w.category === filters.category);
    if (filters.type) list = list.filter(w => w.type === filters.type);
    if (filters.favorite) list = list.filter(w => w.is_favorite);
    if (filters.search) { const q = filters.search.toLowerCase(); list = list.filter(w => w.name.toLowerCase().includes(q)); }
    return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  getWallpaper(id) { return this.data.wallpapers.find(w => w.id === id) || null; }

  addWallpaper(d) {
    const wp = {
      id: uuidv4(), name: d.name, path: d.path, type: d.type,
      thumbnail: d.thumbnail || null, duration: d.duration || null,
      width: d.width || null, height: d.height || null,
      file_size: d.file_size || null, category: d.category || 'uncategorized',
      is_favorite: 0, fit_mode: d.fit_mode || 'fill', volume: d.volume || 0,
      metadata: d.metadata || null, created_at: new Date().toISOString(), last_used: null,
    };
    this.data.wallpapers.push(wp);
    this._save();
    return wp;
  }

  removeWallpaper(id) {
    this.data.wallpapers = this.data.wallpapers.filter(w => w.id !== id);
    this.data.playlist_items = this.data.playlist_items.filter(pi => pi.wallpaper_id !== id);
    this._save();
  }

  updateWallpaper(id, d) {
    const wp = this.getWallpaper(id); if (!wp) return null;
    const allowed = ['name','path','type','thumbnail','category','fit_mode','volume','is_favorite','metadata','last_used'];
    for (const k of allowed) { if (d[k] !== undefined) wp[k] = d[k]; }
    this._save(); return wp;
  }

  toggleFavorite(id) {
    const wp = this.getWallpaper(id); if (!wp) return null;
    wp.is_favorite = wp.is_favorite ? 0 : 1;
    this._save(); return wp;
  }

  // ─── Playlists ───
  getPlaylists() {
    return this.data.playlists.map(p => ({
      ...p, items: this.data.playlist_items
        .filter(pi => pi.playlist_id === p.id)
        .sort((a, b) => a.position - b.position)
        .map(pi => this.getWallpaper(pi.wallpaper_id)).filter(Boolean),
    }));
  }

  getPlaylist(id) {
    const p = this.data.playlists.find(pl => pl.id === id); if (!p) return null;
    return {
      ...p, items: this.data.playlist_items
        .filter(pi => pi.playlist_id === id)
        .sort((a, b) => a.position - b.position)
        .map(pi => this.getWallpaper(pi.wallpaper_id)).filter(Boolean),
    };
  }

  createPlaylist(d) {
    const pl = { id: uuidv4(), name: d.name, description: d.description || '', interval_ms: d.interval_ms || 3600000, shuffle: d.shuffle ? 1 : 0, is_active: 0, created_at: new Date().toISOString() };
    this.data.playlists.push(pl); this._save(); return this.getPlaylist(pl.id);
  }

  updatePlaylist(id, d) {
    const pl = this.data.playlists.find(p => p.id === id); if (!pl) return;
    for (const k of ['name','description','interval_ms','shuffle','is_active']) { if (d[k] !== undefined) pl[k] = d[k]; }
    this._save(); return this.getPlaylist(id);
  }

  deletePlaylist(id) {
    this.data.playlists = this.data.playlists.filter(p => p.id !== id);
    this.data.playlist_items = this.data.playlist_items.filter(pi => pi.playlist_id !== id);
    this._save();
  }

  addToPlaylist(pid, wid) {
    if (this.data.playlist_items.find(pi => pi.playlist_id === pid && pi.wallpaper_id === wid)) return;
    const maxPos = Math.max(-1, ...this.data.playlist_items.filter(pi => pi.playlist_id === pid).map(pi => pi.position));
    this.data.playlist_items.push({ playlist_id: pid, wallpaper_id: wid, position: maxPos + 1 });
    this._save();
  }

  removeFromPlaylist(pid, wid) {
    this.data.playlist_items = this.data.playlist_items.filter(pi => !(pi.playlist_id === pid && pi.wallpaper_id === wid));
    this._save();
  }

  movePlaylistItem(pid, wid, direction) {
    const items = this.data.playlist_items
      .filter(pi => pi.playlist_id === pid)
      .sort((a, b) => a.position - b.position);
    const index = items.findIndex(pi => pi.wallpaper_id === wid);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : direction === 'down' ? index + 1 : index;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const current = items[index];
    const target = items[targetIndex];
    const temp = current.position;
    current.position = target.position;
    target.position = temp;
    this._save();
  }

  activatePlaylist(id) {
    this.data.playlists.forEach(p => p.is_active = p.id === id ? 1 : 0);
    this._save();
  }

  deactivatePlaylist(id) {
    const pl = this.data.playlists.find(p => p.id === id); if (pl) pl.is_active = 0;
    this._save();
  }

  getActivePlaylist() {
    const active = this.data.playlists.find(p => p.is_active);
    return active ? this.getPlaylist(active.id) : null;
  }

  // ─── Schedules ───
  getSchedules() { return this.data.schedules; }
  createSchedule(d) {
    const s = { id: uuidv4(), ...d, is_active: 1 };
    this.data.schedules.push(s); this._save(); return s;
  }
  deleteSchedule(id) { this.data.schedules = this.data.schedules.filter(s => s.id !== id); this._save(); }

  // ─── Categories ───
  getCategories() { return this.data.categories.sort((a, b) => a.name.localeCompare(b.name)); }
  createCategory(name, color) {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (!this.data.categories.find(c => c.id === id)) { this.data.categories.push({ id, name, color: color || '#6366f1' }); this._save(); }
    return { id, name, color };
  }
  deleteCategory(id) { this.data.categories = this.data.categories.filter(c => c.id !== id); this._save(); }

  // ─── Settings ───
  getSetting(key) { return this.data.settings[key]; }
  setSetting(key, value) { this.data.settings[key] = String(value); this._save(); }
  getAllSettings() { return { ...this.data.settings }; }

  close() { this._save(); }
}

module.exports = { DatabaseManager };
