const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

class TrayManager {
  constructor(mainWindow, wallpaperWindow, db) {
    this.mainWindow = mainWindow;
    this.wpWindow = wallpaperWindow;
    this.db = db;
    this.tray = null;
  }

  create() {
    // Create a simple 16x16 tray icon programmatically
    const icon = nativeImage.createFromBuffer(this._createIconBuffer(), { width: 16, height: 16 });
    this.tray = new Tray(icon);
    this.tray.setToolTip('NovaWall — Live Wallpaper');
    this._updateMenu();

    this.tray.on('double-click', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  _updateMenu() {
    const isPaused = this.wpWindow?.isPaused || false;
    const menu = Menu.buildFromTemplate([
      { label: 'NovaWall', type: 'normal', enabled: false },
      { type: 'separator' },
      { label: 'Open Settings', click: () => { this.mainWindow?.show(); this.mainWindow?.focus(); } },
      { label: isPaused ? '▶ Resume Wallpaper' : '⏸ Pause Wallpaper', click: () => {
        if (isPaused) this.wpWindow.resume(); else this.wpWindow.pause();
        this._updateMenu();
      }},
      { label: '⏭ Next Wallpaper', click: () => {
        const { ipcMain } = require('electron');
        ipcMain.emit('advance-playlist');
      }},
      { type: 'separator' },
      { label: '🔇 Mute Audio', type: 'checkbox', checked: (this.wpWindow?.volume || 0) === 0,
        click: (item) => { this.wpWindow.setVolume(item.checked ? 0 : 0.5); }
      },
      { type: 'separator' },
      { label: 'Quit NovaWall', click: () => {
        const { ipcMain } = require('electron');
        ipcMain.emit('app-quit');
      }},
    ]);
    this.tray.setContextMenu(menu);
  }

  _createIconBuffer() {
    // 16x16 RGBA buffer — simple gradient square
    const size = 16;
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        buf[i] = 99 + Math.floor(x * 10);     // R
        buf[i + 1] = 102 + Math.floor(y * 10); // G
        buf[i + 2] = 241;                       // B
        buf[i + 3] = 255;                       // A
      }
    }
    return buf;
  }

  destroy() {
    if (this.tray) { this.tray.destroy(); this.tray = null; }
  }
}

module.exports = { TrayManager };
