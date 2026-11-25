'use strict';
/** Ponte sicuro tra il menù iniziale (launcher.html) e il processo principale. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codex', {
  openLocal: () => ipcRenderer.invoke('codex:open-local'),
  startSharing: () => ipcRenderer.invoke('codex:start-sharing'),
  stopSharing: () => ipcRenderer.invoke('codex:stop-sharing'),
  openHere: () => ipcRenderer.invoke('codex:open-here'),
  version: () => ipcRenderer.invoke('codex:version'),
  getLocale: () => ipcRenderer.invoke('codex:get-locale'),
  setLocale: (locale) => ipcRenderer.send('codex:set-locale', locale),
  onLocale: (fn) => ipcRenderer.on('codex:locale', (_event, locale) => fn(locale)),
});
