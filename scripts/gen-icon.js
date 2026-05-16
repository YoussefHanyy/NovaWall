/**
 * Generates icon.png by rendering icon.svg via Electron's offscreen BrowserWindow.
 * Run with: node_modules/.bin/electron.cmd scripts/gen-icon.js
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256, height: 256,
    show: false,
    webPreferences: { offscreen: true }
  });

  const svgPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  const html = `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:256px;height:256px;overflow:hidden;background:transparent;}
    svg{width:256px;height:256px;display:block;}
  </style></head><body>${svgContent}</body></html>`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 500));

  const image = await win.webContents.capturePage();
  const pngBuffer = image.toPNG();

  const outPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.png');
  fs.writeFileSync(outPath, pngBuffer);
  console.log('Saved:', outPath);

  app.exit(0);
});
