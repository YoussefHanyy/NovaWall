const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, screen, nativeTheme } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./ipc-handlers');

const CACHE_DIR = path.join(app.getPath('userData'), 'cache');
app.commandLine.appendSwitch('disk-cache-dir', CACHE_DIR);
const { WallpaperWindow } = require('./wallpaper-window');
const { TrayManager } = require('./tray');
const { DatabaseManager } = require('./database');
const { PlaylistEngine } = require('./playlist-engine');
const { PerformanceMonitor } = require('./performance');
const { StartupManager } = require('./startup');

/* ───────── Singleton Lock ───────── */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

/* ───────── Globals ───────── */
let mainWindow = null;
let wallpaperWindow = null;
let trayManager = null;
let db = null;
let playlistEngine = null;
let perfMonitor = null;

/* ───────── Data paths ───────── */
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const WALLPAPER_DIR = path.join(DATA_DIR, 'wallpapers');
const DB_PATH = path.join(DATA_DIR, 'novawall.db');
const THUMB_DIR = path.join(DATA_DIR, 'thumbnails');

/* ───────── Ensure directories ───────── */
const fs = require('fs');
[DATA_DIR, WALLPAPER_DIR, THUMB_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

/* ───────── Create Settings Window ───────── */
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    icon: path.join(__dirname, '..', '..', 'assets', 'icons', 'icon.png'),
  });

  await mainWindow.webContents.session.clearCache();
  await mainWindow.loadFile(path.join(__dirname, '..', '..', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ───────── App Ready ───────── */
app.whenReady().then(async () => {
  // Initialize database
  db = new DatabaseManager(DB_PATH);
  db.initialize();

  // Create wallpaper window (behind desktop icons)
  wallpaperWindow = new WallpaperWindow(db);
  await wallpaperWindow.create();

  // Create main settings window
  await createMainWindow();

  // Setup system tray
  trayManager = new TrayManager(mainWindow, wallpaperWindow, db);
  trayManager.create();

  // Setup playlist engine
  playlistEngine = new PlaylistEngine(db, wallpaperWindow);
  playlistEngine.start();

  // Setup performance monitor
  perfMonitor = new PerformanceMonitor(wallpaperWindow, db);
  perfMonitor.start();

  // Setup all IPC handlers
  setupIpcHandlers({
    mainWindow,
    wallpaperWindow,
    db,
    playlistEngine,
    perfMonitor,
    trayManager,
    dataDir: DATA_DIR,
    wallpaperDir: WALLPAPER_DIR,
    thumbDir: THUMB_DIR,
  });

  // Apply saved wallpaper on startup
  const lastWallpaper = db.getSetting('last_wallpaper_id');
  if (lastWallpaper) {
    const wp = db.getWallpaper(lastWallpaper);
    if (wp) {
      wallpaperWindow.loadWallpaper(wp);
    }
  }

  // Setup startup registration
  const startupManager = new StartupManager();
  const startWithWindows = db.getSetting('start_with_windows');
  if (startWithWindows === 'true') {
    startupManager.enable();
  }
});

/* ───────── Second instance ───────── */
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

/* ───────── All windows closed ───────── */
app.on('window-all-closed', () => {
  // Keep running in tray
});

/* ───────── Before quit ───────── */
app.on('before-quit', () => {
  if (perfMonitor) perfMonitor.stop();
  if (playlistEngine) playlistEngine.stop();
  if (wallpaperWindow) wallpaperWindow.destroy();
  if (db) db.close();
  app.exit(0);
});

// Handle force quit from tray
ipcMain.on('app-quit', () => {
  if (perfMonitor) perfMonitor.stop();
  if (playlistEngine) playlistEngine.stop();
  if (wallpaperWindow) wallpaperWindow.destroy();
  if (db) db.close();
  app.exit(0);
});
