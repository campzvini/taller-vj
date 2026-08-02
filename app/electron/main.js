// ────────────────────────────────────────────
// TALLER VJ APP 0.1 — main.js
// § - Electron main: local http server, controller and output windows · JS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'renderer');
const SELFTEST = process.argv.includes('--selftest');
let server, origin, controller, output;

// ── § 1 — LOCAL SERVER — YouTube embeds refuse file://, so we serve over http ──
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
               '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };

function serve() {
  return new Promise(resolve => {
    server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, rel === '/' ? 'controller.html' : rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404).end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    // porta efêmera: o SO escolhe uma livre
    server.listen(0, '127.0.0.1', () => {
      origin = `http://127.0.0.1:${server.address().port}`;
      resolve(origin);
    });
  });
}

// ── § 2 — WINDOWS ──
function makeController() {
  controller = new BrowserWindow({
    width: 1440, height: 900, backgroundColor: '#0a0a0c', title: 'Taller VJ',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  controller.loadURL(`${origin}/controller.html`);
  return controller;
}

// a saída nasce na segunda tela, em tela cheia — sem arrastar janela nem apertar F11
function makeOutput() {
  const displays = screen.getAllDisplays();
  const target = displays.length > 1
    ? displays.find(d => d.id !== screen.getPrimaryDisplay().id)
    : screen.getPrimaryDisplay();
  const { x, y, width, height } = target.bounds;
  output = new BrowserWindow({
    x: x + 40, y: y + 40, width: Math.min(960, width - 80), height: Math.min(540, height - 80),
    backgroundColor: '#000', title: 'Taller VJ — OUTPUT',
    fullscreen: displays.length > 1,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  output.loadURL(`${origin}/output.html`);
  return output;
}

ipcMain.handle('vj:displays', () => screen.getAllDisplays().map(d => ({
  id: d.id, bounds: d.bounds, primary: d.id === screen.getPrimaryDisplay().id
})));
ipcMain.handle('vj:openOutput', () => { if (!output || output.isDestroyed()) makeOutput(); else output.focus(); return true; });

// ── § 3 — SELF TEST — proves the three unknowns without a human watching ──
const wait = ms => new Promise(r => setTimeout(r, ms));

async function selftest() {
  const result = { origin, displays: screen.getAllDisplays().length };
  try {
    await wait(2500);

    // 1) o embed do YouTube toca dentro do Electron servido por 127.0.0.1?
    result.player = await output.webContents.executeJavaScript(`
      new Promise(res => {
        VJ.load('A','jNQXAC9IVRw');
        setTimeout(() => {
          const d = VJ.data('A') || {};
          res({ title: d.title || null, errorCode: d.errorCode || null, state: VJ.state('A') });
        }, 6000);
      })`);

    // 2) BroadcastChannel atravessa as duas janelas?
    await controller.webContents.executeJavaScript(`window.__bus.postMessage({cmd:'xf',v:73})`);
    await wait(600);
    result.bus = await output.webContents.executeJavaScript(`window.__lastXf`);

    // 3) a janela de saída está mesmo em tela cheia / na tela certa?
    result.outputBounds = output.getBounds();
    result.fullscreen = output.isFullScreen();
  } catch (e) {
    result.error = String(e);
  }
  console.log('SELFTEST ' + JSON.stringify(result));
  app.quit();
}

// ── § 4 — BOOT ──
app.whenReady().then(async () => {
  await serve();
  makeController();
  makeOutput();
  if (SELFTEST) selftest();
});
app.on('window-all-closed', () => app.quit());
