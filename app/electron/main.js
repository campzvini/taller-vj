// ────────────────────────────────────────────
// TALLER VJ APP 0.1 — main.js
// § - Electron main: local http server, controller and output windows · JS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
const { app, BrowserWindow, Menu, screen, ipcMain, dialog, desktopCapturer, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', 'dist');
const SELFTEST = process.argv.includes('--selftest');
const DIAG = process.argv.includes('--diag');   // abre só o controlador e conta a tela
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
  // Nasce JÁ do tamanho da área de trabalho. maximize() antes de mostrar é
  // instável em janela com barra de título própria no Windows: às vezes ela
  // "maximiza" para o tamanho restaurado anterior e sobra desktop embaixo.
  const wa = screen.getPrimaryDisplay().workArea;
  controller = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    minWidth: 1100, minHeight: 700,
    backgroundColor: '#0a0a0c', title: 'Taller VJ',
    show: false,   // evita o piscar de janela pequena antes de assentar
    // a barra do app É a barra de título: o chrome do sistema vira parte da interface
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#131318', symbolColor: '#d8d8e0', height: 32 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, ...PART }
  });
  controller.once('ready-to-show', () => {
    controller.show();
    controller.maximize();
    // maximize é assíncrono no Windows: confere depois e força se não colou
    const confere = () => {
      const b = controller.getBounds();
      if (b.height < wa.height - 8 || b.width < wa.width - 8) controller.setBounds(wa);
    };
    confere();
    setTimeout(confere, 150);
    setTimeout(confere, 600);
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
  return s.map(x => ({ id: x.id, name: x.name, tipo: x.id.startsWith('screen') ? 'screen' : 'window' }));
});

// ── § 2.0.1 — RECORDING — o renderer captura, o main só encosta no disco ──
// Sem diálogo: em performance ninguém quer escolher pasta. Vai para Vídeos/taller-vj
// com carimbo de data, e o botão "abrir pasta" resolve o resto depois.
const recDirPadrao = () => path.join(app.getPath('videos'), 'taller-vj');

ipcMain.handle('vj:recDir', () => recDirPadrao());

ipcMain.handle('vj:pickDir', async (_e, atual) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(controller, {
    title: 'Pasta das gravações', defaultPath: atual || recDirPadrao(),
    properties: ['openDirectory', 'createDirectory']
  });
  return canceled || !filePaths?.length ? null : filePaths[0];
});

