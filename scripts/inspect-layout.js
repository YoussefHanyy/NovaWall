const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'main', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
    frame: false, backgroundColor: '#0a0a0f', show: false,
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 2000));

  // Navigate to playlists
  await win.webContents.executeJavaScript(`
    document.querySelector('[data-page="playlists"]').click();
  `);
  await new Promise(r => setTimeout(r, 500));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      const content = document.getElementById('content');
      const header = content ? content.querySelector('.page-header') : null;
      const createRow = content ? content.querySelector('.playlist-create-row') : null;
      const input = createRow ? createRow.querySelector('input') : null;
      const cards = content ? content.querySelectorAll('.playlist-card') : [];
      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        dpr: window.devicePixelRatio,
        contentW: content ? content.offsetWidth : null,
        contentScrollW: content ? content.scrollWidth : null,
        headerW: header ? header.offsetWidth : null,
        headerScrollW: header ? header.scrollWidth : null,
        createRowW: createRow ? createRow.offsetWidth : null,
        inputW: input ? input.offsetWidth : null,
        playlistCardW: cards.length ? cards[0].offsetWidth : null,
        playlistCardScrollW: cards.length ? cards[0].scrollWidth : null,
      };
    })()
  `);

  console.log(JSON.stringify(result, null, 2));
  app.exit(0);
});
