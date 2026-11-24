# Codex · D&D 5e

Compagno di gioco **in italiano** per D&D 5e con le **regole 2024**: scheda del personaggio, grimorio, inventario e wiki
della campagna in un'unica app, che funziona anche **senza internet**.

Tutti i dati restano **nel tuo browser**: nessun account, nessun server. Per fare copie di sicurezza o spostarli su un
altro dispositivo si esportano e importano file JSON.

---

## Indice

- [Installazione](#installazione)
- [Avvio](#avvio)
- [Usarla come app (anche offline)](#usarla-come-app-anche-offline)
- [Metterla online per gli amici o per l'iPad](#metterla-online-per-gli-amici-o-per-lipad)
- [Guida all'uso](#guida-alluso)
  - [Primo avvio](#primo-avvio)
  - [Creare un personaggio](#creare-un-personaggio)
  - [La scheda](#la-scheda)
  - [La barra laterale: PF, CA, slot, riposi](#la-barra-laterale-pf-ca-slot-riposi)
  - [Il grimorio](#il-grimorio)
  - [L'inventario](#linventario)
  - [La wiki della campagna](#la-wiki-della-campagna)
  - [Il pannello dei dettagli (Inspector)](#il-pannello-dei-dettagli-inspector)
  - [Ricerca globale e comandi](#ricerca-globale-e-comandi)
  - [Compendio](#compendio)
  - [Importare contenuti da 5etools](#importare-contenuti-da-5etools)
  - [Condividere i contenuti con il gruppo](#condividere-i-contenuti-con-il-gruppo)
  - [Backup, trasferimento ed eliminazione](#backup-trasferimento-ed-eliminazione)
  - [Impostazioni](#impostazioni)
- [Scorciatoie da tastiera](#scorciatoie-da-tastiera)
- [Domande frequenti e problemi](#domande-frequenti-e-problemi)
- [Per sviluppatori](#per-sviluppatori)
- [Contenuti e licenza](#contenuti-e-licenza)

---

## Installazione

Serve **Node.js 22 o più recente** (versione LTS consigliata).

1. Installa Node.js da [nodejs.org](https://nodejs.org) oppure, su Windows, da PowerShell:

   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

   Poi chiudi e riapri il terminale, e controlla con `node --version`.

2. Apri un terminale **nella cartella del progetto** e installa le dipendenze (solo la prima volta, o dopo un
   aggiornamento del codice):

   ```powershell
   npm install
   ```

## Avvio

### Per giocare (consigliato)

```powershell
npm run build
npm run preview
```

Apri **http://localhost:4173**. È la versione ottimizzata, la stessa che si installa come app (vedi sotto).
Dopo ogni aggiornamento del codice ripeti `npm run build`.

### Per sviluppare

```powershell
npm run dev
```

Apri **http://localhost:5173**. Si aggiorna da sola a ogni modifica dei file.

> I dati sono legati all'**indirizzo** e al **browser**: ciò che salvi su `localhost:5173` non compare su
> `localhost:4173`, né in un altro browser. Per spostarli usa un backup (vedi
> [Backup](#backup-trasferimento-ed-eliminazione)).

## Usarla come app (anche offline)

Con la versione avviata da `npm run preview` (o pubblicata online):

1. In Chrome o Edge clicca l'icona **Installa** nella barra degli indirizzi.
2. Codex si apre in una finestra sua, come un programma.
3. Dal primo avvio funziona **anche senza rete**. Quando esce una versione nuova, compare un avviso «Aggiorna».

In **Impostazioni → Archivio del browser** premi **Rendi persistente l'archivio**: così il browser non cancella i dati
quando lo spazio sul disco scarseggia.

## Metterla online per gli amici o per l'iPad

Il risultato di `npm run build` (cartella `dist/`) è un sito statico: si può pubblicare gratis su servizi come
Netlify, Cloudflare Pages o Vercel, trascinando la cartella `dist/` o collegando il progetto.

- Serve **HTTPS** (questi servizi lo danno già) perché l'app funzioni offline e sia installabile.
- Pubblicala alla **radice di un dominio** (es. `https://codex-tuonome.netlify.app/`). Per una sottocartella
  (es. GitHub Pages `utente.github.io/codex/`) va impostato `base: './'` in `vite.config.ts`.
- **iPad/iPhone:** apri il sito in Safari → **Condividi → Aggiungi alla schermata Home**.
- Ogni persona e ogni dispositivo ha **il suo archivio separato**: non c'è sincronizzazione automatica. Per passare i
  dati usa i file di export.

---

## Guida all'uso

### Primo avvio

Se nel browser non c'è ancora nessun personaggio, parte una **visita guidata** di una decina di passi che mostra a cosa
serve ogni parte della pagina (frecce `←` `→` per muoversi, `Esc` o **Salta** per chiuderla). Una volta vista o saltata
non si ripresenta; puoi rivederla da **Impostazioni → Aspetto → Rivedi la visita guidata**.

La schermata di benvenuto propone tre strade:

- **Crea nuovo personaggio**: la creazione guidata (consigliata), oppure una scheda vuota da riempire a mano.
- **Importa da JSON**: un personaggio, un backup completo o un pacchetto di contenuti ricevuto da qualcuno.
- **Carica esempio**: Lyra Solmonte, paladina di 3° livello, con la mini-campagna «La Costa Spezzata». È utile per
  esplorare l'app; si elimina in un clic da **Impostazioni → Dati di esempio**.

### Creare un personaggio

La creazione guidata ha sette passi; puoi saltare avanti e indietro cliccando i numeri in alto.

1. **Concetto**: nome, allineamento (da lista), **specie** e **background**.
   - Scegliendo specie e background dall'elenco, Codex aggiunge da solo tratti, competenze, velocità, taglia, talento
     d'origine e le eventuali fonti di incantesimi. Ti chiede solo le scelte previste dalle regole: lignaggio elfico,
     antenato draconico o gigante, abilità a scelta, talento dell'Umano, caratteristica da incantatore.
   - **Equipaggiamento del background**: opzione A (oggetti + monete), B (solo monete) o nessuno.
   - Se la tua specie o il tuo background non sono in elenco, scegli **Personalizzata** e scrivi il nome.
2. **Classe**: classe SRD (imposta dado vita, tiri salvezza, addestramenti e magia) o personalizzata, livello,
   sottoclasse.
3. **Caratteristiche**: serie standard, point buy (27 punti), 4d6 o manuale. Poi gli **aumenti del background**
   (+2/+1 o +1/+1/+1): sono disponibili solo le tre caratteristiche del background scelto.
4. **Competenze**: le abilità date da specie e background sono già spuntate (grigie); scegli quelle della classe.
   Lingue, strumenti e **Maestria nelle armi** per le classi che la hanno.
5. **Equipaggiamento**: armatura, scudo, armi (già impugnate), monete in più.
6. **Magia**: caratteristica da incantatore (già proposta in base alla classe).
7. **Riepilogo**: CA, PF, iniziativa, attacchi e CD già calcolati. Premi **Crea personaggio**.

> Gli **incantesimi** non vengono scelti nella creazione: si aggiungono dopo, dal Grimorio (vedi sotto).

### La scheda

Tutto ciò che è un numero calcolato (CA, bonus, CD, PF massimi…) **si aggiorna da solo**: se togli l'armatura cambia la
CA, se alzi l'Intelligenza cambiano abilità e CD. Passa col mouse su un valore per vedere da cosa è composto.

- **Modalità Gioco / Modifica** (in alto a destra): in Gioco tocchi solo contatori e interruttori, così non cambi nulla
  per sbaglio al tavolo; in **Modifica** cambi nome, classi, punteggi, competenze, privilegi.
- **Specie e Background** (in Modifica): clicca il campo per sceglierli o cambiarli. Cambiando, Codex **toglie quello che
  aveva aggiunto il precedente** e lascia intatto ciò che hai inserito a mano. Il simbolo ✦ indica che sono collegati
  alla libreria.
- **Abilità e tiri salvezza**: clic sul pallino per cambiare competenza (nessuna → competente → maestria). I badge
  **VANT/SVANT** indicano vantaggio o svantaggio, con la fonte (es. «Armatura pesante»).
- **Condizioni e Indebolimento**: aggiungile dalla barra sotto l'intestazione; gli effetti sono applicati da soli.
- **Attacchi**: calcolati dalle armi equipaggiate. Per le armi Versatili puoi passare da una a due mani; le
  **Maestrie** sbloccate sono evidenziate. Clic sul nome di un'arma, una proprietà o una maestria per leggerne le regole.
- **Privilegi** (schede _Privilegi di Classe_, _Tratti della Specie_, _Talenti_): contatori d'uso che si ricaricano coi
  riposi; i privilegi **attivabili** (Ira, Forma Selvatica…) hanno un interruttore e i loro effetti valgono solo quando
  sono attivi. In Modifica puoi crearne di nuovi con **effetti** (es. «+1 alla CA», «vantaggio ai TS su Saggezza»).
- **Ispirazione Eroica**: il pulsante con la stella.
- **Esporta JSON / Elimina**: in alto nella scheda.

### La barra laterale: PF, CA, slot, riposi

Sempre visibile, qualunque pagina tu stia guardando.

- **Selettore del personaggio** in alto, e **+ Nuovo personaggio**.
- **Punti ferita**: **Danno** (scala prima i PF temporanei), **Cura**, **Temp**. A 0 PF compaiono i tiri salvezza contro
  la morte. Se sei concentrato e subisci danni, ti ricorda il TS su Costituzione con la CD giusta.
- **Classe Armatura** con gli interruttori di armatura e scudo.
- **Slot incantesimo** (e del Patto): clic sui pallini per spenderli o recuperarli.
- **Risorse**: i contatori dei privilegi segnati come «in barra laterale».
- **Concentrazione**: l'incantesimo su cui sei concentrato, con il pulsante per interromperla.
- **Riposo Breve**: scegli quanti Dadi Vita spendere (tiro automatico o valore a mano) e vedi cosa si ricarica.
- **Riposo Lungo**: anteprima di tutto ciò che viene ripristinato. Dopo ogni riposo puoi premere **Annulla** nella
  notifica.

### Il grimorio

- **Fonti da incantatore**: una per classe (e per talenti come Iniziato alla Magia o per i lignaggi di specie), ognuna
  con la sua caratteristica, CD e bonus d'attacco. Si gestiscono da **Fonti**.
- **Aggiungere incantesimi**: **Libreria** → cerca per nome, filtra per **livello** e per **classe** (parte già sulla
  classe del personaggio) → **Aggiungi**. Se la libreria è vuota, prima importa gli incantesimi (vedi
  [Importare contenuti](#importare-contenuti-da-5etools)) oppure creane uno con **Nuovo**.
- **Stato** di ogni incantesimo: conosciuto, preparato, sempre pronto, o gratuito (es. 1 volta per Riposo Lungo).
- **Filtri**: livello, stato, Concentrazione / Rituale / componente Materiale, testo.
- **Lancia**: scegli lo slot (anche più alto per il potenziamento), lo slot viene speso, i dadi sono già scalati e, se
  serve, la concentrazione viene impostata (con avviso se ne stai già mantenendo un'altra).
- Clic sul nome di un incantesimo per leggerlo per intero nel pannello a destra.

### L'inventario

- **Monete**: modifica rapida, **cambio** tra tagli e **pagamento con resto** automatico.
- **Aggiungi oggetto**: da zero, partendo da un'**arma o armatura SRD** (già pronta con danni, proprietà e maestria), o
  **dalla libreria** (oggetti importati: digita il nome e scegli dall'elenco).
- **Contenitori**: trascina gli oggetti dentro zaini e borse; il peso si somma da solo (la Borsa Conservante conta solo
  il suo peso).
- **Equipaggiato / Sintonizzato**: un'armatura equipaggiata cambia la CA, un'arma equipaggiata compare negli attacchi,
  un oggetto magico con effetti (es. Anello di Protezione) li applica alla scheda.
- **Ingombro**: attivabile in Impostazioni → Regole del personaggio.

### La wiki della campagna

Ogni personaggio può appartenere a una campagna; la wiki raccoglie le note condivise della campagna.

- **Categorie**: Luoghi, Fazioni, Religioni, NPC, Diario Sessioni. Ognuna ha i suoi campi (stato e atteggiamento degli
  NPC, luogo padre, divinità e domini, numero e data delle sessioni…).
- **Collegamenti**: nel testo scrivi `[[` e compare l'elenco delle voci (anche incantesimi e condizioni). Per un testo
  diverso dal titolo: `[[Mirella Corvonero|la cartografa]]`.
  - **Clic** su un collegamento: anteprima nel pannello a destra. **Ctrl+clic**: apre la voce.
  - Un collegamento **rosso tratteggiato** punta a una voce che non esiste ancora: cliccalo per crearla.
- **«Menzionato in…»**: in fondo a ogni voce trovi tutte le note che la citano, con la frase in cui compare.
- **Rinomina**: cambiando titolo, Codex propone di aggiornare tutti i collegamenti che la citano.
- **Diario Sessioni**: creando una nuova voce in questa categoria, Codex propone da solo il numero di sessione successivo
  e la data di oggi.
- Anche le **Note** del personaggio supportano i `[[collegamenti]]`.

### Il pannello dei dettagli (Inspector)

Il pannello a destra mostra i dettagli di ciò su cui clicchi (incantesimi, condizioni, armi, proprietà, maestrie,
privilegi, oggetti, voci wiki, specie, background, talenti) **senza farti lasciare la pagina**.

- **◀ ▶** (o `Alt+←` / `Alt+→`): torni alle voci viste prima.
- **📌 Fissa**: il pannello resta aperto anche premendo `Esc`.
- I collegamenti dentro il pannello si aprono nel pannello stesso.

### Ricerca globale e comandi

Premi **`Ctrl+K`** (su Mac `⌘K`) o clicca **Cerca** in alto.

- Cerca tra voci della wiki, incantesimi, personaggi, privilegi e oggetti del personaggio attivo, regole, specie,
  background e talenti. Tollera errori di battitura e accenti mancanti; funziona anche col nome inglese.
- **Invio** apre il risultato nel pannello dei dettagli; **Ctrl+Invio** va alla sua pagina.
- **Prefissi**:
  - `>` comandi rapidi: _Riposo Breve_, _Riposo Lungo_, _Nuova voce wiki_, _Nuovo personaggio_, _Esporta backup_,
    _Tema chiaro/scuro_, vai a una sezione…
  - `@` solo voci della campagna.
  - `#` cerca per tag.

### Compendio

Dalla barra laterale, **Compendio**: condizioni, proprietà e maestrie delle armi, specie, background e talenti (SRD e
importati), tabelle di armi e armature. Ogni voce si apre nel pannello dei dettagli.

### Importare contenuti da 5etools

L'app include di serie solo i contenuti **SRD 5.2** (specie, background, talenti d'origine, armi, armature, regole). Gli
incantesimi e il resto dei manuali si importano da file JSON di [5etools](https://5e.tools). **Importa solo i contenuti
dei manuali che possiedi.**

1. **Scarica i file**: apri nel browser l'indirizzo del file e salvalo con `Ctrl+S` come `.json`.

   | Contenuto                                                         | File                                                                                                                    |
   | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
   | Incantesimi del Manuale del Giocatore 2024                        | `https://5e.tools/data/spells/spells-xphb.json`                                                                         |
   | Classi degli incantesimi (per filtrare «da Stregone», «da Mago»…) | `https://5e.tools/data/generated/gendata-spell-source-lookup.json` (oppure `https://5e.tools/data/spells/sources.json`) |
   | Specie                                                            | `https://5e.tools/data/races.json`                                                                                      |
   | Background                                                        | `https://5e.tools/data/backgrounds.json`                                                                                |
   | Talenti                                                           | `https://5e.tools/data/feats.json`                                                                                      |
   | Oggetti magici                                                    | `https://5e.tools/data/items.json`                                                                                      |
   | Armi e armature base                                              | `https://5e.tools/data/items-base.json`                                                                                 |

   Il file delle **classi degli incantesimi** è importante: i file degli incantesimi di 5etools non dicono a quale
   classe appartengono, e senza di esso il filtro per classe del Grimorio non funziona.

2. **Importa**: **Impostazioni → Contenuti → Importa contenuti…** e seleziona **tutti i file insieme** (`Ctrl`+clic, o
   trascinali nel riquadro).

3. **Controlla l'anteprima**: quante voci per tipo e quante sono nuove; togli i tipi o i **manuali** che non vuoi
   (5etools mescola manuali 2014 e 2024: per restare sul 2024 tieni XPHB, XDMG, XMM e i libri usciti dopo per le
   regole 2024, come FRHoF ed EFA). Le voci già presenti vengono saltate, quindi reimportare non crea doppioni.

4. **Importa**. Da quel momento trovi:
   - gli incantesimi nel **Grimorio → Libreria**;
   - specie, background e talenti nella **creazione guidata**, nella **scheda** e nel **Compendio**;
   - gli oggetti nell'**Inventario → Aggiungi oggetto → dalla libreria**.

Da sapere:

- Nomi e testi importati restano **in inglese**; puoi modificarli.
- Le versioni **SRD in italiano** di specie, background e talenti sono già nell'app: le stesse voci in inglese vengono
  segnalate come «già presenti» e saltate.
- Di specie e talenti importati Codex legge competenze, scelte e incantesimi, ma **non gli effetti automatici** (es.
  il bonus all'iniziativa di _Alert_): aggiungili alla scheda come effetti del privilegio, se ti servono. Le versioni SRD
  integrate li hanno già.
- I lignaggi delle specie importate sono nella descrizione, senza scelta guidata.
- Classi e sottoclassi non si importano: i privilegi di classe si aggiungono nella scheda, in Modifica.

### Condividere i contenuti con il gruppo

Per dare a tutti la stessa libreria già pronta:

1. Chi ha importato tutto va in **Impostazioni → Contenuti → Esporta pacchetto contenuti**: scarica un file
   `codex-contenuti-AAAA-MM-GG.json` con incantesimi, specie, background, talenti e oggetti.
2. Gli altri lo importano da **Impostazioni → Contenuti → Importa contenuti…** (o dalla schermata di benvenuto →
   _Importa da JSON_). Personaggi e campagne di chi riceve non vengono toccati.

Condividi solo materiale SRD, tuo, o di manuali che anche gli altri possiedono.

### Backup, trasferimento ed eliminazione

I dati vivono solo nel browser: se lo reinstalli, svuoti i dati di navigazione o cambi dispositivo, **senza un backup
li perdi**. Codex ti ricorda di farne uno se è passato troppo tempo.

| Cosa                    | Dove                                                              | Cosa contiene                                             |
| ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| **Backup completo**     | Impostazioni → Backup e trasferimento → _Esporta backup completo_ | tutto: personaggi, campagne, wiki, librerie, impostazioni |
| **Un personaggio**      | Scheda → _Esporta JSON_                                           | il personaggio e i suoi incantesimi                       |
| **Pacchetto contenuti** | Impostazioni → Contenuti → _Esporta pacchetto contenuti_          | solo le librerie, senza personaggi                        |

- **Importare**: Impostazioni → _Importa file…_ (o la schermata di benvenuto). Prima dell'import vedi un'anteprima.
  - Un personaggio già presente si può importare **come copia** o **sostituire** (viene prima salvata la versione
    attuale).
  - Un backup completo si può **unire** all'archivio o **sostituirlo del tutto**; in quel caso l'archivio precedente
    viene salvato e puoi **ripristinarlo** dalle Impostazioni.
- **Eliminare un personaggio**: Scheda → _Elimina_. Per qualche secondo puoi annullare dalla notifica.
- **Annulla**: riposi, import ed eliminazioni salvano una copia del personaggio prima di modificarlo.

### Impostazioni

- **Backup e trasferimento**, **Contenuti**: vedi sopra.
- **Unità di misura**: metri e kg (come nei manuali italiani: 1,5 m = 5 ft) oppure piedi e libbre.
- **Aspetto**: tema scuro o chiaro.
- **Archivio del browser**: stato della persistenza e pulsante per renderla persistente.
- **Dati di esempio**: rimuove il personaggio e la campagna d'esempio.
- **Regole del personaggio** attivo: Ispirazione Eroica a ogni Riposo Lungo (Umano), azzeramento dei PF temporanei col
  Riposo Lungo, regola dell'ingombro.

---

## Scorciatoie da tastiera

| Tasti                                  | Azione                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `Ctrl+K` / `⌘K`                        | Apre e chiude la ricerca globale                                                     |
| `Esc`                                  | Chiude finestre, barra laterale a scomparsa e pannello dei dettagli (se non fissato) |
| `Alt+←` / `Alt+→`                      | Indietro / avanti nel pannello dei dettagli                                          |
| `Invio` / `Ctrl+Invio` (nella ricerca) | Apri nel pannello / vai alla pagina                                                  |
| `Ctrl+clic` su un `[[collegamento]]`   | Apre la voce invece dell'anteprima                                                   |
| `↑` `↓` (nella ricerca)                | Scorre i risultati                                                                   |

## Domande frequenti e problemi

**Non vedo i miei dati.** Controlla di essere sullo stesso browser e allo stesso indirizzo di prima (`localhost:4173` e
`localhost:5173` hanno archivi separati). Se hai un backup, importalo.

**Il Grimorio è vuoto / non ci sono incantesimi.** È normale: l'app non contiene incantesimi di serie. Importali (vedi
[Importare contenuti](#importare-contenuti-da-5etools)) e poi aggiungili al personaggio da **Grimorio → Libreria**.

**Il filtro per classe nella Libreria non c'è o non trova nulla.** Importa anche il file delle classi degli incantesimi
(`gendata-spell-source-lookup.json` o `sources.json`); vale anche per gli incantesimi importati prima.

**`Ctrl+K` non fa niente.** Clicca prima in un punto qualsiasi della pagina (se il cursore è nella barra degli
indirizzi la scorciatoia va al browser). Se ancora non va, ricarica con `Ctrl+F5`. Se compare la finestra «Ricerca non
disponibile», premi _Riprova_.

**Dopo un aggiornamento vedo ancora la versione vecchia.** Accetta l'avviso «Aggiorna», oppure chiudi tutte le schede
dell'app e riaprila.

**`npm` non è riconosciuto.** Node.js non è installato o il terminale va riaperto dopo l'installazione.

**Una specie o un talento importato non applica i suoi bonus.** Vedi i limiti in
[Importare contenuti](#importare-contenuti-da-5etools): aggiungi l'effetto al privilegio dalla scheda in Modifica.

---

## Per sviluppatori

| Comando              | Cosa fa                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`        | Server di sviluppo su http://localhost:5173 con ricaricamento automatico                               |
| `npm run build`      | Controllo dei tipi e build di produzione in `dist/` (con service worker per l'offline)                 |
| `npm run preview`    | Serve la build su http://localhost:4173                                                                |
| `npm test`           | Test unitari e di interfaccia (Vitest + Testing Library + fake-indexeddb)                              |
| `npm run test:watch` | Test in modalità continua                                                                              |
| `npm run e2e`        | Test end-to-end in Chromium sulla build (Playwright; la prima volta `npx playwright install chromium`) |
| `npm run lint`       | ESLint                                                                                                 |
| `npm run typecheck`  | Controllo dei tipi TypeScript                                                                          |
| `npm run format`     | Formatta il codice con Prettier                                                                        |

**Tecnologie**: React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), Zustand, Zod, CodeMirror 6, MiniSearch,
dnd-kit, vite-plugin-pwa.

```
src/
  app/        layout a tre pannelli, rotte, scorciatoie, PWA
  domain/     tipi del dominio (personaggio, origini, oggetti, incantesimi, wiki…)
  engine/     motore di calcolo: funzioni pure e testate (CA, attacchi, slot, PF, riposi, valute…)
  data/srd/   libreria SRD 5.2 integrata (condizioni, armi, armature, classi, specie, background, talenti)
  db/         IndexedDB, repository, schemi di validazione, backup/import, indice dei collegamenti
  features/   pagine e componenti per area (sheet, vitals, grimoire, inventory, wiki, origins, library, search…)
  ui/         componenti di base (Dialog, Button, campi, Markdown…)
```

Principio di base: il database salva solo i **dati di partenza** (punteggi, oggetti, contatori usati); tutto ciò che è
calcolato viene derivato ogni volta dal motore in `src/engine/`. Privilegi, oggetti e condizioni modificano la scheda
tramite un unico sistema di **effetti**. Il piano tecnico completo è in [docs/piano-tecnico.md](docs/piano-tecnico.md).

## Contenuti e licenza

L'app include solo dati meccanici e testi riassunti in italiano dal **System Reference Document 5.2** di Wizards of the
Coast, rilasciato con licenza [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
I nomi italiani di alcuni talenti sono provvisori. Tutti gli altri contenuti (incantesimi, sottoclassi, talenti e oggetti
non SRD) li inserisci tu o li importi da file tuoi: usali solo per i manuali che possiedi.
