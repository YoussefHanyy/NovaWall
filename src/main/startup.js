const { app } = require('electron');
const path = require('path');

class StartupManager {
  enable() {
    // In dev mode (electron .) process.execPath is electron.exe — must pass app path as arg
    const args = app.isPackaged
      ? ['--hidden']
      : [path.resolve(process.argv[1]), '--hidden'];

    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args,
    });
  }

  disable() {
    app.setLoginItemSettings({ openAtLogin: false });
  }

  isEnabled() {
    return app.getLoginItemSettings().openAtLogin;
  }
}

module.exports = { StartupManager };
