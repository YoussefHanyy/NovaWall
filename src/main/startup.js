const { app } = require('electron');
const path = require('path');

class StartupManager {
  enable() {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: ['--hidden'],
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
