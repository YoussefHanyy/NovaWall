const { BrowserWindow, screen } = require('electron');
const path = require('path');

/**
 * WallpaperWindow manages the BrowserWindow that renders behind desktop icons.
 * 
 * Strategy:
 * - With ffi-napi: embed into WorkerW behind desktop icons (ideal)
 * - Without ffi-napi (fallback): use a borderless always-on-bottom window
 *   that the user can toggle. Not perfect but functional.
 */
class WallpaperWindow {
  constructor(db) {
    this.db = db;
    this.window = null;
    this.currentWallpaper = null;
    this.isPaused = false;
    this.volume = 0;
    this.isEmbedded = false;
    this._keepBottomInterval = null;
  }

  async create() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.bounds;

    // Check if ffi-napi is available BEFORE creating the window
    let canEmbed = false;
    try {
      const { isAvailable } = require('./windows-api');
      canEmbed = isAvailable;
    } catch { canEmbed = false; }

    const windowOpts = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'wallpaper-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false,
      },
    };

    // No transparent — it causes multi-window issues with WorkerW embedding
    // The video/image content will cover the black background anyway
    windowOpts.backgroundColor = '#000000';
    windowOpts.focusable = false;

    this.window = new BrowserWindow(windowOpts);
    this.window.loadFile(path.join(__dirname, '..', '..', 'wallpaper.html'));

    // Try embedding
    if (canEmbed) {
      await this._embedBehindDesktop();
    }

    if (!this.isEmbedded) {
      this._setupFallbackMode();
    }

    // Don't show until a wallpaper is actually loaded
    // This prevents the black screen on startup
    this.window.webContents.on('did-finish-load', () => {
      this.window.webContents.send('config', {
        volume: this.volume,
        fitMode: this.fitMode,
      });
    });
  }

  async _embedBehindDesktop() {
    if (process.platform !== 'win32') return;
    try {
      // Wait for window to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { embedWallpaperWindow } = require('./windows-api');
      const hwnd = this.window.getNativeWindowHandle();
      console.log('Attempting WorkerW embedding, HWND buffer length:', hwnd.length);
      // Await so SetParent (moves window behind desktop) finishes BEFORE we show.
      // Showing before embedding completes = fullscreen window flashes over icons
      // then gets pushed behind = the "icons disappear" glitch.
      const success = await embedWallpaperWindow(hwnd);
      this.isEmbedded = success;
      if (success) {
        console.log('✓ Wallpaper embedded behind desktop icons successfully');
      } else {
        console.warn('✗ WorkerW embedding returned false');
      }
      // Always show (matches original behavior), but now after embedding is done.
      this.window.show();
    } catch (err) {
      console.warn('✗ Embedding failed:', err.message);
      this.isEmbedded = false;
    }
  }

  _setupFallbackMode() {
    // Fallback: keep the window at the very bottom of the z-order
    // Only show when a wallpaper is loaded
    this.window.setAlwaysOnTop(true, 'screen-saver', -999);
    // Move to bottom immediately
    setTimeout(() => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.setAlwaysOnTop(false);
        // Periodically push to bottom
        this._keepBottomInterval = setInterval(() => {
          if (this.window && !this.window.isDestroyed() && !this.isPaused) {
            // Don't steal focus, just stay behind
          }
        }, 5000);
      }
    }, 100);
    console.log('Wallpaper in fallback mode (window behind desktop)');
  }

  loadWallpaper(wallpaper) {
    if (!this.window || this.window.isDestroyed()) return;

    this.currentWallpaper = wallpaper;

    // Convert Windows path to file:// URL properly
    let wpPath = wallpaper.path;
    if (!wpPath.startsWith('http') && !wpPath.startsWith('file://')) {
      wpPath = 'file:///' + wpPath.replace(/\\/g, '/');
    }

    const defaultFit = this.db ? this.db.getSetting('default_fit_mode') || 'fill' : 'fill';
    
    this.window.webContents.send('load-wallpaper', {
      path: wpPath,
      type: wallpaper.type,
      fitMode: wallpaper.fit_mode || defaultFit,
      volume: wallpaper.volume !== undefined ? wallpaper.volume : this.volume,
    });

    // Now show the window since we have content
    if (!this.window.isVisible()) {
      this.window.showInactive(); // Show without stealing focus
    }
  }

  pause() {
    if (!this.window || this.window.isDestroyed()) return;
    this.isPaused = true;
    this.window.webContents.send('pause');
  }

  resume() {
    if (!this.window || this.window.isDestroyed()) return;
    this.isPaused = false;
    this.window.webContents.send('resume');
  }

  setVolume(vol) {
    this.volume = vol;
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('set-volume', vol);
  }

  setFitMode(mode) {
    this.fitMode = mode;
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('set-fit-mode', mode);
  }

  setFps(fps) {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('set-fps', fps);
  }

  destroy() {
    if (this._keepBottomInterval) clearInterval(this._keepBottomInterval);
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
  }

  isActive() {
    return this.window && !this.window.isDestroyed() && this.currentWallpaper;
  }
}

module.exports = { WallpaperWindow };
