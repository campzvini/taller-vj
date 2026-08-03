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

const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;

const VIDEO_EXT = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v', '.ogv'];
const cacheDir = path.join(app.getPath('userData'), 'thumbs');

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

  ipcMain.handle('vj:pickFiles', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getWindow(), {
      title: 'Escolher vídeos', properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Vídeo', extensions: VIDEO_EXT.map(e => e.slice(1)) }]
    });
    return canceled ? [] : filePaths;
  });

  ipcMain.handle('vj:pickFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getWindow(), {
      title: 'Escolher pasta de catálogo', properties: ['openDirectory']
    });
    if (canceled || !filePaths?.length) return null;
    const dir = filePaths[0];
    const files = [];
    const walk = d => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (VIDEO_EXT.includes(path.extname(e.name).toLowerCase())) files.push(p);
      }
    };
    try { walk(dir); } catch { /* pasta ilegível */ }
    return { dir, files };
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
  ipcMain.handle('vj:baixar', async (e, url, nome) => {
    const dir = path.join(app.getPath('videos'), 'taller-vj', 'library');
    await fs.promises.mkdir(dir, { recursive: true });
    const limpo = String(nome || 'video').replace(/[^\w\-. ]/g, '_').slice(0, 80);
    const ext = (url.match(/\.(mp4|m4v|webm|ogv|mkv)(\?|$)/i) || [, 'mp4'])[1];
    const destino = path.join(dir, `${limpo}.${ext}`);
    if (fs.existsSync(destino)) return { path: destino, jaTinha: true };

    const parcial = destino + '.part';
    return new Promise(resolve => {
      const puxa = (endereco, saltos = 0) => {
        if (saltos > 5) return resolve({ error: 'too many redirects' });
        https.get(endereco, { headers: { 'user-agent': app.userAgentFallback } }, res => {
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
            if (agora - ultimo > 400) {          // progresso sem inundar o bus
              ultimo = agora;
              e.sender.send('vj:baixando', { url, lido, total });
            }
          });
          res.pipe(arquivo);
          arquivo.on('finish', () => arquivo.close(() => {
            fs.renameSync(parcial, destino);
            e.sender.send('vj:baixando', { url, lido, total, fim: true });
            resolve({ path: destino });
          }));
          arquivo.on('error', err => resolve({ error: String(err) }));
        }).on('error', err => resolve({ error: String(err) }));
      };
      puxa(url);
    });
  });
}

module.exports = { register, ffmpeg, ffprobe, VIDEO_EXT };
