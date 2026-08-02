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

const ROOT = path.join(__dirname, '..', 'dist');
const SELFTEST = process.argv.includes('--selftest');
const DEV = process.argv.includes('--dev');
const DEV_URL = 'http://localhost:5273';
let server, origin, controller, output;

// ── § 1 — LOCAL SERVER — YouTube embeds refuse file://, so we serve over http ──
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
               '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };

function serve() {
  // em dev o Vite já serve por http (origem válida para o embed); em produção
  // subimos o nosso, porque file:// faz o YouTube recusar
  if (DEV) return Promise.resolve((origin = DEV_URL));
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
    // Porta fixa e hostname "localhost": é a origem que a versão HTML usa e que o
    // YouTube trata como desenvolvimento local. Origem estável também mantém o
    // localStorage entre execuções e permite restringir a chave de API a ela.
    const tentar = porta => {
      server.once('error', () => tentar(0));   // ocupada? cai para efêmera
      server.listen(porta, '127.0.0.1', () => {
        origin = `http://localhost:${server.address().port}`;
        resolve(origin);
      });
    };
    tentar(8788);
  });
}

// ── § 2 — WINDOWS ──
// O UA padrão do Electron carrega "Electron/x.y.z" e o nome do app; o YouTube
// recusa embed para agentes que não parecem navegador, e o sintoma é justamente
// parte dos vídeos não tocar. Aqui nos apresentamos como o Chrome que somos.
function fixUserAgent() {
  app.userAgentFallback =
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ` +
    `Chrome/${process.versions.chrome} Safari/537.36`;
}

function makeController() {
  controller = new BrowserWindow({
    width: 1440, height: 900, backgroundColor: '#0a0a0c', title: 'Taller VJ',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  controller.loadURL(`${origin}/controller.html`);
  // o controlador é a janela mestra: fechar ele encerra tudo que estiver aberto
  controller.on('closed', () => {
    if (output && !output.isDestroyed()) output.close();
    if (!SELFTEST) app.quit();
  });
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

    // 2) comandos reais atravessam as duas janelas e chegam a mexer na composição?
    await controller.webContents.executeJavaScript(`
      (() => { const b = new BroadcastChannel('vj');
        b.postMessage({c:'present',deck:'A',v:true});
        b.postMessage({c:'present',deck:'B',v:true});
        b.postMessage({c:'xf',v:73});
        b.postMessage({c:'bus',bus:'A',fx:['invert'],amt:0.6});
        b.postMessage({c:'frame',ar:'4/3'});
        return true; })()`);
    await wait(800);
    result.bus = await output.webContents.executeJavaScript(`({
      opB: document.getElementById('pgB').style.opacity,
      fxA: document.getElementById('baseA').style.filter,
      ar: getComputedStyle(document.documentElement).getPropertyValue('--ar').trim(),
      covw: getComputedStyle(document.documentElement).getPropertyValue('--covw').trim()
    })`);

    // 3) a telemetria da saída volta para o controlador?
    result.tele = await controller.webContents.executeJavaScript(`
      new Promise(res => { const b = new BroadcastChannel('vj');
        const to = setTimeout(() => res(null), 3000);
        b.onmessage = e => { if (e.data && e.data.t === 'tele') {
          clearTimeout(to); res({ ready: e.data.ready, stateA: e.data.decks.A.state,
                                  timeA: +e.data.decks.A.time.toFixed(1), samples: e.data.samp.length }); } };
      })`);

    // 4) o controlador React montou e o fluxo real funciona ponta a ponta?
    result.ui = await controller.webContents.executeJavaScript(`({
      colunas: document.querySelectorAll('#main > .col').length,
      slots: document.querySelectorAll('.slot').length,
      players: document.querySelectorAll('iframe').length,
      decks: [...document.querySelectorAll('.hd b')].map(e => e.textContent),
      rodape: !!document.getElementById('foot')
    })`);

    // busca por ID -> cue -> manda pro deck A, tudo pela interface
    result.flow = await controller.webContents.executeJavaScript(`
      (async () => {
        const set = (el, v) => {
          const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          d.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        set(document.getElementById('q'), 'aqz-KE-bpKQ');
        [...document.querySelectorAll('#sbar button')].find(b => b.textContent === 'Buscar').click();
        await new Promise(r => setTimeout(r, 2500));
        const noCue = document.querySelectorAll('.hd .now')[1]?.textContent || '';
        [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('◄ A')).click();
        await new Promise(r => setTimeout(r, 2500));
        return { resultados: document.querySelectorAll('.res').length, noCue,
                 noDeckA: document.querySelectorAll('.hd .now')[0]?.textContent || '' };
      })()`);

    result.afterFlow = await output.webContents.executeJavaScript(`({
      tituloA: (VJ.data('A') || {}).title || null,
      opA: document.getElementById('pgA').style.opacity
    })`);

    // 5) o UA não pode denunciar Electron, senão parte dos vídeos recusa tocar
    result.ua = await output.webContents.executeJavaScript(`navigator.userAgent`);
    result.uaLimpo = !/Electron|taller/i.test(result.ua);

    // 6) loop: joga para perto do fim e vê se rebobina sozinho
    result.loop = await output.webContents.executeJavaScript(`
      new Promise(res => {
        VJ.load('A','jNQXAC9IVRw');
        setTimeout(() => {
          const p = document.querySelector('#ytAout');
          VJ.seek && VJ.seek('A', 17.5);
          setTimeout(() => res({ voltouPara: +VJ.time('A').toFixed(1), tocando: VJ.state('A') === 1 }), 7000);
        }, 5000);
      })`);

    // 7) painel colapsável fecha ao clicar fora
    result.clickFora = await controller.webContents.executeJavaScript(`
      (async () => {
        const btn = [...document.querySelectorAll('#foot button')].find(b => b.textContent.includes('lista'));
        btn.click();
        await new Promise(r => setTimeout(r, 300));
        const aberto = !!document.getElementById('bedlist');
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        return { aberto, fechouAoClicarFora: !document.getElementById('bedlist') };
      })()`);

    // 7b) bateria de vídeos de tipos diferentes: erro por vídeo, não por chute
    result.catalogo = await output.webContents.executeJavaScript(`
      (async () => {
        const ids = ['jNQXAC9IVRw','aqz-KE-bpKQ','dQw4w9WgXcQ','9bZkp7q19f0','kJQP7kiw5Fk'];
        const r = [];
        for (const id of ids) {
          window.__lastError = null;
          VJ.load('A', id);
          await new Promise(s => setTimeout(s, 5000));
          const d = VJ.data('A') || {};
          r.push({ id, titulo: (d.title || '').slice(0, 26), erro: window.__lastError?.text || d.errorCode || null,
                   estado: VJ.state('A') });
        }
        return r;
      })()`);
    result.origem = await output.webContents.executeJavaScript(`location.origin`);

    // 8) a janela de saída está mesmo em tela cheia / na tela certa?
    result.outputBounds = output.getBounds();
    result.fullscreen = output.isFullScreen();
    result.iframes = await output.webContents.executeJavaScript(`document.querySelectorAll('iframe').length`);

    // 9) fechar o controlador (master) leva a saída junto
    controller.close();
    await wait(700);
    result.masterFecha = output.isDestroyed();
  } catch (e) {
    result.error = String(e);
  }
  console.log('SELFTEST ' + JSON.stringify(result));
  app.exit(result.error ? 1 : 0);
}

// ── § 4 — BOOT ──
app.whenReady().then(async () => {
  fixUserAgent();
  await serve();
  makeController();
  makeOutput();
  if (SELFTEST) selftest();
});
// no selftest quem decide a hora de sair é a própria rotina, depois de imprimir
app.on('window-all-closed', () => { if (!SELFTEST) app.quit(); });
