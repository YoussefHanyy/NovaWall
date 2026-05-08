/**
 * Windows API bridge using a precompiled C# helper exe.
 * Uses async spawn to avoid Electron's spawnSync timeout issues.
 */
const { spawn } = require('child_process');
const path = require('path');

const HELPER = path.join(__dirname, 'wallpaper-helper.exe');
const _isAvailable = process.platform === 'win32';

function runHelperAsync(args) {
  return new Promise((resolve) => {
    try {
      const proc = spawn(HELPER, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => stdout += d.toString());
      proc.stderr.on('data', d => stderr += d.toString());
      proc.on('close', () => resolve(stdout.trim()));
      proc.on('error', err => { console.error('Helper spawn error:', err.message); resolve(null); });
      // Safety timeout
      setTimeout(() => { try { proc.kill(); } catch {} resolve(null); }, 10000);
    } catch (e) { console.error('Helper error:', e.message); resolve(null); }
  });
}

async function embedWallpaperWindow(hwndBuffer) {
  if (!_isAvailable) return false;
  try {
    let hwnd;
    if (hwndBuffer.length >= 8) {
      hwnd = hwndBuffer.readBigInt64LE(0).toString();
    } else {
      hwnd = hwndBuffer.readInt32LE(0).toString();
    }
    console.log('Embedding HWND:', hwnd);
    const result = await runHelperAsync(['embed', hwnd]);
    const success = result !== null && result.toLowerCase().includes('true');
    console.log('Embed result:', result, '-> success:', success);
    return success;
  } catch (err) {
    console.error('Embed error:', err);
    return false;
  }
}

async function isFullscreenAppRunning() {
  if (!_isAvailable) return false;
  try {
    const result = await runHelperAsync(['fullscreen']);
    return result && result.toLowerCase() === 'true';
  } catch { return false; }
}

function isOnBattery() { return false; }
function getBatteryLevel() { return 100; }

module.exports = { embedWallpaperWindow, isFullscreenAppRunning, isOnBattery, getBatteryLevel, isAvailable: _isAvailable };
