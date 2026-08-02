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
  pickFiles: () => ipcRenderer.invoke('vj:pickFiles'),
  pickFolder: () => ipcRenderer.invoke('vj:pickFolder'),
  clip: opts => ipcRenderer.invoke('vj:clip', opts),
  toMp4: src => ipcRenderer.invoke('vj:toMp4', src),
  sources: () => ipcRenderer.invoke('vj:sources')
});
