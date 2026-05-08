/**
 * PlaylistEngine — manages automatic wallpaper rotation, shuffle, and scheduling.
 */
class PlaylistEngine {
  constructor(db, wallpaperWindow) {
    this.db = db;
    this.wpWindow = wallpaperWindow;
    this.timer = null;
    this.currentIndex = 0;
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    this._checkAndAdvance();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  _checkAndAdvance() {
    if (!this.isRunning) return;

    // Check schedules first
    const scheduled = this._getScheduledWallpaper();
    if (scheduled) {
      this.wpWindow.loadWallpaper(scheduled);
      this._scheduleNext(60000); // Re-check schedules every minute
      return;
    }

    // Check active playlist
    const playlist = this.db.getActivePlaylist();
    if (!playlist || !playlist.items || playlist.items.length === 0) {
      this._scheduleNext(5000); // Check again in 5s
      return;
    }

    // Select next wallpaper
    let nextWp;
    if (playlist.shuffle) {
      const idx = Math.floor(Math.random() * playlist.items.length);
      nextWp = playlist.items[idx];
    } else {
      this.currentIndex = this.currentIndex % playlist.items.length;
      nextWp = playlist.items[this.currentIndex];
      this.currentIndex++;
    }

    if (nextWp) {
      this.wpWindow.loadWallpaper(nextWp);
      this.db.updateWallpaper(nextWp.id, { last_used: new Date().toISOString() });
      this.db.setSetting('last_wallpaper_id', nextWp.id);
    }

    this._scheduleNext(playlist.interval_ms || 3600000);
  }

  _scheduleNext(ms) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this._checkAndAdvance(), ms);
  }

  _getScheduledWallpaper() {
    const schedules = this.db.getSchedules();
    if (schedules.length === 0) return null;

    const now = new Date();
    const day = now.getDay();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const s of schedules) {
      if (!s.is_active) continue;
      if (s.day_of_week !== null && s.day_of_week !== day) continue;
      if (time >= s.start_time && time <= s.end_time) {
        if (s.wallpaper_id) return this.db.getWallpaper(s.wallpaper_id);
        if (s.playlist_id) {
          const pl = this.db.getPlaylist(s.playlist_id);
          if (pl && pl.items.length > 0) return pl.items[Math.floor(Math.random() * pl.items.length)];
        }
      }
    }
    return null;
  }

  advanceNow() {
    if (this.timer) clearTimeout(this.timer);
    this._checkAndAdvance();
  }

  resetIndex() { this.currentIndex = 0; }
}

module.exports = { PlaylistEngine };
