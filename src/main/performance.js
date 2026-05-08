/**
 * PerformanceMonitor — monitors system state and throttles wallpaper accordingly.
 * - Pauses during fullscreen apps/games
 * - Reduces FPS on battery
 * - Monitors CPU/RAM usage
 */
const { isFullscreenAppRunning, isOnBattery, getBatteryLevel } = require('./windows-api');

class PerformanceMonitor {
  constructor(wallpaperWindow, db) {
    this.wpWindow = wallpaperWindow;
    this.db = db;
    this.pollInterval = null;
    this.wasPausedByFullscreen = false;
    this.wasPausedByBattery = false;
    this.stats = { cpu: 0, ram: 0, fps: 30, onBattery: false, batteryLevel: 100 };
  }

  start() {
    // Poll every 30 seconds (helper exe calls are async)
    this.pollInterval = setInterval(() => this._check().catch(() => {}), 30000);
  }

  stop() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }

  async _check() {
    // Fullscreen detection
    const pauseFullscreen = this.db.getSetting('pause_fullscreen') !== 'false';
    if (pauseFullscreen) {
      const isFs = await isFullscreenAppRunning();
      if (isFs && !this.wasPausedByFullscreen) {
        this.wpWindow.pause();
        this.wasPausedByFullscreen = true;
      } else if (!isFs && this.wasPausedByFullscreen) {
        this.wpWindow.resume();
        this.wasPausedByFullscreen = false;
      }
    }

    // Battery saver
    const batterySaver = this.db.getSetting('battery_saver') !== 'false';
    if (batterySaver) {
      const onBattery = isOnBattery();
      const level = getBatteryLevel();
      const threshold = parseInt(this.db.getSetting('battery_threshold') || '30', 10);
      this.stats.onBattery = onBattery;
      this.stats.batteryLevel = level;

      if (onBattery && level <= threshold && !this.wasPausedByBattery) {
        this.wpWindow.setFps(10);
        this.wasPausedByBattery = true;
      } else if ((!onBattery || level > threshold) && this.wasPausedByBattery) {
        const fpsLimit = parseInt(this.db.getSetting('fps_limit') || '30', 10);
        this.wpWindow.setFps(fpsLimit);
        this.wasPausedByBattery = false;
      }
    }

    // Update stats
    try {
      const mem = process.memoryUsage();
      this.stats.ram = Math.round(mem.rss / 1024 / 1024);
      this.stats.cpu = 0; // TODO: implement CPU sampling
    } catch {}
  }

  getStats() { return { ...this.stats }; }
}

module.exports = { PerformanceMonitor };
