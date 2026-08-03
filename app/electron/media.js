// ────────────────────────────────────────────
// TALLER VJ APP 0.6 — media.js
// § - ffmpeg sidecar, local catalogue and file pickers · JS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
const { ipcMain, dialog, app } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

// Empacotado, os módulos vivem dentro de app.asar — e um .exe não roda de dentro de
// um arquivo. O electron-builder desempacota os dois (asarUnpack); aqui o caminho
// é corrigido para apontar para a pasta desempacotada.
const foraDoAsar = p => (p ? p.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep)
  .replace('app.asar/', 'app.asar.unpacked/') : p);
const ffmpeg = foraDoAsar(require('ffmpeg-static'));
const ffprobe = foraDoAsar(require('ffprobe-static').path);

const VIDEO_EXT = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v', '.ogv'];
const cacheDir = path.join(app.getPath('userData'), 'thumbs');
// pasta-fonte do acervo: é para onde o download vai e onde os diálogos abrem
const libPadrao = () => path.join(app.getPath('videos'), 'taller-vj', 'library');

const run = (bin, args) => new Promise(resolve => {
  execFile(bin, args, { windowsHide: true, maxBuffer: 1 << 24 }, (err, stdout, stderr) => {
    resolve({ ok: !err, out: stdout, err: err ? String(stderr || err) : undefined });
  });
});

