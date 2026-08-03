// ────────────────────────────────────────────
// TALLER VJ APP 0.1 — preload.js
// § - Safe bridge between renderer and main · JS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vj', {
  displays: () => ipcRenderer.invoke('vj:displays'),
  openOutput: () => ipcRenderer.invoke('vj:openOutput'),
  setAspect: ar => ipcRenderer.invoke('vj:setAspect', ar),
  checklist: () => ipcRenderer.invoke('vj:checklist'),
  saveSession: data => ipcRenderer.invoke('vj:saveSession', data),
  openSession: () => ipcRenderer.invoke('vj:openSession'),
  ffmpeg: args => ipcRenderer.invoke('vj:ffmpeg', args),
  probe: file => ipcRenderer.invoke('vj:probe', file),
  thumb: (file, at) => ipcRenderer.invoke('vj:thumb', file, at),
  pickFiles: dir => ipcRenderer.invoke('vj:pickFiles', dir),
  pickFolder: dir => ipcRenderer.invoke('vj:pickFolder', dir),
  libDir: () => ipcRenderer.invoke('vj:libDir'),
  clip: opts => ipcRenderer.invoke('vj:clip', opts),
  toMp4: src => ipcRenderer.invoke('vj:toMp4', src),
  sources: () => ipcRenderer.invoke('vj:sources'),
  saveRec: (bytes, ext, dir, rotulo) => ipcRenderer.invoke('vj:saveRec', bytes, ext, dir, rotulo),
  recDir: () => ipcRenderer.invoke('vj:recDir'),
  pickDir: atual => ipcRenderer.invoke('vj:pickDir', atual),
  reveal: p => ipcRenderer.invoke('vj:reveal', p),
  baixar: (url, nome, dir) => ipcRenderer.invoke('vj:baixar', url, nome, dir),
  onBaixando: fn => {
    const h = (_e, d) => fn(d);
    ipcRenderer.on('vj:baixando', h);
    return () => ipcRenderer.removeListener('vj:baixando', h);
  }
});
