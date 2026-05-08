const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wpControl', {
  onLoadWallpaper: (cb) => ipcRenderer.on('load-wallpaper', (_, d) => cb(d)),
  onPause: (cb) => ipcRenderer.on('pause', () => cb()),
  onResume: (cb) => ipcRenderer.on('resume', () => cb()),
  onSetVolume: (cb) => ipcRenderer.on('set-volume', (_, v) => cb(v)),
  onSetFitMode: (cb) => ipcRenderer.on('set-fit-mode', (_, m) => cb(m)),
  onSetFps: (cb) => ipcRenderer.on('set-fps', (_, f) => cb(f)),
  onConfig: (cb) => ipcRenderer.on('config', (_, c) => cb(c)),
});
