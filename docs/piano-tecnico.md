# Piano tecnico — "Codex": companion D&D 5e (2024) local-first

## Contesto
La cartella `C:\Users\Alessio\Desktop\DnD tool` è vuota: progetto greenfield. Obiettivo: una web app desktop in italiano, offline-first, che sostituisca scheda cartacea, manuali, 5etools e note sparse con un'unica interfaccia a 3 pannelli (sidebar vitali · vista centrale · inspector contestuale), multi-personaggio, con grimorio, inventario collegato alle statistiche e wiki di campagna con wikilink bidirezionali.

**Scelte di fondo (decise, non alternative):**
- **Tutto è derivato da funzioni pure.** Il DB salva solo dati "di input" (punteggi, competenze, oggetti, contatori usati); CA, bonus, CD, slot massimi, badge vantaggio/svantaggio sono calcolati da un motore `engine/` puro e testato, mai salvati. Elimina un'intera classe di bug di desincronizzazione.
- **Un sistema di Effetti unico** (`Effect`) attaccato a privilegi, oggetti, condizioni: è il meccanismo che rende "dinamica" la scheda (Difesa senza Armatura, Scudo, svantaggio Furtività, Talento Allerta, Indebolimento…).
- **Personaggio = un documento aggregato** in IndexedDB (export singolo banale, update atomici). Librerie (incantesimi, oggetti custom) e wiki in tabelle separate.
- **Contenuti:** il codice include solo i dati meccanici + testi **SRD 5.2 (CC-BY-4.0, con attribuzione)** tradotti/riassunti in italiano. Tutto il resto (incantesimi non-SRD, sottoclassi extra) lo inserisce l'utente o lo importa da file JSON propri (es. formato 5etools).
- **Unità:** valori canonici in piedi, visualizzati in metri (1,5 m = 5 ft, come nei manuali IT) con toggle nelle impostazioni.

---

## 1. Struttura directory & architettura dei componenti

