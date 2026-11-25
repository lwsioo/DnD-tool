'use strict';
/**
 * Server statico minimo che serve la build di Codex (cartella dist/) per la finestra dell'app
 * e, in modalità «altri dispositivi», per i dispositivi della rete locale.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** Questi file cambiano a ogni versione: niente cache, così gli aggiornamenti arrivano subito. */
const NO_CACHE = new Set(['/index.html', '/sw.js', '/registerSW.js', '/manifest.webmanifest']);

/** Percorso del file da servire per un URL, o null se esce dalla cartella (es. "/../segreto"). */
function resolveFile(root, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://x').pathname);
  } catch {
    return null;
  }
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const file = path.resolve(root, '.' + pathname);
  const rel = path.relative(root, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return { file, pathname };
}

function handler(root) {
  return (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const target = resolveFile(root, req.url || '/');
    if (!target) {
      res.writeHead(403).end('Vietato');
      return;
    }
    // L'app usa il routing con l'hash (#/...): un percorso sconosciuto senza estensione mostra comunque l'app.
    let { file, pathname } = target;
    if (!fs.existsSync(file) && !path.extname(pathname)) {
      file = path.join(root, 'index.html');
      pathname = '/index.html';
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Non trovato');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': NO_CACHE.has(pathname) ? 'no-cache' : 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(file).pipe(res);
    });
  };
}

/**
 * Avvia il server. `host` = '127.0.0.1' (solo questo PC) o '0.0.0.0' (anche la rete locale).
 * Restituisce un oggetto con `stop()`; rifiuta con un errore leggibile se la porta è occupata.
 */
function startServer({ root, host = '127.0.0.1', port = 47474 }) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler(root));
    server.once('error', (err) => {
      reject(
        err && err.code === 'EADDRINUSE'
          ? new Error(`La porta ${port} è già usata da un altro programma (forse Codex è già aperto).`)
          : err,
      );
    });
    server.listen(port, host, () => {
      resolve({
        host,
        port: server.address().port,
        stop: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

/** Indirizzi IPv4 del PC raggiungibili dalla rete locale (esclusi loopback e adattatori virtuali). */
function lanAddresses() {
  const virtual = /vEthernet|VirtualBox|VMware|WSL|Hyper-V|Loopback|docker|vbox|utun|tailscale|zerotier/i;
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (virtual.test(name)) continue;
    for (const a of list || []) {
      if ((a.family === 'IPv4' || a.family === 4) && !a.internal && !a.address.startsWith('169.254.')) {
        out.push({ name, address: a.address });
      }
    }
  }
  return out;
}

module.exports = { startServer, lanAddresses, resolveFile };
