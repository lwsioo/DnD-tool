import 'fake-indexeddb/auto';
// La visita guidata del primo avvio coprirebbe la pagina in tutti i test: la si segna come già vista
// (prima che lo store legga localStorage). Il test dedicato la riattiva.
localStorage.setItem('codex-ui', JSON.stringify({ state: { tourDone: true }, version: 0 }));
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { db } from '@/db/db';
import { useSaveStatus } from '@/stores/saveStatus';

// jsdom non implementa la misura dei range di testo, usata da CodeMirror.
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
}

// …né ResizeObserver, usato da cmdk.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// …né scrollIntoView, usato da cmdk per l'elemento selezionato.
Element.prototype.scrollIntoView ??= function () {};

const initialSaveStatus = useSaveStatus.getState();

afterEach(async () => {
  cleanup();
  localStorage.clear();
  useSaveStatus.setState(initialSaveStatus, true);
  await Promise.all(db.tables.map((t) => t.clear()));
});
