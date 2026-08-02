// ────────────────────────────────────────────
// TALLER VJ APP 0.1 — main.js
// § - Electron main: local http server, controller and output windows · JS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
const { app, BrowserWindow, screen, ipcMain, dialog, desktopCapturer } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', 'dist');
const SELFTEST = process.argv.includes('--selftest');
const DEV = process.argv.includes('--dev');
const DEV_URL = 'http://localhost:5273';
// partição sem 'persist:' vive em memória: o autoteste começa sempre do zero,
// senão o localStorage de execuções passadas contamina o resultado
const PART = SELFTEST ? { partition: 'selftest' } : {};
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
      const u = new URL(req.url, 'http://localhost');

      // Arquivos locais entram por aqui: a página é http, e carregar file://
      // de uma origem http é bloqueado. Com Range o <video> consegue dar seek.
      if (u.pathname === '/local') {
        const p = u.searchParams.get('p');
        if (!p) { res.writeHead(400).end(); return; }
        let stat;
        try { stat = fs.statSync(p); } catch { res.writeHead(404).end(); return; }
        const type = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
                       '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.ogv': 'video/ogg',
                       '.jpg': 'image/jpeg', '.png': 'image/png' }[path.extname(p).toLowerCase()]
                     || 'application/octet-stream';
        const range = req.headers.range;
        if (range) {
          const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
          const start = m[1] ? parseInt(m[1]) : 0;
          const end = m[2] ? parseInt(m[2]) : stat.size - 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': type
          });
          fs.createReadStream(p, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Content-Type': type });
          fs.createReadStream(p).pipe(res);
        }
        return;
      }

      const rel = decodeURIComponent(u.pathname);
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
    show: false,   // evita o piscar de janela pequena antes de maximizar
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, ...PART }
  });
  controller.maximize();
  controller.show();
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
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, ...PART }
  });
  output.loadURL(`${origin}/output.html`);
  return output;
}

ipcMain.handle('vj:displays', () => screen.getAllDisplays().map(d => ({
  id: d.id, bounds: d.bounds, primary: d.id === screen.getPrimaryDisplay().id
})));
ipcMain.handle('vj:openOutput', () => { if (!output || output.isDestroyed()) makeOutput(); else output.focus(); return true; });

// a JANELA assume a proporção escolhida; o vídeo preenche por cover no renderer
ipcMain.handle('vj:setAspect', (_e, ar) => {
  if (!output || output.isDestroyed()) return false;
  const [w, h] = String(ar).split('/').map(Number);
  if (!w || !h) return false;
  output.setAspectRatio(w / h);
  if (!output.isFullScreen()) {
    const b = output.getBounds();
    output.setBounds({ ...b, height: Math.round(b.width * h / w) });
  }
  return true;
});

// ── § 2.0 — CAPTURE — fonte para o áudio do sistema e para gravação de tela ──
// Não lemos o áudio de dentro do iframe, mas lemos o que sai da PLACA: é assim
// que a reatividade ao som passa a valer para qualquer fonte, inclusive YouTube.
ipcMain.handle('vj:sources', async () => {
  const s = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
  return s.map(x => ({ id: x.id, name: x.name, tipo: x.id.startsWith('screen') ? 'tela' : 'janela' }));
});