### Stack (aggiunte allo stack richiesto)
| Ruolo | Libreria | Perché |
|---|---|---|
| DB | `dexie` 4 + `dexie-react-hooks` (`useLiveQuery`) | reattività diretta DB→UI, autosave senza store intermedio |
| Stato UI | `zustand` (+ `persist` per personaggio attivo/preferenze) | stato effimero: inspector, palette, drawer |
| Routing | `react-router` v7 (library mode, `createHashRouter`) | funziona anche da file/PWA senza config server |
| Validazione import | `zod` | schema + migrazioni versionate per export/import |
| Editor Markdown | CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/autocomplete`, `@codemirror/lang-markdown`) | autocompletamento `[[` nativo |
| Rendering MD | `react-markdown` + `remark-gfm` + plugin custom `remark-wikilink` | link interni come componenti React |
| Ricerca | `minisearch` + `cmdk` (palette) | full-text fuzzy in memoria, prefissi, boost per campo |
| Drag & drop | `@dnd-kit/core` | spostare oggetti tra contenitori |
| Offline | `vite-plugin-pwa` | app installabile, funziona senza rete dopo il primo avvio |
| Test | `vitest` + `fake-indexeddb` + `@testing-library/react`; `playwright` per E2E | |

### Albero sorgenti
```
src/
  main.tsx
  app/
    App.tsx, router.tsx, providers.tsx
    layout/  AppShell.tsx · LeftSidebar.tsx · CenterOutlet.tsx · InspectorDrawer.tsx
    shortcuts.ts                       # Ctrl+K, Esc, Alt+←/→ inspector history, Ctrl+B sidebar
  domain/                              # SOLO tipi TS + costanti di dominio
    ids.ts · abilities.ts · character.ts · items.ts · spells.ts · effects.ts
    resources.ts · wiki.ts · library.ts · exchange.ts (formato export)
  db/
    db.ts                              # classe Dexie, versioni e upgrade()
    repos/ characters.ts · spells.ts · wiki.ts · library.ts · campaigns.ts · settings.ts
    linkIndexer.ts                     # ricalcola wikiLinks al salvataggio
    backup.ts                          # export/import JSON (singolo + completo) con zod
    persist.ts                         # navigator.storage.persist()
  engine/                              # funzioni PURE, 100% testate
    formula.ts                         # parser sicuro "max(1, mod.cha)" (no eval)
    abilities.ts · proficiency.ts · skills.ts · saves.ts
    effects.ts                         # raccolta effetti attivi da tutte le fonti
    armorClass.ts · attacks.ts · speed.ts · initiative.ts · senses.ts
    spellcasting.ts · spellSlots.ts · scaling.ts (trucchetti/upcast)
    hp.ts (danni/cure/temp/concentrazione) · rests.ts · currency.ts · encumbrance.ts
    derive.ts                          # deriveCharacter(char, ctx) => DerivedCharacter
    __tests__/
  data/                                # libreria statica integrata (sola lettura)
    srd/ weaponProperties.ts · weaponMasteries.ts · conditions.ts · weapons.ts
         armor.ts · classes.ts (dado vita, TS, progressione incantatore, competenze)
         slotTables.ts · skills.ts · languages.ts · spells.srd.ts (opzionale, fase tarda)
    templates/ exampleCharacter.ts · exampleCampaign.ts
    i18n/it.ts                         # etichette UI e termini di gioco IT
  features/
    onboarding/   Welcome.tsx · QuickWizard/ (step*.tsx) · ImportDialog.tsx
    vitals/       HpWidget · AcWidget · SpellSlotsWidget · ResourcesWidget
                  ConcentrationBadge · RestButtons · ShortRestDialog · LongRestDialog
    sheet/        SheetPage · IdentityHeader · CombatStrip · AbilityGrid · SavesList
                  SkillsList · AttacksTable · FeaturesPanel · ProficienciesPanel · ConditionsBar
    grimoire/     GrimoirePage · CastingHeader · SpellFilters · SpellList · SpellRow
                  SpellCard · SpellForm · LibraryBrowser · import/ fiveEtools.ts · ImportSpellsDialog
    inventory/    InventoryPage · CurrencyPanel · CurrencyConverter · EquippedSlots
                  ItemTree · ItemRow · ItemForm
    wiki/         WikiPage · WikiCategoryNav · EntryList · EntryView · EntryEditor
                  meta/ NpcMeta · LocationMeta · FactionMeta · ReligionMeta · SessionMeta
                  BacklinksList · wikilink/ remarkWikilink.ts · cmWikilinkCompletion.ts · resolve.ts
    inspector/    useInspector.ts · InspectorHost.tsx
                  renderers/ SpellInspector · WeaponInspector · MasteryInspector · PropertyInspector
                             ConditionInspector · FeatureInspector · ItemInspector · WikiInspector
    search/       searchIndex.ts · useSearchIndex.ts · CommandPalette.tsx
    settings/     SettingsPage.tsx (unità, tema, backup, regole opzionali)
  ui/             Button · IconButton · Badge · Tag · Pip · NumberStepper · InlineEdit
                  Dialog · Popover · Tabs · Tooltip · EmptyState · MarkdownView · Toast
  stores/         uiStore.ts (activeCharacterId, inspector stack, paletteOpen, drawerPinned)
  lib/            normalizeKey.ts · id.ts (crypto.randomUUID) · dice.ts · units.ts · debounce.ts
  hooks/          useActiveCharacter.ts · useDerived.ts · useCharacterMutation.ts
```

### Flusso dati
```
Dexie (IndexedDB) ──useLiveQuery──▶ useActiveCharacter() ──▶ useDerived() = useMemo(deriveCharacter)
      ▲                                                          │
      └──── useCharacterMutation(fn: Draft => void) ◀── UI ◀─────┘
```
- `useCharacterMutation` applica una funzione di modifica (con `immer`) e scrive con `db.characters.put` in transazione; contatori/toggle immediati, campi testo con debounce 400 ms. Indicatore "Salvato ✓" nella topbar.
- Undo: tabella `snapshots` (ultimi 20 per personaggio) scritta prima di operazioni "grosse" (riposi, import, eliminazioni) → toast "Annulla".

### Routing
```
#/benvenuto                              onboarding (se nessun personaggio)
#/pg/:charId/scheda | /grimorio | /inventario
#/campagna/:campaignId/:categoria?/:entryId?
#/impostazioni
```
La sidebar "Campagna Wiki" porta alla campagna del personaggio attivo (un personaggio appartiene a 0..1 campagne; una campagna ha N personaggi e N voci).

---

## 2. Modello dati TypeScript & schema IndexedDB

### 2.1 Primitive
```ts
type ID = string;                                   // crypto.randomUUID()
type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';   // etichette IT: FOR DES COS INT SAG CAR
type SkillKey = 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics' | 'deception'
  | 'history' | 'insight' | 'intimidation' | 'investigation' | 'medicine' | 'nature'
  | 'perception' | 'performance' | 'persuasion' | 'religion' | 'sleightOfHand'
  | 'stealth' | 'survival';
type ProfLevel = 0 | 0.5 | 1 | 2;                   // nessuna · metà (Factotum) · competente · maestria
type Die = 4 | 6 | 8 | 10 | 12 | 20;
type Formula = string;                              // "2", "pb", "mod.cha", "max(1, mod.wis)", "lvl.monk", "floor(lvl/2)"
type Feet = number;
type Markdown = string;
interface Timestamps { createdAt: number; updatedAt: number }
```

### 2.2 Effetti (cuore del dinamismo)
```ts
type EffectTarget =
  | 'ac' | 'ac.formula' | 'initiative' | 'speed' | 'hp.max' | 'passive.perception'
  | `save.${Ability}` | 'save.all' | `check.${Ability}` | `skill.${SkillKey}`
  | 'attack.all' | 'attack.melee' | 'attack.ranged' | 'damage.melee' | 'damage.ranged'
  | 'spell.dc' | 'spell.attack' | 'd20.all';

type EffectOp =
  | 'add'            // +valore (formula)
  | 'set'            // imposta (es. FOR 19 Guanti Potenza Orchi)
  | 'formula'        // solo per ac.formula: "10 + mod.dex + mod.con"
  | 'advantage' | 'disadvantage'
  | 'proficiency' | 'expertise';

interface Effect {
  id: ID;
  target: EffectTarget;
  op: EffectOp;
  value?: Formula;
  requires?: Array<'noArmor' | 'noShield' | 'armorEquipped' | 'shieldEquipped'>;
  note?: string;                                    // mostrata nel tooltip del badge ("Armatura pesante")
}
```
Le fonti di effetti: `Feature.effects` (se `active`), `InventoryItem.effects` (se equipaggiato/sintonizzato), condizioni attive (dalla libreria statica), effetti impliciti generati dal motore (armatura pesante → svantaggio Furtività, Indebolimento → −2×liv ai d20).

### 2.3 Risorse e ricarica
```ts
interface Recharge {
  shortRest: 'all' | number | 0;                    // es. Incanalare Divinità 2024: 1 su RB
  longRest: 'all' | number | 0;
}
interface UsesTracker {
  max: Formula;                                     // "pb", "mod.cha", "3"
  used: number;
  recharge: Recharge;
  pinned: boolean;                                  // mostrato nel widget sidebar
}
```

### 2.4 Personaggio (documento aggregato)
```ts
interface Character extends Timestamps {
  id: ID;
  schemaVersion: number;
  campaignId: ID | null;

  identity: {
    name: string; playerName?: string; portrait?: string;   // dataURL ridimensionata
    species: string; size: 'S' | 'M' | 'L';
    background: string; alignment?: string; deity?: string;
    xp: number; appearance?: Markdown; backstory?: Markdown;
  };

  classes: ClassEntry[];                            // multiclasse; [0] = classe iniziale
  abilities: Record<Ability, { base: number; bonus: number }>;  // bonus = background/ASI/talenti
  saves: Record<Ability, ProfLevel>;
  skills: Record<SkillKey, { prof: ProfLevel; abilityOverride?: Ability }>;

  proficiencies: {
    armor: Array<'light' | 'medium' | 'heavy' | 'shield'>;
    weapons: Array<'simple' | 'martial' | string>;           // categoria o weaponBaseId
    tools: string[]; languages: string[];
  };
  weaponMasteries: string[];                        // weaponBaseId con Maestria sbloccata

  combat: {
    hp: { current: number; temp: number; maxMode: 'auto' | 'manual'; maxManual?: number };
    hitDice: Partial<Record<Die, { spent: number }>>;        // totale derivato dalle classi
    deathSaves: { successes: 0|1|2|3; failures: 0|1|2|3 };
    exhaustion: 0|1|2|3|4|5|6;
    heroicInspiration: boolean;
    speed: { walk: Feet; fly?: Feet; swim?: Feet; climb?: Feet; burrow?: Feet };
    conditions: string[];                           // conditionKey dalla libreria
    concentration?: { characterSpellId: ID; since: number };
    acOverride?: number;
  };

  features: Feature[];
  spellcasting: {
    sources: SpellcastingSource[];
    slots: { used: number[] /* len 9 */; maxOverride?: (number | null)[] };
    pact?: { used: number };                        // max e livello derivati da lvl warlock
    spells: CharacterSpell[];
  };
  inventory: {
    currency: Currency;
    items: InventoryItem[];                         // albero piatto via parentId
  };
  settings: {
    heroicInspirationOnLongRest: boolean;           // Umano (Intraprendente)
    clearTempHpOnLongRest: boolean;
    encumbranceRule: 'off' | 'standard' | 'variant';
  };
  notes: Markdown;                                  // supporta [[wikilink]]
}

interface ClassEntry {
  id: ID;
  classKey: string;                                 // 'wizard' (SRD) o custom
  name: string; subclass?: string; level: number;
  hitDie: Die;
  caster: 'none' | 'full' | 'half' | 'third' | 'pact';
  hpRolls?: number[];                               // se maxMode auto con tiri; altrimenti media fissa
}

interface Feature {
  id: ID;
  category: 'class' | 'subclass' | 'species' | 'background' | 'feat' | 'other';
  name: string;
  origin?: string;                                  // "Guerriero 2", "Talento d'Origine"
  description: Markdown;
  uses?: UsesTracker;
  effects: Effect[];
  toggleable: boolean; active: boolean;             // es. Ira, Forma Selvatica
  libraryRef?: ID;                                  // se creato dalla libreria
}

interface SpellcastingSource {
  id: ID;
  label: string;                                    // "Mago", "Iniziato alla Magia (Chierico)"
  ability: Ability;                                 // scelta libera INT/SAG/CAR
  classEntryId?: ID;
  preparedMax?: Formula;                            // facoltativo, per il contatore "Preparati x/y"
}

interface CharacterSpell {
  id: ID;
  spellId: ID;                                      // → tabella spells
  sourceId: ID;
  status: 'known' | 'prepared' | 'alwaysPrepared' | 'free';
  freeUses?: UsesTracker;                           // es. 1/RL da talento/specie
  freeCastLevel?: number;
  notes?: string;
}
```

### 2.5 Inventario
```ts
interface Currency { cp: number; sp: number; ep: number; gp: number; pp: number } // MR MA ME MO MP

interface InventoryItem {
  id: ID;
  parentId: ID | null;                              // contenitore padre
  kind: 'weapon' | 'armor' | 'shield' | 'focus' | 'gear' | 'container'
      | 'consumable' | 'tool' | 'treasure' | 'ammunition';
  name: string; quantity: number;
  weightLb?: number; valueCp?: number;
  equipped: boolean; attunement?: 'none' | 'required' | 'attuned';
  description?: Markdown;
  effects: Effect[];
  weapon?: WeaponData; armor?: ArmorData; shield?: { acBonus: number };
  container?: { capacityLb?: number; weightless: boolean; collapsed: boolean };
  libraryRef?: ID;
}

interface WeaponData {
  baseId?: string;                                  // 'longsword' → libreria statica
  category: 'simple' | 'martial';
  type: 'melee' | 'ranged';
  damage: { dice: string; type: DamageType };      // "1d8", 'slashing'
  versatileDice?: string;                           // "1d10"
  properties: WeaponPropertyRef[];
  mastery?: MasteryKey;
  magicBonus: number;
  abilityOverride?: Ability;                        // es. Arti Marziali del Monaco
  hand: 'main' | 'off' | 'two';                     // stato di impugnatura corrente
  ammoItemId?: ID;
}
type WeaponPropertyRef =
  | { key: 'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading' | 'reach' | 'twoHanded' | 'versatile' }
  | { key: 'range' | 'thrown'; normal: Feet; long: Feet };
type MasteryKey = 'cleave' | 'graze' | 'nick' | 'push' | 'sap' | 'slow' | 'topple' | 'vex';

interface ArmorData {
  category: 'light' | 'medium' | 'heavy';
  baseAc: number; dexCap: number | null;            // leggera null, media 2, pesante 0
  strRequirement?: number; stealthDisadvantage: boolean; magicBonus: number;
}
```

### 2.6 Incantesimi (libreria condivisa, compatibile 5etools in import)
```ts
interface Spell extends Timestamps {
  id: ID;
  origin: 'srd' | 'custom' | 'import';
  sourceBook?: string;                              // "PHB'24", "XGE"
  name: string; nameKey: string; nameEn?: string;  // nameEn per dedupe import 5etools
  level: 0|1|2|3|4|5|6|7|8|9;
  school: 'abjuration' | 'conjuration' | 'divination' | 'enchantment'
        | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';
  castingTime: { amount: number; unit: 'action' | 'bonus' | 'reaction' | 'minute' | 'hour'; condition?: string };
  ritual: boolean;
  range: { kind: 'self' | 'touch' | 'distance' | 'sight' | 'unlimited' | 'special'; distance?: Feet;
           area?: { shape: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere' | 'emanation'; size: Feet } };
  components: { v: boolean; s: boolean; m: boolean; material?: string; costGp?: number; consumed?: boolean };
  duration: { kind: 'instant' | 'timed' | 'untilDispelled' | 'special'; amount?: number;
              unit?: 'round' | 'minute' | 'hour' | 'day'; concentration: boolean };
  description: Markdown;
  higherLevels?: Markdown;                          // box "A Livelli Superiori"
  scaling?: { cantrip?: string[] /* dadi a liv 1/5/11/17 */; perSlot?: string /* "+1d6" */ };
  classes: string[]; tags: string[];
  save?: Ability; attack?: 'melee' | 'ranged'; damageTypes?: DamageType[];
}
```

### 2.7 Campagna & Wiki
```ts
interface Campaign extends Timestamps { id: ID; name: string; description?: Markdown }

type WikiCategory = 'location' | 'faction' | 'religion' | 'npc' | 'session';

interface WikiEntryBase extends Timestamps {
  id: ID; campaignId: ID; category: WikiCategory;
  title: string; titleKey: string;                  // normalizeKey: minuscolo, senza accenti, spazi compattati
  aliases: string[]; aliasKeys: string[];
  body: Markdown; tags: string[]; pinned: boolean; image?: string;
}
type WikiEntry =
  | (WikiEntryBase & { category: 'npc'; meta: { factionIds: ID[]; locationId?: ID;
        status: 'alive' | 'dead' | 'unknown'; attitude: 'ally' | 'friendly' | 'neutral' | 'hostile' | 'unknown';
        role?: string; species?: string } })
  | (WikiEntryBase & { category: 'location'; meta: { region?: string; parentLocationId?: ID;
        factionIds: ID[]; locationType?: string } })
  | (WikiEntryBase & { category: 'faction'; meta: { leaderIds: ID[]; headquartersId?: ID;
        religionId?: ID; goals?: string; attitude?: string } })
  | (WikiEntryBase & { category: 'religion'; meta: { deity?: string; domains: string[];
        symbol?: string; alignment?: string } })
  | (WikiEntryBase & { category: 'session'; meta: { number: number; date: string /* ISO */;
        inGameDate?: string; participantIds: ID[] } });

interface WikiLink {                                // indice per i backlink, ricostruibile
  id?: number;
  campaignId: ID;
  sourceKind: 'wiki' | 'characterNotes';
  sourceId: ID;
  targetKey: string;                                // titleKey/aliasKey per link testuali, "id:<uuid>" per i metadati
  origin: 'body' | 'meta';
  snippet: string;                                  // ~120 caratteri attorno al link per "Menzionato in…"
}
```

### 2.8 Libreria statica (in `data/`, non in DB)
```ts
interface RuleEntry { key: string; name: string; summary: string; body: Markdown; source: 'SRD 5.2' }
// weaponProperties: Record<PropertyKey, RuleEntry>
// weaponMasteries:  Record<MasteryKey, RuleEntry>
// conditions:       Record<ConditionKey, RuleEntry & { effects: Effect[] }>   // es. Avvelenato → svantaggio attack.all, check.*
// weapons/armor:    tabelle base SRD → precompilano WeaponData/ArmorData
// classes:          { key, name, hitDie, saves, caster, armor/weapon prof }
```
Etichette italiane (es. nomi delle Maestrie) centralizzate in `data/i18n/it.ts` e verificate sul Manuale del Giocatore 2024 IT; le chiavi interne restano inglesi (necessario per compatibilità 5etools).

### 2.9 Schema Dexie (v1)
```ts
db.version(1).stores({
  campaigns:    'id, name, updatedAt',
  characters:   'id, campaignId, updatedAt',
  spells:       'id, nameKey, nameEn, level, school, origin, *classes, *tags',
  libraryItems: 'id, kind, nameKey',                  // oggetti/talenti/privilegi custom riutilizzabili
  wikiEntries:  'id, campaignId, [campaignId+category], [campaignId+titleKey], *aliasKeys, updatedAt',
  wikiLinks:    '++id, sourceId, [campaignId+targetKey]',
  snapshots:    '++id, characterId, createdAt',
  settings:     'key',
});
```
Migrazioni future: `db.version(n).upgrade(tx => …)` + `schemaVersion` nel documento e nei file di export (`migrations[n](data)`).

### 2.10 Formato di scambio JSON
```ts
interface ExportFile {
  format: 'codex-dnd';
  kind: 'character' | 'fullBackup';
  schemaVersion: number; appVersion: string; exportedAt: string;
  data:
    | { character: Character; spells: Spell[] /* solo quelli referenziati */ }
    | { campaigns; characters; spells; libraryItems; wikiEntries; settings };  // wikiLinks ricostruiti
}
```
Import: validazione zod → migrazione → anteprima ("1 personaggio, 14 incantesimi di cui 3 già presenti") → conflitti ID risolti rigenerando gli ID, incantesimi deduplicati per `nameKey + origin`. Backup completo: scelta *Sostituisci tutto* (con snapshot automatico prima) o *Unisci*.

---

## 3. Wireframe testuale & flussi UX

### 3.1 Layout globale (≥1280 px: drawer agganciato; sotto: drawer in overlay)
```
┌──────────────────────┬──────────────────────────────────────────────┬──────────────────────────┐
│ [▼ Thalia · Mago 5 ] │  Thalia Ventoargento        Salvato ✓  Ctrl+K│ ◀ ▶  Palla di Fuoco  📌 ✕│
│   + Nuovo personaggio│  Elfa · Saggia · Mago (Evocatore) 5          │──────────────────────────│
│──────────────────────│──────────────────────────────────────────────│ 3° liv · Invocazione     │
│ ▣ Scheda             │                                              │ Lancio: 1 azione         │
│ ✦ Grimorio           │                                              │ Gittata: 45 m (sfera 6 m)│
│ ⚑ Campagna Wiki      │         AREA CENTRALE                        │ Componenti: V, S, M (…)  │
│ ⚖ Inventario         │      (sezione selezionata)                   │ Durata: Istantanea       │
│──────────────────────│                                              │                          │
│ PF  27 / 32  +5 temp │                                              │ Descrizione…             │
│ [−dmg] [+cura] [temp]│                                              │ ┌ A Livelli Superiori ──┐│
│ ████████░░           │                                              │ │ +1d6 per slot sopra 3°││
│ CA 16  🛡Scudo [on]  │                                              │ │ Slot: [3][4][5] → 9d6 ││
│        🥋Armat.[on]  │                                              │ └───────────────────────┘│
│ Slot ●●●● ●●○ ●○     │                                              │ Menzionato in: …         │
│ Patto —              │                                              │                          │
│ Recupero Arcano ●○   │                                              │                          │
│ ⚡Concentrazione: —   │                                              │                          │
│ [☾ Riposo Breve]     │                                              │                          │
│ [☀ Riposo Lungo]     │                                              │                          │
│ ⚙ Impostazioni       │                                              │                          │
└──────────────────────┴──────────────────────────────────────────────┴──────────────────────────┘
   260 px fissi                         flessibile                         420 px, ridimensionabile
```
**Inspector:** `useInspector().open({ kind, id })` da qualsiasi punto (tag, riga spell, wikilink, risultato ricerca). Stack con cronologia ◀ ▶ (Alt+←/→), 📌 pin per tenerlo aperto, Esc chiude, Ctrl+clic su un wikilink naviga invece di aprire nel drawer. Link dentro l'inspector (es. una condizione citata nella spell) si aprono nello stesso drawer, accodandosi alla cronologia.

### 3.2 Scheda
```
┌ Identità: Specie · Background · Allineamento · Divinità · PE ▸ prossimo liv · ★ Ispirazione Eroica ┐
├ Strip: [Comp +3] [Iniz +2] [Vel 9 m] [Perc.Pass. 14] [Indebolimento 0] [Condizioni: + aggiungi]   ┤
├──────────────┬────────────────────────────┬─────────────────────────────────────────────────────────┤
│ FOR 8  (−1)  │ Tiri Salvezza              │ Attacchi                                                │
│ DES 14 (+2)  │ ● INT +6   ● SAG +4        │ Arma         Colpire  Danni          Proprietà  Maestria│
│ COS 14 (+2)  │ Abilità                    │ Bastone      +2      1d6−1 cont.    [Versatile] [Rovesc.]│
│ INT 18 (+4)  │ ◉ Arcano +7 (maestria)     │   ⇄ 1M/2M → 1d8−1                                       │
│ SAG 12 (+1)  │ ● Indagare +7              │ Pugnale      +5      1d4+2 perf.    [Accurata][Lancio 6/18]│
│ CAR 10 (+0)  │ ○ Furtività +2 [SVANT] ⓘ   │ Dardo di Fuoco +7    2d10 fuoco     (trucchetto)        │
├──────────────┴────────────────────────────┴─────────────────────────────────────────────────────────┤
│ Tabs: [Privilegi di Classe] [Tratti della Specie] [Talenti] [Competenze e Lingue]                   │
│  Recupero Arcano  · Mago 1 · ●○ (RL)  ▸ clic → inspector   ✎                                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- Ogni numero derivato ha tooltip di scomposizione ("+7 = INT +4 · Competenza +3"); badge [VANT]/[SVANT] con la fonte (ⓘ "Armatura pesante: Corazza a piastre").
- Modalità **Gioco** (default, solo contatori) vs **Modifica** (✎ globale): evita modifiche accidentali in sessione.

### 3.3 Wizard creazione personaggio (rapido, ~6 step, ogni step saltabile)
1. **Nome & concetto** (nome, specie, background, allineamento)
2. **Classe** (classe SRD o custom, livello, sottoclasse; multiclasse "+ aggiungi classe") → precompila dado vita, TS, competenze armi/armature, tipo di incantatore
3. **Caratteristiche**: Serie standard (15,14,13,12,10,8) · Point buy 27 · Tiro 4d6 · Manuale; poi bonus del background (+2/+1 o +1/+1/+1)
4. **Competenze**: abilità (contatore scelte), lingue, strumenti, Maestrie armi
5. **Equipaggiamento**: armatura/scudo/armi dalla tabella SRD (equipaggiati di default) + monete iniziali
6. **Magia** (se incantatore): caratteristica da incantatore pre-selezionata ma modificabile; slot calcolati
→ **Riepilogo** con CA/PF/attacchi già derivati → *Crea*. Alternativa: *Scheda vuota* (crea con valori a 10 e apre la scheda in modalità Modifica).

### 3.4 Gestione riposi
- **Riposo Breve** → dialog: lista dadi vita disponibili per tipo, pulsanti "Tira d8" (risultato + mod COS, con input manuale alternativo), PF aggiornati in anteprima; elenco di ciò che verrà ricaricato (risorse con `shortRest`, slot del Patto). *Conferma* → snapshot → applica → toast "Riposo breve completato · Annulla".
- **Riposo Lungo** → dialog di sola anteprima: PF al massimo, tutti i dadi vita, tutti gli slot, risorse `longRest`, Indebolimento −1, TS contro morte azzerati, PF temporanei (opz.), Ispirazione Eroica (opz.), concentrazione terminata → *Conferma* → snapshot → toast con Annulla.

### 3.5 Grimorio
```
┌ Caratteristica [INT ▾]  Mod +4 · CD 15 · Attacco +7      Preparati 8/9   [+ Nuovo] [⇪ Importa] [📚 Libreria] ┐
├ Livello: (Trucchetti)(1)(2)(3)…(9)   Stato: (Preparato)(Sempre Pronto)(Gratis 1/RL)   [C][R][M]  🔍 testo  ┤
│ ── 1° livello  Slot ●●○○ ───────────────────────────────────────────────────────────────────────────────── │
│ ☑ Scudo           1 reazione  Sé        V,S      Abiurazione        [Lancia ▸]                              │
│ ☑ Individuazione  1 azione    Sé        V,S [C][R] Divinazione       [Lancia ▸] [Rituale]                   │
│ ★ Passo Velato    gratis 1/RL ●         …                                                                    │
```
- Filtri = chip combinabili (AND tra gruppi, OR dentro il gruppo), stato salvato per personaggio.
- **Lancia ▸**: scelta livello slot → consuma lo slot, se [C] imposta la concentrazione (sostituendo quella attiva con conferma), mostra i danni scalati.
- Con più fonti da incantatore, header a schede per fonte (Mago / Iniziato alla Magia).
- **Libreria**: tabella di tutti gli incantesimi nel DB con "Aggiungi al personaggio".
- **Import**: drag&drop di file JSON → riconoscimento formato (Codex o 5etools `{ spell: [...] }`) → anteprima tabellare con conflitti → importa.

### 3.6 Wiki & wikilink
```
┌ Campagna: La Costa Spezzata ▾ ┬─────────────────────────────────────────────────────────────────┐
│ 📍 Luoghi (12)                │ Mirella Corvonero                 NPC · [Vivo] · [Amichevole]  ✎ │
│ ⚔ Fazioni (5)                 │ Fazione: [[Gilda dei Cartografi]]  Luogo: [[Porto Salmastro]]   │
│ ☀ Religioni (3)               │──────────────────────────────────────────────────────────────── │
│ 👤 NPC (27)   ▸ filtri stato   │ Corpo markdown… ci ha venduto la mappa di [[Torre di Vel]]…     │
│ 📜 Diario Sessioni (9)        │                                                                 │
│ [+ Nuova voce]                │ ── Menzionato in (3) ──                                         │
│ 🔍 filtra…                    │ 📜 Sessione 4 — "…Mirella ci aspettava al molo…"                │
└───────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```
- Editor CodeMirror: digitando `[[` appare l'autocompletamento (voci wiki della campagna, alias, incantesimi, condizioni, maestrie) con icona di categoria; `[[Nome|testo visibile]]` supportato. Toggle Modifica/Anteprima o vista divisa.
- Risoluzione link: voce wiki (titolo/alias) → incantesimo → libreria statica → privilegio del personaggio. Link non risolti: rossi tratteggiati; clic → "Crea voce *Nome* in [categoria ▾]".
- Clic su link risolto → inspector (anteprima con metadati + primi paragrafi + "Apri"). Ctrl+clic → navigazione.
- Rinomina voce → dialog "Aggiornare N riferimenti in M note?" (riscrive i corpi in transazione).
- Diario Sessioni ordinato per numero; "Nuova sessione" precompila numero successivo e data odierna.

### 3.7 Ricerca globale (Ctrl+K)
Palette `cmdk`: risultati raggruppati (Voci Wiki · Incantesimi · Armi/Oggetti · Privilegi · Regole) con fuzzy + prefisso; Invio → inspector, Ctrl+Invio → naviga; prefissi rapidi `>` comandi ("Riposo lungo", "Nuovo NPC"), `@` solo wiki, `#` tag.

### 3.8 Onboarding (primo avvio, DB vuoto)
Schermata centrale con 3 card: **Crea nuovo personaggio** (wizard / scheda vuota) · **Importa da JSON** · **Carica esempio** (personaggio + mini-campagna dimostrativa, marcati "Esempio", eliminabili in un clic). Nota sulla persistenza locale + pulsante "Rendi persistente l'archivio".

---

## 4. Logica dei calcoli automatici (`engine/`, funzioni pure)

`deriveCharacter(c: Character, ctx: { spells: Map<ID, Spell>, library }) → DerivedCharacter` esegue in ordine:

1. **Effetti attivi** — `collectEffects(c)`: privilegi `active`/non-toggle, oggetti `equipped` (e `attuned` se richiesto), condizioni attive (dalla libreria), più effetti impliciti:
   - armatura equipaggiata con `stealthDisadvantage` → `skill.stealth: disadvantage` (nota: nome armatura)
   - armatura senza competenza → `disadvantage` su `check.str/dex`, `save.str/dex`, `attack.*` + flag "non può lanciare incantesimi"
   - Indebolimento n → `d20.all: add −2n`, `speed: add −5n`
2. **Caratteristiche** — `score = base + bonus` → applica `set` (prende il massimo tra set e score) → `add`; cap 30. `mod = floor((score − 10) / 2)`.
3. **Livello totale e Competenza** — `lvl = Σ classes.level`; `PB = 2 + floor((lvl − 1) / 4)` (+2 liv 1–4, +3 5–8, +4 9–12, +5 13–16, +6 17–20).
4. **Formule** — `formula.ts`: tokenizer + parser ricorsivo (numeri, `+ − * /`, parentesi, `floor ceil min max`, variabili `pb`, `lvl`, `lvl.<classKey>`, `mod.<ab>`, `score.<ab>`); nessun `eval`, errori mostrati nel form.
5. **Tiri salvezza / abilità** — `bonus = mod(ab) + floor(PB × prof)` (prof 0 / 0.5 / 1 / 2; effetti `proficiency`/`expertise` alzano il livello al massimo) `+ Σ add(target) + Σ add(d20.all)`. Stato vantaggio: `adv && dis → normale` (badge grigio "si annullano"), altrimenti badge con fonti.
6. **Percezione passiva** — `10 + skill.perception + (vant ? 5 : svant ? −5 : 0) + add(passive.perception)`.
7. **Iniziativa** — `mod.dex + Σ add(initiative)` (Talento Allerta = effetto `add pb`) `+ d20.all`. Vantaggio/svantaggio da effetti.
8. **Velocità** — `walk + Σ add(speed)`; armatura pesante con `strRequirement > score.str` → −10 ft; condizioni Afferrato/Trattenuto → 0.
9. **CA** (`armorClass.ts`):
   ```
   armor = item equipaggiato kind 'armor' (al più uno), shield = kind 'shield' equipaggiato
   candidati = []
   se armor:  base = armor.baseAc + armor.magicBonus
              + (dexCap === null ? mod.dex : min(mod.dex, dexCap))     // leggera / media (2) / pesante (0)
   altrimenti: 10 + mod.dex
   + ogni effetto 'ac.formula' i cui requires sono soddisfatti
       (Difesa senza Armatura Barbaro "10+mod.dex+mod.con" requires noArmor;
        Monaco "10+mod.dex+mod.wis" requires noArmor,noShield; Armatura Magica "13+mod.dex" requires noArmor)
   CA = max(candidati)
      + (shield && competenza scudi ? 2 + shield.magic : 0)               // 2024: senza addestramento niente bonus
      + Σ add('ac')                                                       // Anello di Protezione, Stile Difesa (requires armorEquipped)
   se acOverride → usa override (badge "manuale")
   ```
   Il widget CA in sidebar mostra i toggle Armatura/Scudo che cambiano `equipped` e la scomposizione nel tooltip.
10. **Attacchi con arma** (`attacks.ts`):
    - Caratteristica: `abilityOverride` › `finesse ? max(FOR, DES)` › `ranged ? DES : FOR` (le armi da Lancio da mischia usano la stessa regola della mischia).
    - Competente se `category` o `baseId` in `proficiencies.weapons`.
    - **Colpire** = `mod + (comp ? PB : 0) + magicBonus + Σ add(attack.all | attack.melee/ranged) + d20.all`.
    - **Danni** = `dado (versatile && hand==='two' ? versatileDice : damage.dice) + mod + magicBonus + Σ add(damage.*)`; attacco extra con arma Leggera in mano secondaria: niente mod positivo (salvo effetto Stile Due Armi).
    - Gittata: `range/thrown normal/long` (convertita in metri), `reach` → portata 3 m.
    - Maestria: tag attivo se `baseId ∈ weaponMasteries`, altrimenti mostrato attenuato ("non sbloccata"); clic → inspector.
    - Munizioni: quantità letta dall'oggetto `ammoItemId`, decremento opzionale con "Usa".
11. **Incantatore** (`spellcasting.ts`), per ogni `SpellcastingSource`: `mod = mod(ability)`, `CD = 8 + PB + mod + Σ add(spell.dc)`, `Attacco = PB + mod + Σ add(spell.attack)`, `preparati = count(status==='prepared')` vs `eval(preparedMax)`.
12. **Slot** (`spellSlots.ts`):
    - Una sola classe incantatrice (non patto) → tabella della sua progressione (full / half / third, inclusi i semi-incantatori 2024 con slot dal 1° livello).
    - Più classi → livello incantatore = `Σ full + ceil(Σ half / 2) + floor(Σ third / 3)` → tabella multiclasse (da verificare in fase 2 sulla tabella del PHB 2024 durante la scrittura dei test).
    - Patto (Warlock): tabella separata `{ slots, slotLevel }` da `lvl.warlock`, contatore indipendente.
    - `maxOverride[i]` vince sempre (oggetti/eccezioni).
13. **Scaling** — trucchetti: dadi per livello personaggio 1/5/11/17 da `scaling.cantrip`; upcast: `perSlot × (slotScelto − livello)` mostrato nella SpellCard.
14. **PF** (`hp.ts`): `max auto = dado al liv 1 + Σ (media fissa | hpRolls) per i livelli successivi + mod.con × lvl + Σ add(hp.max)` (Robustezza = `add "2*lvl"`). Danno: prima i PF temporanei, poi i correnti (min 0); a 0 → avviso TS contro morte; se il danno residuo ≥ PF max → morte istantanea (avviso). Cura: cap al max, azzera TS contro morte se da 0. Temp: si tiene il valore maggiore (non si sommano). Concentrazione attiva + danno → prompt TS COS con `CD = min(30, max(10, floor(danno/2)))`.
15. **Riposi** (`rests.ts`, funzioni `Character → Character`, testate):
    - `shortRest(c, hitDiceSpent: {die, roll}[])`: PF += Σ(roll + mod.con) (cap max), `hitDice[die].spent += n`; per ogni `UsesTracker` (privilegi, `freeUses` delle spell): `used = shortRest === 'all' ? 0 : max(0, used − shortRest)`; `pact.used = 0`.
    - `longRest(c)`: PF = max; temp = 0 (se opzione); tutti i dadi vita recuperati (regola 2024); `slots.used = 0`, `pact.used = 0`; tracker con `longRest`; `exhaustion = max(0, n − 1)`; TS morte azzerati; concentrazione rimossa; `heroicInspiration = true` se opzione.
16. **Valute** (`currency.ts`): tutto convertito in MR (1 MP = 10 MO = 20 ME = 100 MA = 1000 MR); convertitore "da X a Y" e "ottimizza" (minimo numero di monete); peso monete opzionale (50 = 1 lb).
17. **Ingombro** (opzionale): peso totale ricorsivo sull'albero, i contenitori `weightless` (Borsa conservante) contano solo il proprio peso; capacità `FOR × 15` lb.

---

## 5. Piano di implementazione incrementale

Ogni step termina con un criterio di verifica esplicito; nessuno step dipende da uno successivo.

| # | Step | Contenuto | Verifica |
|---|---|---|---|
| 0 | **Scaffold** | Vite + React + TS strict, Tailwind v4, ESLint/Prettier, alias `@/`, Vitest, router hash, `AppShell` a 3 pannelli con placeholder, tema scuro/chiaro, font | `npm run dev` mostra il layout; `npm test` verde; `npm run build` ok |
| 1 | **Dominio + DB** | Tipi `domain/`, `db.ts` v1, repository, `uiStore`, `useActiveCharacter`, `useCharacterMutation` (immer + debounce), indicatore salvataggio, `storage.persist()` | test con `fake-indexeddb`: CRUD personaggio, update atomico; ricarica pagina → dati presenti |
| 2 | **Motore di calcolo** | `formula`, `abilities`, `effects`, `skills/saves`, `armorClass`, `attacks`, `spellcasting`, `spellSlots` (tutte le tabelle), `hp`, `rests`, `currency`, `derive` | test table-driven: PB 1–20, CA (nessuna/leggera/media/pesante/scudo/Difesa senza Armatura/Armatura Magica), slot single e multiclasse + patto, riposi, formule |
| 3 | **Libreria statica + Inspector** | `data/srd` (proprietà armi, 8 Maestrie, 15 condizioni, armi e armature base, classi, tabelle slot), `useInspector` con stack/cronologia/pin, renderer per tipo, `MarkdownView` | pagina di debug con tag cliccabili → contenuto corretto nel drawer; ◀ ▶ funzionano |
| 4 | **Onboarding + Import/Export** | Welcome, scheda vuota, template di esempio, export singolo/completo, import con zod + anteprima + conflitti, snapshot | test round-trip export → import → deep-equal; file malformato → errore leggibile |
| 5 | **Scheda personaggio** | Header identità, strip combattimento, caratteristiche, TS, abilità con badge e tooltip di scomposizione, tab privilegi con contatori, competenze/lingue, condizioni, modalità Gioco/Modifica | armatura pesante equipaggiata → badge SVANT su Furtività; cambiare INT aggiorna abilità/CD |
| 6 | **Sidebar vitali + Riposi** | Selettore personaggio, nav, HpWidget (danno/cura/temp), AcWidget con toggle, pip slot e patto, risorse pinnate, concentrazione, dialog Riposo Breve/Lungo con annulla | scenario: spendo slot e risorse → riposo lungo → tutto ricaricato; Annulla ripristina |
| 7 | **Inventario + Attacchi** | Valute + convertitore, CRUD oggetti, albero contenitori con dnd-kit, slot equipaggiati, armi → tabella Attacchi (Versatile 1M/2M, Lancio, Accurata, Maestria) | togliere lo scudo → CA −2 in sidebar; spostare oggetto in uno zaino; toggle 2M cambia il dado |
| 8 | **Grimorio** | Header caratteristica/CD/attacco per fonte, lista per livello, filtri chip, SpellCard con scaling, Lancia (slot + concentrazione), SpellForm, Libreria, import 5etools (adapter `{@tag}` → markdown, mapping tempi/gittate/durate) | importare un file 5etools campione → anteprima e incantesimi corretti; filtri C/R/M combinati |
| 9 | **Campagna Wiki** | Campagne, categorie, CRUD voci con form metadati, editor CodeMirror con completamento `[[`, rendering wikilink, `linkIndexer`, backlink con snippet, link non risolti → crea, rinomina con propagazione | creare A con `[[B]]` → B mostra "Menzionato in A"; rinominare B aggiorna A |
| 10 | **Ricerca globale** | Indice MiniSearch (DB via liveQuery + libreria statica), palette `cmdk`, comandi `>`, scorciatoie tastiera | Ctrl+K trova voce wiki, incantesimo, condizione; Invio apre l'inspector |
| 11 | **Wizard guidato** | 6 step + riepilogo derivato, point buy / serie standard / 4d6 | creare un Guerriero 1 con cotta di maglia + scudo → CA 18, PF 10 + COS |
| 12 | **Rifinitura & offline** | PWA (`vite-plugin-pwa`), impostazioni (unità, tema, regole opzionali), promemoria backup, responsive drawer, accessibilità (focus, aria), E2E Playwright sui flussi chiave, attribuzione CC-BY SRD 5.2 | Lighthouse PWA installabile; app funziona offline dopo il primo caricamento; E2E verdi |

**Ordine di valore:** dopo lo step 7 l'app è già usabile al tavolo (scheda + vitali + inventario); 8–9 aggiungono grimorio e wiki; 10–12 sono qualità e comodità.

### Verifica end-to-end finale
1. `npm test` (unit motore + repository) e `npx playwright test` (flussi: onboarding esempio → danno/cura → riposo lungo; toggle scudo → CA; creazione nota con wikilink → backlink; import spell 5etools; export/import personaggio).
2. Prova manuale nel browser pane con `npm run dev`: sessione simulata completa con un personaggio multiclasse (es. Paladino 2 / Warlock 3) per verificare slot standard + patto e riposi.
3. Build di produzione, installazione PWA, disattivazione rete → l'app si apre e salva.
