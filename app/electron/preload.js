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
  checklist: () => ipcRenderer.invoke('vj:checklist')
});