// ── § 2.1 — SESSION FILES — a sessão deixa de viver só no localStorage ──
ipcMain.handle('vj:saveSession', async (_e, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(controller, {
    title: 'Salvar sessão', defaultPath: `taller-vj-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'Sessão Taller VJ', extensions: ['json'] }]
  });
  if (canceled || !filePath) return null;
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
});

ipcMain.handle('vj:openSession', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(controller, {
    title: 'Abrir sessão', properties: ['openFile'],
    filters: [{ name: 'Sessão Taller VJ', extensions: ['json'] }]
  });
  if (canceled || !filePaths?.length) return null;
  const txt = await fs.promises.readFile(filePaths[0], 'utf8');
  try { return { path: filePaths[0], data: JSON.parse(txt) }; }
  catch { return { path: filePaths[0], error: 'arquivo inválido' }; }
});

ipcMain.handle('vj:checklist', () => ({
  saida: !!(output && !output.isDestroyed()),
  fullscreen: !!(output && !output.isDestroyed() && output.isFullScreen()),
  telas: screen.getAllDisplays().length,
  telaDaSaida: output && !output.isDestroyed()
    ? screen.getDisplayMatching(output.getBounds()).id : null,
  telaPrincipal: screen.getPrimaryDisplay().id,
  online: true
}));

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
    result.bus = await output.webContents.executeJavaScript(`(() => {
      const f = document.querySelector('.frame');
      const T = f.clientWidth / f.clientHeight;
      const cw = getComputedStyle(document.documentElement).getPropertyValue('--covw').trim();
      const ch = getComputedStyle(document.documentElement).getPropertyValue('--covh').trim();
      return {
        opB: document.getElementById('pgB').style.opacity,
        fxA: document.getElementById('baseA').style.filter,
        // o quadro preenche a janela e o vídeo cobre o quadro sem distorcer
        preenche: Math.abs(f.clientWidth - innerWidth) < 2 && Math.abs(f.clientHeight - innerHeight) < 2,
        coverCoerente: T >= 16/9 ? cw === '100%' : ch === '100%'
      };
    })()`);

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

    // 7c) fase 0: proporção da janela, posicionamento, blackout e padrões
    result.fase0 = await controller.webContents.executeJavaScript(`
      (async () => {
        const b = new BroadcastChannel('vj');
        b.postMessage({c:'pos',deck:'A',pan:[10,-5],rot:12,flipH:true,flipV:false,crop:[5,0,5,0]});
        b.postMessage({c:'blackout',on:true});
        b.postMessage({c:'pattern',name:'grid'});
        await new Promise(r => setTimeout(r, 600));
        return true;
      })()`);
    result.fase0out = await output.webContents.executeJavaScript(`({
      panx: document.getElementById('pgA').style.getPropertyValue('--panx'),
      rot: document.getElementById('pgA').style.getPropertyValue('--rot'),
      flip: document.getElementById('pgA').style.getPropertyValue('--fx'),
      crop: document.getElementById('pgA').style.getPropertyValue('--ct'),
      black: document.getElementById('black').classList.contains('on'),
      pattern: document.getElementById('pattern').classList.contains('on'),
      cover: getComputedStyle(document.documentElement).getPropertyValue('--covw').trim()
    })`);

    // 7d) fase 1: ffmpeg vivo, arquivo local servido com Range e tocando na saída
    {
      const { execFile } = require('child_process');
      const ff = require('ffmpeg-static');
      const tmp = path.join(os.tmpdir(), 'taller-vj-selftest.mp4');
      await new Promise(r => execFile(ff, ['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25',
        '-t', '6', '-pix_fmt', 'yuv420p', '-y', tmp], { windowsHide: true }, () => r()));
      result.ffmpeg = fs.existsSync(tmp);

      const probe = await controller.webContents.executeJavaScript(
        `window.vj.probe(${JSON.stringify(tmp)})`);
      result.probe = probe;

      result.arquivo = await output.webContents.executeJavaScript(`
        (async () => {
          VJ.loadFile('A', location.origin + '/local?p=' + encodeURIComponent(${JSON.stringify(tmp)}));
          await new Promise(r => setTimeout(r, 3000));
          const v = document.getElementById('vidAout');
          return { kind: VJ.kind('A'), tocando: !v.paused, t: +v.currentTime.toFixed(1),
                   dur: +(v.duration || 0).toFixed(1), visivel: v.style.display !== 'none' };
        })()`);
    }

    // 7f) fase 2: captura do áudio do sistema e modulação escrevendo no parâmetro
    result.audio = await controller.webContents.executeJavaScript(`
      (async () => {
        try {
          const st = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'desktop' } },
            video: { mandatory: { chromeMediaSource: 'desktop', maxWidth: 2, maxHeight: 2 } }
          });
          const faixas = st.getAudioTracks().length;
          st.getTracks().forEach(t => t.stop());
          return { loopback: faixas > 0, faixas };
        } catch (e) { return { loopback: false, erro: String(e.message || e) }; }
      })()`);

    result.modul = await controller.webContents.executeJavaScript(`
      (async () => {
        const painel = [...document.querySelectorAll('button')].find(b => b.textContent === '+ rota');
        if (!painel) return 'sem painel';
        painel.click();
        await new Promise(r => setTimeout(r, 400));
        return { rotas: document.querySelectorAll('.modrow').length,
                 fontes: document.querySelectorAll('.modrow select').length };
      })()`);

    // 7g) motor híbrido: WebGL assume a camada quando a fonte tem pixels
    result.engine = await output.webContents.executeJavaScript(`
      (async () => {
        const b = new BroadcastChannel('vj');
        b.postMessage({ c: 'engine', mode: 'gl' });
        await new Promise(r => setTimeout(r, 1200));
        const c = document.getElementById('glA');
        b.postMessage({ c: 'glfx', deck: 'A', fx: { kaleido: 0.6, rgb: 0.4 } });
        await new Promise(r => setTimeout(r, 1200));
        const info = VJ.glInfo('A');
        return { canvasVisivel: c.style.display !== 'none',
                 tamanho: c.width + 'x' + c.height,
                 frames: info?.frames || 0, brilho: Math.round(info?.brilho || 0),
                 videoOculto: document.getElementById('vidAout').style.display === 'none' };
      })()`);

    // 7h) modulação: escala derruba o valor e, ao remover a rota, ele VOLTA sozinho
    result.modRelease = await controller.webContents.executeJavaScript(`
      (async () => {
        const b = new BroadcastChannel('vj');
        b.postMessage({ c: 'present', deck: 'A', v: true });
        b.postMessage({ c: 'present', deck: 'B', v: true });
        b.postMessage({ c: 'xf', v: 100 });
        await new Promise(r => setTimeout(r, 300));
        // parte limpo: checagens anteriores podem ter deixado rota viva
        for (const linha of [...document.querySelectorAll('.modrow')]) {
          [...linha.querySelectorAll('button')].pop().click();
          await new Promise(r => setTimeout(r, 120));
        }
        const add = [...document.querySelectorAll('button')].find(x => x.textContent === '+ rota');
        add.click();                       // nasce low -> opB, escala 100
        await new Promise(r => setTimeout(r, 900));
        const linha = document.querySelector('.modrow');
        const remover = [...linha.querySelectorAll('button')].pop();
        return { criou: !!linha, remover: !!remover };
      })()`);
    result.modDurante = await output.webContents.executeJavaScript(
      `document.getElementById('pgB').style.opacity`);
    await controller.webContents.executeJavaScript(`
      (async () => {
        const linha = document.querySelector('.modrow');
        [...linha.querySelectorAll('button')].pop().click();
        await new Promise(r => setTimeout(r, 900));
      })()`);
    result.modDepois = await output.webContents.executeJavaScript(
      `document.getElementById('pgB').style.opacity`);

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
  require('./media').register(() => controller);
  await serve();
  makeController();
  makeOutput();
  if (SELFTEST) selftest();
});
// no selftest quem decide a hora de sair é a própria rotina, depois de imprimir
app.on('window-all-closed', () => { if (!SELFTEST) app.quit(); });
