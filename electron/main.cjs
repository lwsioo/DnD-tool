'use strict';
/**
 * App desktop di Codex (Electron).
 * All'avvio mostra un menù con due scelte:
 *  - «Su questo dispositivo»: apre Codex in una finestra d'app;
 *  - «Su altri dispositivi»: rende Codex raggiungibile dalla rete locale (indirizzo + QR code).
 * La build web (dist/) è servita da un piccolo server interno su una porta fissa, così l'origine
 * (http://127.0.0.1:47474) non cambia mai e i dati salvati restano tra un avvio e l'altro.
 */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const QRCode = require('qrcode');
const { startServer, lanAddresses } = require('./server.cjs');

const PORT = 47474;
const ROOT = path.join(__dirname, '..', 'dist');
const LOCAL_URL = `http://127.0.0.1:${PORT}/`;
const ICON = path.join(ROOT, 'pwa-512x512.png');

/** @type {BrowserWindow | null} */ let launcher = null;
/** @type {BrowserWindow | null} */ let appWindow = null;
/** @type {{ host: string, stop: () => Promise<void> } | null} */ let server = null;

// ── Lingua (italiano/inglese), condivisa tra menù iniziale e app ─────────────────────────────

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}

/** Lingua scelta; al primo avvio quella di Windows (italiano se è italiano, altrimenti inglese). */
function getLocale() {
  const saved = readSettings().locale;
  if (saved === 'it' || saved === 'en') return saved;
  return app.getLocale().toLowerCase().startsWith('it') ? 'it' : 'en';
}

function setLocale(locale) {
  if (locale !== 'it' && locale !== 'en') return;
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify({ ...readSettings(), locale }, null, 2));
  } catch {
    /* non salvato: vale solo per questa sessione */
  }
  launcher?.webContents.send('codex:locale', locale);
}

/** Avvia (o riavvia su un'altra interfaccia) il server interno. */
async function ensureServer(host) {
  if (server && server.host === host) return;
  if (server) {
    await server.stop();
    server = null;
  }
  server = await startServer({ root: ROOT, host, port: PORT });
}

async function stopServer() {
  if (!server) return;
  const s = server;
  server = null;
  await s.stop();
}

const sharing = () => server?.host === '0.0.0.0';

/** I link esterni (licenza, 5etools…) si aprono nel browser predefinito, non dentro l'app. */
function openExternalLinksOutside(win) {
  const isInternal = (url) => url.startsWith(`http://127.0.0.1:${PORT}`) || url.startsWith('file:');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url) && !isInternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isInternal(url)) {
      event.preventDefault();
      if (/^https?:/.test(url)) void shell.openExternal(url);
    }
  });
}

function openAppWindow() {
  if (appWindow) {
    if (appWindow.isMinimized()) appWindow.restore();
    appWindow.focus();
    return;
  }
  appWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Codex',
    icon: ICON,
    backgroundColor: '#111114',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'app-preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  appWindow.setMenu(null);
  openExternalLinksOutside(appWindow);
  appWindow.once('ready-to-show', () => appWindow?.show());
  appWindow.on('closed', () => {
    appWindow = null;
    // Senza la finestra dell'app, il server serve solo se si sta condividendo.
    if (!sharing()) void stopServer();
    if (!launcher) app.quit();
  });
  // La lingua scelta nel menù passa all'app con ?lang= (l'app la ricorda e la toglie dall'indirizzo).
  void appWindow.loadURL(`${LOCAL_URL}?lang=${getLocale()}`);
}

function openLauncher() {
  if (launcher) {
    launcher.focus();
    return;
  }
  launcher = new BrowserWindow({
    width: 620,
    height: 680,
    resizable: false,
    maximizable: false,
    title: 'Codex',
    icon: ICON,
    backgroundColor: '#111114',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  launcher.setMenu(null);
  openExternalLinksOutside(launcher);
  launcher.once('ready-to-show', () => launcher?.show());
  launcher.on('closed', () => {
    launcher = null;
    // Chiudendo il menù si chiude anche la condivisione in rete.
    if (sharing()) void (appWindow ? ensureServer('127.0.0.1') : stopServer());
    if (!appWindow) app.quit();
  });
  void launcher.loadFile(path.join(__dirname, 'launcher.html'));
}

/** Stato della condivisione per il menù: indirizzi con il loro QR code. */
async function sharingState() {
  if (!sharing()) return { sharing: false, addresses: [] };
  const addresses = await Promise.all(
    lanAddresses().map(async ({ name, address }) => {
      const url = `http://${address}:${PORT}/`;
      const qr = await QRCode.toDataURL(url, {
        margin: 1,
        width: 220,
        color: { dark: '#111114', light: '#ffffff' },
      });
      return { name, url, qr };
    }),
  );
  return { sharing: true, addresses };
}

const errorMessage = (e) => (e instanceof Error ? e.message : String(e));

ipcMain.handle('codex:open-local', async () => {
  try {
    if (!server) await ensureServer('127.0.0.1');
    openAppWindow();
    // Se non si condivide, il menù non serve più.
    if (!sharing()) launcher?.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
});

ipcMain.handle('codex:start-sharing', async () => {
  try {
    await ensureServer('0.0.0.0');
    return { ok: true, ...(await sharingState()) };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
});

ipcMain.handle('codex:stop-sharing', async () => {
  try {
    if (appWindow) await ensureServer('127.0.0.1');
    else await stopServer();
    return { ok: true, ...(await sharingState()) };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
});

ipcMain.handle('codex:open-here', async () => {
  openAppWindow();
  return { ok: true };
});

ipcMain.handle('codex:version', () => app.getVersion());
ipcMain.handle('codex:get-locale', () => getLocale());
ipcMain.on('codex:set-locale', (_event, locale) => setLocale(locale));

// Per le prove automatiche: archivio in una cartella a parte, senza toccare i dati veri.
if (process.env.CODEX_USER_DATA) app.setPath('userData', process.env.CODEX_USER_DATA);

// Una sola copia dell'app: riaprendo l'exe si torna alla finestra già aperta.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = appWindow ?? launcher;
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    } else {
      openLauncher();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    openLauncher();
  });

  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => {
    void stopServer();
  });
}