// ── § 1 — REGISTER ──
function register(getWindow) {
  fs.mkdirSync(cacheDir, { recursive: true });

  ipcMain.handle('vj:ffmpeg', (_e, args) => run(ffmpeg, args));

  ipcMain.handle('vj:probe', async (_e, file) => {
    const r = await run(ffprobe, ['-v', 'quiet', '-print_format', 'json',
      '-show_format', '-show_streams', file]);
    if (!r.ok) return null;
    try {
      const j = JSON.parse(r.out);
      const v = (j.streams || []).find(s => s.codec_type === 'video') || {};
      return {
        dur: +(j.format?.duration || 0),
        width: v.width || 0, height: v.height || 0,
        vertical: !!(v.width && v.height && v.height > v.width),
        codec: v.codec_name || null
      };
    } catch { return null; }
  });

  // um quadro do meio do vídeo vira a miniatura do catálogo
  ipcMain.handle('vj:thumb', async (_e, file, at) => {
    const key = Buffer.from(file).toString('base64url').slice(-60);
    const dest = path.join(cacheDir, key + '.jpg');
    if (fs.existsSync(dest)) return dest;
    const r = await run(ffmpeg, ['-ss', String(at ?? 5), '-i', file, '-frames:v', '1',
      '-vf', 'scale=320:-1', '-y', dest]);
    return r.ok && fs.existsSync(dest) ? dest : null;
  });

  ipcMain.handle('vj:libDir', () => libPadrao());

  ipcMain.handle('vj:pickFiles', async (_e, dir) => {
    const inicio = dir || libPadrao();
    fs.mkdirSync(inicio, { recursive: true });
    const { canceled, filePaths } = await dialog.showOpenDialog(getWindow(), {
      title: 'Escolher vídeos', defaultPath: inicio,
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Vídeo', extensions: VIDEO_EXT.map(e => e.slice(1)) }]
    });
    return canceled ? [] : filePaths;
  });

  ipcMain.handle('vj:pickFolder', async (_e, dir) => {
    const inicio = dir || libPadrao();
    fs.mkdirSync(inicio, { recursive: true });
    const { canceled, filePaths } = await dialog.showOpenDialog(getWindow(), {
      title: 'Escolher pasta de catálogo', defaultPath: inicio,
      properties: ['openDirectory']
    });
    if (canceled || !filePaths?.length) return null;
    const escolhida = filePaths[0];
    const files = [];
    const walk = d => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (VIDEO_EXT.includes(path.extname(e.name).toLowerCase())) files.push(p);
      }
    };
    try { walk(escolhida); } catch { /* pasta ilegível */ }
    return { dir: escolhida, files };
  });

  // corta o trecho marcado e salva como clipe novo: garimpo vira acervo
  ipcMain.handle('vj:clip', async (_e, { file, start, end }) => {
    const base = path.basename(file, path.extname(file));
    const { canceled, filePath } = await dialog.showSaveDialog(getWindow(), {
      title: 'Salvar trecho', defaultPath: `${base}-${Math.round(start)}s.mp4`,
      filters: [{ name: 'MP4', extensions: ['mp4'] }]
    });
    if (canceled || !filePath) return null;
    const r = await run(ffmpeg, ['-ss', String(start), '-to', String(end), '-i', file,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-y', filePath]);
    return r.ok ? filePath : null;
  });

  ipcMain.handle('vj:toMp4', async (_e, src) => {
    const dest = src.replace(/\.webm$/i, '') + '.mp4';
    const r = await run(ffmpeg, ['-i', src, '-c:v', 'libx264', '-preset', 'veryfast',
      '-crf', '20', '-c:a', 'aac', '-y', dest]);
    return r.ok ? dest : null;
  });

  ipcMain.handle('vj:tmpdir', () => path.join(os.tmpdir(), 'taller-vj'));

  // ── § 2 — BAIXAR — streaming continua sendo o padrão; isto é o acervo ──
  // O Archive serve de um datacenter só e engasga ao vivo. Baixado, o item vira
  // arquivo local: seek instantâneo, shader, e nada de rede no meio da festa.
  ipcMain.handle('vj:baixar', async (e, url, nome, dir0) => {
    const dir = dir0 || libPadrao();
    await fs.promises.mkdir(dir, { recursive: true });
    const limpo = String(nome || 'video').replace(/[^\w\-. ]/g, '_').slice(0, 80);
    const ext = (url.match(/\.(mp4|m4v|webm|ogv|mkv)(\?|$)/i) || [, 'mp4'])[1];
    const destino = path.join(dir, `${limpo}.${ext}`);
    if (fs.existsSync(destino)) return { path: destino, jaTinha: true };

    const parcial = destino + '.part';
    // a janela pode morrer no meio do download: avisar um WebContents destruído
    // derruba o processo principal inteiro, com caixa de erro na cara do operador
    const avisa = d => { try { if (!e.sender.isDestroyed()) e.sender.send('vj:baixando', d); } catch { /* janela foi embora */ } };

    let req = null;
    const desistir = () => { try { req?.destroy(); } catch { /* ignore */ } };
    e.sender.once('destroyed', desistir);

    return new Promise(resolve => {

      const puxa = (endereco, saltos = 0) => {
        if (saltos > 5) return resolve({ error: 'too many redirects' });
        req = https.get(endereco, { headers: { 'user-agent': app.userAgentFallback } }, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            return puxa(new URL(res.headers.location, endereco).href, saltos + 1);
          }
          if (res.statusCode !== 200) { res.resume(); return resolve({ error: 'HTTP ' + res.statusCode }); }
          const total = +(res.headers['content-length'] || 0);
          let lido = 0, ultimo = 0;
          const arquivo = fs.createWriteStream(parcial);
          res.on('data', c => {
            lido += c.length;
            const agora = Date.now();
            if (agora - ultimo > 300) { ultimo = agora; avisa({ url, lido, total }); }
          });
          res.on('error', err => resolve({ error: String(err.message || err) }));
          res.pipe(arquivo);
          // No Windows o handle às vezes demora um instante para soltar depois do
          // close, e o rename falha. Silenciar isso deixava um .part no disco e
          // devolvia um caminho que não existe.
          const encerra = (tentativa = 0) => {
            try {
              fs.renameSync(parcial, destino);
              avisa({ url, lido, total, fim: true });
              resolve({ path: destino, bytes: lido });
            } catch (err) {
              if (tentativa < 5) return setTimeout(() => encerra(tentativa + 1), 250);
              resolve({ error: 'could not finish the file: ' + (err.message || err) });
            }
          };
          arquivo.on('finish', () => arquivo.close(() => encerra()));
          arquivo.on('error', err => resolve({ error: String(err.message || err) }));
        }).on('error', err => resolve({ error: String(err.message || err) }));
      };
      puxa(url);
    }).finally(() => {
      try { e.sender.off('destroyed', desistir); } catch { /* janela já foi */ }
    });
  });
}

module.exports = { register, ffmpeg, ffprobe, VIDEO_EXT };