ipcMain.handle('vj:saveRec', async (_e, bytes, ext, dir, rotulo) => {
  const destino = dir || recDirPadrao();
  await fs.promises.mkdir(destino, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sufixo = rotulo ? '-' + String(rotulo).replace(/[^\w-]/g, '') : '';
  const alvo = path.join(destino, `taller-vj-${carimbo}${sufixo}.${ext || 'webm'}`);
  await fs.promises.writeFile(alvo, Buffer.from(bytes));
  return alvo;
});

// abrir a pasta precisa funcionar mesmo sem arquivo ainda: é como o operador
// confere o destino ANTES de gravar. Com arquivo, seleciona ele no explorador.
ipcMain.handle('vj:reveal', async (_e, p) => {
  if (p && fs.existsSync(p) && fs.statSync(p).isFile()) { shell.showItemInFolder(p); return true; }
  const dir = p && fs.existsSync(p) ? p
    : p ? path.dirname(p) : recDirPadrao();
  await fs.promises.mkdir(dir, { recursive: true });
  const erro = await shell.openPath(dir);
  return !erro;
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

// Censo da tela em dois momentos: o que existe, o que tem tamanho, e o que
// estourou. Serve para bug que aparece SEM interação nenhuma.
async function diagnostico() {
  const censo = `(() => {
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const info = sel => {
      const el = document.querySelector(sel);
      if (!el) return 'ausente';
      const c = getComputedStyle(el), r = el.getBoundingClientRect();
      return Math.round(r.width) + 'x' + Math.round(r.height) +
        ' ' + c.display + '/' + c.visibility + ' op' + c.opacity;
    };
    return {
      erros: window.__erros || [],
      html: document.body.innerHTML.length,
      nos: document.querySelectorAll('*').length,
      visiveis: [...document.querySelectorAll('button')].filter(vis).length,
      botoes: document.querySelectorAll('button').length,
      body: document.body.className,
      root: info('#root'), bar: info('#bar'), main: info('#main'),
      colA: info('#main > .col'), cards: document.querySelectorAll('.card').length,
      zonas: document.querySelectorAll('.zona').length,
      transport: info('.transport'), foot: info('#foot'), lib: info('.lib'),
      rows: getComputedStyle(document.getElementById('root')).gridTemplateRows,
      filhos: [...document.getElementById('root').children].map(e => {
        const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
        return (e.id || e.className) + ' top:' + Math.round(r.top) + ' h:' + Math.round(r.height) +
          ' row:' + c.gridRowStart + ' pos:' + c.position;
      }),
      vh: innerHeight, bodyH: Math.round(document.body.getBoundingClientRect().height)
    };
  })()`;
  const r = {};
  try {
    const wa = screen.getPrimaryDisplay().workArea;
    r.janela = { bounds: controller.getBounds(), areaTrabalho: wa,
                 maximizada: controller.isMaximized() };
    // sem conteúdo a tela mente: semeamos biblioteca e slots antes de olhar
    const it = (id, t) => ({ id, title: t, thumb: 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg' });
    const semente = JSON.stringify([
      it('aqz-KE-bpKQ', 'Big Buck Bunny 60fps 4K'), it('jNQXAC9IVRw', 'Me at the zoo'),
      it('dQw4w9WgXcQ', 'Never Gonna Give You Up'), it('9bZkp7q19f0', 'GANGNAM STYLE')
    ]);
    await controller.webContents.executeJavaScript(`
      localStorage.setItem('vj.libA', ${'`'}${'$'}{${JSON.stringify(semente)}}${'`'});
      localStorage.setItem('vj.libB', ${'`'}${'$'}{${JSON.stringify(semente)}}${'`'});
      localStorage.setItem('vj.libC', ${'`'}${'$'}{${JSON.stringify(semente)}}${'`'});
      localStorage.setItem('vj.palco', 'false');
      location.reload();`);
    await wait(3500);
    await controller.webContents.executeJavaScript(
      `window.__erros = []; addEventListener('error', e => window.__erros.push(String(e.message)));
       addEventListener('unhandledrejection', e => window.__erros.push('rej: ' + String(e.reason)));`);
    const tira = async nome => {
      const img = await controller.capturePage();
      const p = path.join(os.tmpdir(), 'vj-diag-' + nome + '.png');
      await fs.promises.writeFile(p, img.toPNG());
      return p;
    };
    await wait(4000);
    r.aos4s = await controller.webContents.executeJavaScript(censo);
    r.png4s = await tira('4s');
    await wait(11000);
    r.aos15s = await controller.webContents.executeJavaScript(censo);
    r.png15s = await tira('15s');
    r.ux = await controller.webContents.executeJavaScript(`
      (async () => {
        const rect = s => { const e = document.querySelector(s); if (!e) return 'ausente';
          const r = e.getBoundingClientRect();
          return { y: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; };
        const wrap = document.getElementById('searchwrap');
        const comBusca = { foot: rect('#foot'), main: rect('#main'), janela: innerHeight,
                           busca: rect('#searchwrap') };
        [...document.querySelectorAll('#bar button')].find(b => b.textContent.startsWith('search')).click();
        await new Promise(r => setTimeout(r, 700));
        const semBusca = { foot: rect('#foot'), main: rect('#main'), janela: innerHeight };
        // lista do bed
        [...document.querySelectorAll('#foot button')].find(b => b.textContent.includes('list')).click();
        await new Promise(r => setTimeout(r, 600));
        const bl = document.getElementById('bedlist');
        const lista = bl ? { ...rect('#bedlist'), itens: bl.querySelectorAll('.item').length,
                             vazio: !!bl.querySelector('.empty') } : 'ausente';
        return { comBusca, semBusca, lista, fechada: wrap.classList.contains('closed') };
      })()`);
    r.pngLista = await tira('lista');

    // a coluna de garimpo aberta, para conferir a olho o que o censo não vê
    await controller.webContents.executeJavaScript(
      `[...document.querySelectorAll('#bar button')].find(b => b.textContent === 'browse')?.click()`);
    await wait(1500);
    r.pngBrowse = await tira('browse');

    // o cartão do garimpo precisa carregar de verdade: cue e deck
    r.garimpo = await controller.webContents.executeJavaScript(`
      (async () => {
        const b = document.querySelector('.browser');
        if (!b) return { erro: 'coluna fechada' };
        const põe = (el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const sel = b.querySelectorAll('select')[0];
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'ia');
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        // sem título: só a coleção
        const col = b.querySelectorAll('select')[1];
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(col, 'prelinger');
        col.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        [...b.querySelectorAll('button')].find(x => x.textContent === 'Search').click();
        await new Promise(r => setTimeout(r, 6000));
        const cartoes = b.querySelectorAll('.cartao').length;
        const alturas = [...b.querySelectorAll('.cartao')].slice(0, 3)
          .map(e => Math.round(e.getBoundingClientRect().height));
        if (!cartoes) return { cartoes, alturas, erro: 'sem resultado' };
        const primeiro = b.querySelector('.cartao .tit')?.textContent?.slice(0, 24);
        [...b.querySelectorAll('.cartao')][0].querySelector('button').click();   // cue
        await new Promise(r => setTimeout(r, 6000));
        const noCue = document.querySelector('.cuemod .now')?.textContent?.slice(0, 24) || '';
        [...b.querySelectorAll('.cartao')][0].querySelectorAll('button')[1].click(); // -> A
        await new Promise(r => setTimeout(r, 6000));
        const noDeckA = document.querySelectorAll('.hd .now')[0]?.textContent?.slice(0, 24) || '';
        const vidA = document.getElementById('vidAmon');
        return { cartoes, alturas, primeiro, noCue, noDeckA,
                 deckTocando: vidA ? !vidA.paused : null,
                 deckSrc: (vidA?.currentSrc || '').slice(0, 40) };
      })()`);
    r.pngGarimpo = await tira('garimpo');
  } catch (e) { r.error = String(e); }
  console.log('DIAG ' + JSON.stringify(r));
  app.exit(0);
}

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
        [...document.querySelectorAll('#sbar button')].find(b => b.textContent === 'Search').click();
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
        const btn = [...document.querySelectorAll('#foot button')].find(b => b.textContent.includes('list'));
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
        const painel = [...document.querySelectorAll('button')].find(b => b.textContent === '+ route');
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
        const add = [...document.querySelectorAll('button')].find(x => x.textContent === '+ route');
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

    // 7n) teclas de performance continuam vivas com o foco num slider — foi o que
    //     matou o disparo dos samples: qualquer input engolia as teclas
    result.teclas = await controller.webContents.executeJavaScript(`
      (async () => {
        const põe = (el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const xf = document.getElementById('xf');
        põe(xf, 50);
        await new Promise(r => setTimeout(r, 200));
        xf.focus();
        const focado = document.activeElement === xf;
        // a tecla nasce NO slider, como acontece depois de qualquer arraste
        xf.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        return { focado, antes: 50, depois: +xf.value, soltouFoco: document.activeElement !== xf };
      })()`);

    // 7i) fase 6: a cena guarda a mistura e a devolve inteira quando chamada
    result.cena = await controller.webContents.executeJavaScript(`
      (async () => {
        // input controlado pelo React só aceita valor pelo setter nativo
        const põe = (el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const xf = document.getElementById('xf');
        põe(xf, 20);
        await new Promise(r => setTimeout(r, 200));
        const guardar = [...document.querySelectorAll('button')].find(b => b.textContent.includes('save mix'));
        if (!guardar) return 'sem painel de cenas';
        guardar.click();
        await new Promise(r => setTimeout(r, 300));
        põe(xf, 90);
        await new Promise(r => setTimeout(r, 200));
        const antes = +xf.value;
        document.querySelector('.cenab').click();
        await new Promise(r => setTimeout(r, 400));
        return { guardadas: document.querySelectorAll('.cenab').length, antes, depois: +xf.value };
      })()`);
    result.cenaOut = await output.webContents.executeJavaScript(
      `getComputedStyle(document.getElementById('pgB')).opacity`);

    // 7j) fase 5: o menu de gravação abre, oferece as três capturas, e gravar as
    //     DUAS janelas pela interface produz dois arquivos no destino escolhido
    const recDir = path.join(os.tmpdir(), 'taller-vj-selftest-rec');
    fs.rmSync(recDir, { recursive: true, force: true });
    result.recMenu = await controller.webContents.executeJavaScript(`
      (async () => {
        const seta = [...document.querySelectorAll('#bar button')].find(b => b.textContent === '▾');
        if (!seta) return { erro: 'sem botão de opções' };
        seta.click();
        await new Promise(r => setTimeout(r, 1200));
        const p = document.querySelector('.recpanel');
        if (!p) return { erro: 'menu não abriu' };
        const cx = p.getBoundingClientRect();
        // escolher "os dois" e apontar o destino sem passar por diálogo
        const opts = [...p.querySelectorAll('.opt input')];
        opts[2].click();
        await new Promise(r => setTimeout(r, 200));
        return {
          abriu: true,
          visivel: cx.height > 0 && cx.bottom <= innerHeight + 1 && cx.right <= innerWidth + 1,
          opcoes: opts.length,
          janelas: p.querySelectorAll('select').length,
          temPasta: !!p.querySelector('.caminho')?.textContent
        };
      })()`);
    // a pasta vem de diálogo nativo; no teste escrevemos direto no estado salvo
    await controller.webContents.executeJavaScript(`
      localStorage.setItem('vj.recDir', ${JSON.stringify(recDir)});
      location.reload();`);
    await wait(4000);
    result.gravacao = await controller.webContents.executeJavaScript(`
      (async () => {
        const botao = () => [...document.querySelectorAll('#bar button')]
          .find(b => b.textContent.includes('REC') || b.textContent.startsWith('●'));
        const seta = [...document.querySelectorAll('#bar button')].find(b => b.textContent === '▾');
        seta.click();
        await new Promise(r => setTimeout(r, 1200));
        const p = document.querySelector('.recpanel');
        [...p.querySelectorAll('.opt input')][2].click();   // os dois
        await new Promise(r => setTimeout(r, 300));
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        botao().click();
        await new Promise(r => setTimeout(r, 3000));
        const rotulo = botao().textContent;
        botao().click();
        await new Promise(r => setTimeout(r, 5000));
        return { rotulo, parou: botao().textContent };
      })()`);
    result.gravacao.arquivos = fs.existsSync(recDir)
      ? fs.readdirSync(recDir).map(f => ({ f, kb: Math.round(fs.statSync(path.join(recDir, f)).size / 1024) }))
      : [];
    fs.rmSync(recDir, { recursive: true, force: true });

    // 7k) UI: o chrome do sistema sumiu, a barra virou barra de título, e o modo
    //     palco esconde a preparação sem levar junto o que a mão toca
    result.chrome = {
      menuDoSistema: Menu.getApplicationMenu() !== null,
      overlay: await controller.webContents.executeJavaScript(
        `!!navigator.windowControlsOverlay?.visible`),
      barraArrasta: await controller.webContents.executeJavaScript(
        `getComputedStyle(document.getElementById('bar')).webkitAppRegion === 'drag'`)
    };
    result.palco = await controller.webContents.executeJavaScript(`
      (async () => {
        const vis = el => !!el && el.getBoundingClientRect().height > 0;
        const antes = { busca: vis(document.getElementById('searchwrap')),
                        acervo: vis(document.querySelector('.lib')),
                        fader: vis(document.getElementById('xf')) };
        dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        const durante = { busca: vis(document.getElementById('searchwrap')),
                          acervo: vis(document.querySelector('.lib')),
                          fader: vis(document.getElementById('xf')) };
        dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        // zona fechada continua anunciando o que está aceso lá dentro
        const zhd = [...document.querySelectorAll('.zona > .zhd')]
          .find(h => h.textContent.includes('modulation'));
        zhd.click();
        await new Promise(r => setTimeout(r, 300));
        const fechada = { corpo: !zhd.parentElement.querySelector('.zbody'),
                          resumo: zhd.querySelector('.resumo')?.textContent || '' };
        zhd.click();
        return { antes, durante, depois: vis(document.getElementById('searchwrap')), fechada };
      })()`);

    // 7m) transporte único: barra própria em todo player, chrome do YouTube fora,
    //     e cue/bed com o par de nós que aceita arquivo
    result.transporte = await controller.webContents.executeJavaScript(`({
      barras: document.querySelectorAll('.transport').length,
      capas: document.querySelectorAll('.capa').length,
      cueTemVideo: !!document.getElementById('vidPrev'),
      bedTemVideo: !!document.getElementById('vidCout'),
      semControlesNativos: [...document.querySelectorAll('#monA iframe, #ytwrapP iframe')]
        .every(f => /controls=0/.test(f.src)),
      videoSemControles: ![...document.querySelectorAll('video')].some(v => v.controls),
      // guarda de regressão: filho absoluto sem ancestral posicionado escapa para o
      // viewport e cobre a janela inteira — foi o que apagou a interface uma vez
      escapou: [...document.querySelectorAll('.srcwrap, .capa, .srcvid')]
        .filter(e => e.getBoundingClientRect().width > innerWidth * 0.9)
        .map(e => e.className + '@' + (e.parentElement?.id || e.parentElement?.className))
    })`);

    // sample com ARQUIVO: o pool deixa de ser exclusivo do YouTube
    result.sampFile = await output.webContents.executeJavaScript(`
      (async () => {
        VJ.sampFile(0, location.origin + '/local?p=' + encodeURIComponent(${JSON.stringify(path.join(os.tmpdir(), 'taller-vj-selftest.mp4'))}));
        await new Promise(r => setTimeout(r, 2500));
        const parado = VJ.sampInfo(0);
        VJ.sampOn(0);
        await new Promise(r => setTimeout(r, 1200));
        return { parado, tocando: VJ.sampInfo(0) };
      })()`);

    // 7l) Archive: a busca pública responde à nossa origem e o item vira URL tocável
    result.archive = await controller.webContents.executeJavaScript(`
      (async () => {
        try {
          const p = new URLSearchParams({ q: 'prelinger AND mediatype:(movies)',
            rows: '5', page: '1', output: 'json' });
          p.append('fl[]', 'identifier'); p.append('fl[]', 'title');
          const r = await fetch('https://archive.org/advancedsearch.php?' + p);
          const j = await r.json();
          const docs = j?.response?.docs || [];
          if (!docs.length) return { achou: 0 };
          const m = await (await fetch('https://archive.org/metadata/' + docs[0].identifier)).json();
          const v = (m.files || []).filter(f => /\\.(mp4|ogv|webm|m4v)$/i.test(f.name));
          return { achou: docs.length, item: docs[0].identifier, arquivos: v.length,
                   url: v.length ? 'https://' + m.server + m.dir + '/' + v[0].name : null };
        } catch (e) { return { erro: String(e.message || e) }; }
      })()`);
    result.bedTimeline = await controller.webContents.executeJavaScript(
      `!!document.getElementById('bedtime')`);

    // as duas fontes na saída AO MESMO TEMPO: YouTube num deck, Archive no outro
    if (result.archive?.url) {
      result.mistura = await output.webContents.executeJavaScript(`
        (async () => {
          VJ.load('A', 'jNQXAC9IVRw');
          VJ.loadFile('B', ${JSON.stringify(result.archive.url)});
          await new Promise(r => setTimeout(r, 9000));
          return {
            kindA: VJ.kind('A'), kindB: VJ.kind('B'),
            estadoA: VJ.state('A'), estadoB: VJ.state('B'),
            tA: +VJ.time('A').toFixed(1), tB: +VJ.time('B').toFixed(1),
            erroB: document.getElementById('vidBout').error?.code || null
          };
        })()`);
    }

    // 7o) coluna de garimpo e janela de slots: uma abre no lugar, a outra é
    //     controle remoto — pinta o que o controlador publica e devolve apertos
    result.browser = await controller.webContents.executeJavaScript(`
      (async () => {
        [...document.querySelectorAll('#bar button')].find(b => b.textContent === 'browse').click();
        await new Promise(r => setTimeout(r, 500));
        const c = document.querySelector('.browser');
        return { abriu: !!c, colunas: getComputedStyle(document.getElementById('main')).gridTemplateColumns,
                 filtros: c ? c.querySelectorAll('select').length : 0 };
      })()`);

    // 7p) texto na projeção, acervo único e bed com cruzamento
    result.texto = await output.webContents.executeJavaScript(`
      (async () => {
        const b = new BroadcastChannel('vj');
        b.postMessage({ c:'texto', txt:'TALLER', on:true, size:10, cor:'#ff3b3b',
                        x:50, y:80, modo:'fixo', contorno:true });
        await new Promise(r => setTimeout(r, 500));
        const t = document.getElementById('texto');
        const s = t.firstElementChild;
        const r = { visivel: getComputedStyle(t).display !== 'none', txt: s.textContent,
                    cor: getComputedStyle(s).color, tam: getComputedStyle(s).fontSize };
        b.postMessage({ c:'texto', txt:'TALLER', on:false, size:10, cor:'#fff',
                        x:50, y:80, modo:'fixo', contorno:true });
        await new Promise(r2 => setTimeout(r2, 400));
        r.sumiu = getComputedStyle(t).display === 'none';
        return r;
      })()`);
    result.acervo = await controller.webContents.executeJavaScript(`
      (async () => {
        const libs = document.querySelectorAll('.lib').length;
        const cabecas = [...document.querySelectorAll('.libhd')].map(e => e.textContent.slice(0, 30));
        return { listas: libs, cabecas,
                 bedLoop: !![...document.querySelectorAll('#foot button')].find(b => b.textContent === '⟲') };
      })()`);

    // 7q) baixar com progresso, e FECHAR a janela no meio sem derrubar o main
    result.download = await controller.webContents.executeJavaScript(`
      (async () => {
        const url = 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4';
        // um item do acervo já no ar: baixar tem de trocar a fonte sem parar a imagem
        let ultimo = null, avisos = 0;
        const solta = window.vj.onBaixando(d => { ultimo = d; avisos++; });
        const r = await window.vj.baixar(url, 'selftest-download');
        solta();
        return { ok: !!r.path, erro: r.error || null, avisos,
                 pct: ultimo && ultimo.total ? Math.round(ultimo.lido / ultimo.total * 100) : null,
                 mb: ultimo ? +(ultimo.lido / 1048576).toFixed(1) : 0, fim: !!ultimo?.fim };
      })()`);
    if (result.download?.ok) {
      const alvo = path.join(app.getPath('videos'), 'taller-vj', 'library');
      const achou = fs.existsSync(alvo) && fs.readdirSync(alvo).filter(f => f.startsWith('selftest-download'));
      result.download.arquivos = achou || [];
      (achou || []).forEach(f => { try { fs.unlinkSync(path.join(alvo, f)); } catch { /* ignore */ } });
    }

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
  Menu.setApplicationMenu(null);   // Arquivo/Editar/Ver não pertencem a um instrumento
  require('./media').register(() => controller);
  await serve();
  makeController();
  // a saída é um ato do operador: abrir projeção sozinha rouba o foco e assusta
  if (SELFTEST) { makeOutput(); selftest(); }
  if (DIAG) diagnostico();
});
// no selftest quem decide a hora de sair é a própria rotina, depois de imprimir
app.on('window-all-closed', () => { if (!SELFTEST) app.quit(); });
