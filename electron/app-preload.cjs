'use strict';
/**
 * Ponte per la finestra dell'app: quando l'utente cambia lingua nelle Impostazioni di Codex,
 * la scelta arriva anche al processo principale (così il menù iniziale parla la stessa lingua).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codexDesktop', {
  setLocale: (locale) => ipcRenderer.send('codex:set-locale', locale),
});
