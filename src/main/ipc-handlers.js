const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { StartupManager } = require('./startup');

/**
 * Setup all IPC handlers between main and renderer processes.
 */
function setupIpcHandlers({ mainWindow, wallpaperWindow, db, playlistEngine, perfMonitor, trayManager, dataDir, wallpaperDir, thumbDir }) {
  const startup = new StartupManager();

  // ─── Window Controls ───
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window-close', () => mainWindow?.hide());

  // ─── Wallpapers ───
  ipcMain.handle('get-wallpapers', (_, filters) => db.getWallpapers(filters || {}));
  ipcMain.handle('get-wallpaper', (_, id) => db.getWallpaper(id));

  ipcMain.handle('add-wallpaper', async (_, data) => {
    // If path is external, copy to wallpaper dir
    let finalPath = data.path;
    if (!finalPath.startsWith(wallpaperDir)) {
      const ext = path.extname(finalPath);
      const newName = `${uuidv4()}${ext}`;
      const dest = path.join(wallpaperDir, newName);
      fs.copyFileSync(finalPath, dest);
      finalPath = dest;
    }

    const type = detectType(finalPath);
    const stats = fs.statSync(finalPath);
    const wp = db.addWallpaper({
      name: data.name || path.basename(finalPath, path.extname(finalPath)),
      path: finalPath,
      type: type,
      file_size: stats.size,
      category: data.category || 'uncategorized',
      fit_mode: data.fit_mode || 'fill',
      volume: data.volume || 0,
    });
    return wp;
  });

  ipcMain.handle('remove-wallpaper', (_, id) => {
    const wp = db.getWallpaper(id);
    if (wp) {
      // Delete file if it's in our wallpaper dir
      if (wp.path.startsWith(wallpaperDir)) {
        try { fs.unlinkSync(wp.path); } catch {}
      }
      if (wp.thumbnail) {
        try { fs.unlinkSync(wp.thumbnail); } catch {}
      }
      db.removeWallpaper(id);
    }
    return true;
  });

  ipcMain.handle('set-wallpaper', (_, id) => {
    const wp = db.getWallpaper(id);
    if (wp) {
      wallpaperWindow.loadWallpaper(wp);
      db.setSetting('last_wallpaper_id', id);
      db.updateWallpaper(id, { last_used: new Date().toISOString() });
      if (mainWindow) mainWindow.webContents.send('wallpaper-changed', wp);
    }
    return wp;
  });

  ipcMain.handle('toggle-favorite', (_, id) => db.toggleFavorite(id));
  ipcMain.handle('update-wallpaper', (_, id, data) => db.updateWallpaper(id, data));

  ipcMain.handle('import-wallpaper-url', async (_, url) => {
    try {
      const https = url.startsWith('https') ? require('https') : require('http');
      const ext = path.extname(new URL(url).pathname) || '.mp4';
      const filename = `${uuidv4()}${ext}`;
      const dest = path.join(wallpaperDir, filename);

      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (e) => { fs.unlinkSync(dest); reject(e); });
      });

      const wp = db.addWallpaper({
        name: path.basename(filename, ext),
        path: dest,
        type: detectType(dest),
        file_size: fs.statSync(dest).size,
      });
      return wp;
    } catch (err) {
      throw new Error(`Failed to import: ${err.message}`);
    }
  });

  // ─── Playlists ───
  ipcMain.handle('get-playlists', () => db.getPlaylists());
  ipcMain.handle('get-playlist', (_, id) => db.getPlaylist(id));
  ipcMain.handle('create-playlist', (_, data) => db.createPlaylist(data));
  ipcMain.handle('update-playlist', (_, id, data) => db.updatePlaylist(id, data));
  ipcMain.handle('delete-playlist', (_, id) => { db.deletePlaylist(id); return true; });
  ipcMain.handle('add-to-playlist', (_, pid, wid) => { db.addToPlaylist(pid, wid); return db.getPlaylist(pid); });
  ipcMain.handle('remove-from-playlist', (_, pid, wid) => { db.removeFromPlaylist(pid, wid); return db.getPlaylist(pid); });
  ipcMain.handle('move-playlist-item', (_, pid, wid, direction) => { db.movePlaylistItem(pid, wid, direction); return db.getPlaylist(pid); });
  ipcMain.handle('activate-playlist', (_, id) => {
    db.activatePlaylist(id);
    playlistEngine.resetIndex();
    playlistEngine.advanceNow();
    return true;
  });
  ipcMain.handle('deactivate-playlist', (_, id) => { db.deactivatePlaylist(id); return true; });

  // ─── Schedules ───
  ipcMain.handle('get-schedules', () => db.getSchedules());
  ipcMain.handle('create-schedule', (_, data) => db.createSchedule(data));
  ipcMain.handle('delete-schedule', (_, id) => { db.deleteSchedule(id); return true; });

  // ─── Categories ───
  ipcMain.handle('get-categories', () => db.getCategories());
  ipcMain.handle('create-category', (_, name, color) => db.createCategory(name, color));
  ipcMain.handle('delete-category', (_, id) => { db.deleteCategory(id); return true; });

  // ─── Settings ───
  ipcMain.handle('get-setting', (_, key) => db.getSetting(key));
  ipcMain.handle('set-setting', (_, key, value) => {
    db.setSetting(key, value);
    // Handle side effects
    if (key === 'start_with_windows') {
      value === 'true' ? startup.enable() : startup.disable();
    }
    if (key === 'fps_limit') {
      wallpaperWindow.setFps(parseInt(value, 10));
    }
    if (key === 'default_fit_mode') {
      wallpaperWindow.setFitMode(value);
    }
    return true;
  });
  ipcMain.handle('get-all-settings', () => db.getAllSettings());

  // ─── Wallpaper Controls ───
  ipcMain.handle('pause-wallpaper', () => { wallpaperWindow.pause(); return true; });
  ipcMain.handle('resume-wallpaper', () => { wallpaperWindow.resume(); return true; });
  ipcMain.handle('set-volume', (_, vol) => { wallpaperWindow.setVolume(vol); return true; });
  ipcMain.handle('set-fit-mode', (_, mode) => { wallpaperWindow.setFitMode(mode); return true; });

  // ─── System ───
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Wallpapers', extensions: ['mp4', 'webm', 'gif', 'jpg', 'jpeg', 'png', 'webp'] },
        { name: 'Videos', extensions: ['mp4', 'webm'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
      ],
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('show-confirm', async (_, msg) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question', buttons: ['Yes', 'Cancel'], title: 'Confirm', message: msg
    });
    return response === 0;
  });

  ipcMain.handle('show-prompt', async (_, msg) => {
    // Basic prompt simulation using a tiny browser window (Electron has no native prompt)
    // For simplicity we just return a default string or null for now, or use a custom UI
    // To make it simple without a new HTML file:
    return "New Playlist"; 
  });

  ipcMain.handle('get-system-info', () => ({
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    performance: perfMonitor.getStats(),
  }));

  ipcMain.handle('export-collection', async (_, playlistId) => {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) throw new Error('Playlist not found');
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${playlist.name}.novawall`,
      filters: [{ name: 'NovaWall Collection', extensions: ['novawall'] }],
    });
    if (result.canceled) return null;
    const exportData = { version: 1, playlist, wallpapers: playlist.items };
    fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
    return result.filePath;
  });

  ipcMain.handle('import-collection', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'NovaWall Collection', extensions: ['novawall'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
    if (data.version !== 1) throw new Error('Unsupported collection version');
    const newPlaylist = db.createPlaylist({ name: data.playlist.name + ' (imported)', description: data.playlist.description });
    // Note: wallpaper files would need to be bundled in a real export
    return newPlaylist;
  });

  // ─── Playlist advance from tray ───
  ipcMain.on('advance-playlist', () => playlistEngine.advanceNow());
}

function detectType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { '.mp4': 'mp4', '.webm': 'webm', '.gif': 'gif', '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.webp': 'image' };
  return map[ext] || 'mp4';
}

module.exports = { setupIpcHandlers };
