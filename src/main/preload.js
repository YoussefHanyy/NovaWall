const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure bridge between renderer and main process.
 * Only expose whitelisted IPC channels.
 */
contextBridge.exposeInMainWorld('novawall', {
  // ─── Wallpapers ───
  getWallpapers: (filters) => ipcRenderer.invoke('get-wallpapers', filters),
  getWallpaper: (id) => ipcRenderer.invoke('get-wallpaper', id),
  addWallpaper: (data) => ipcRenderer.invoke('add-wallpaper', data),
  removeWallpaper: (id) => ipcRenderer.invoke('remove-wallpaper', id),
  setWallpaper: (id) => ipcRenderer.invoke('set-wallpaper', id),
  toggleFavorite: (id) => ipcRenderer.invoke('toggle-favorite', id),
  updateWallpaper: (id, data) => ipcRenderer.invoke('update-wallpaper', id, data),
  importWallpaperFromUrl: (url) => ipcRenderer.invoke('import-wallpaper-url', url),

  // ─── Playlists ───
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  getPlaylist: (id) => ipcRenderer.invoke('get-playlist', id),
  createPlaylist: (data) => ipcRenderer.invoke('create-playlist', data),
  updatePlaylist: (id, data) => ipcRenderer.invoke('update-playlist', id, data),
  deletePlaylist: (id) => ipcRenderer.invoke('delete-playlist', id),
  addToPlaylist: (playlistId, wallpaperId) => ipcRenderer.invoke('add-to-playlist', playlistId, wallpaperId),
  removeFromPlaylist: (playlistId, wallpaperId) => ipcRenderer.invoke('remove-from-playlist', playlistId, wallpaperId),
  movePlaylistItem: (playlistId, wallpaperId, direction) => ipcRenderer.invoke('move-playlist-item', playlistId, wallpaperId, direction),
  activatePlaylist: (id) => ipcRenderer.invoke('activate-playlist', id),
  deactivatePlaylist: (id) => ipcRenderer.invoke('deactivate-playlist', id),

  // ─── Schedules ───
  getSchedules: () => ipcRenderer.invoke('get-schedules'),
  createSchedule: (data) => ipcRenderer.invoke('create-schedule', data),
  updateSchedule: (id, data) => ipcRenderer.invoke('update-schedule', id, data),
  deleteSchedule: (id) => ipcRenderer.invoke('delete-schedule', id),

  // ─── Categories ───
  getCategories: () => ipcRenderer.invoke('get-categories'),
  createCategory: (name, color) => ipcRenderer.invoke('create-category', name, color),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

  // ─── Settings ───
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),

  // ─── Wallpaper Controls ───
  pauseWallpaper: () => ipcRenderer.invoke('pause-wallpaper'),
  resumeWallpaper: () => ipcRenderer.invoke('resume-wallpaper'),
  setVolume: (vol) => ipcRenderer.invoke('set-volume', vol),
  setFitMode: (mode) => ipcRenderer.invoke('set-fit-mode', mode),

  // ─── System ───
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  exportCollection: (playlistId) => ipcRenderer.invoke('export-collection', playlistId),
  importCollection: () => ipcRenderer.invoke('import-collection'),

  // ─── Window Controls ───
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // ─── Dialogs ───
  showConfirm: (msg) => ipcRenderer.invoke('show-confirm', msg),
  showPrompt: (msg) => ipcRenderer.invoke('show-prompt', msg),

  // ─── Events ───
  onWallpaperChanged: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('wallpaper-changed', handler);
    return () => ipcRenderer.removeListener('wallpaper-changed', handler);
  },
  onPlaylistAdvanced: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('playlist-advanced', handler);
    return () => ipcRenderer.removeListener('playlist-advanced', handler);
  },
  onPerformanceUpdate: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('performance-update', handler);
    return () => ipcRenderer.removeListener('performance-update', handler);
  },
});
