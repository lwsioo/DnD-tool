/**
 * Testi dell'interfaccia nella lingua attiva: `m.<area>.<voce>`.
 * Ogni area ha un file in `sections/` con italiano e inglese affiancati; il tipo dell'inglese
 * è quello dell'italiano, quindi una voce mancante blocca la compilazione.
 */
import { app } from './sections/app';
import { common } from './sections/common';
import { engine } from './sections/engine';
import { terms } from './sections/terms';
import { inspector } from './sections/inspector';
import { sheet } from './sections/sheet';
import { vitals } from './sections/vitals';
import { grimoire } from './sections/grimoire';
import { inventory } from './sections/inventory';
import { wiki } from './sections/wiki';
import { search } from './sections/search';
import { onboarding } from './sections/onboarding';
import { misc } from './sections/misc';
import { settings } from './sections/settings';

export { LANG_TAG, LOCALE, LOCALES, setLocale, pick, type Locale } from './locale';

export const m = {
  app,
  common,
  engine,
  terms,
  inspector,
  sheet,
  vitals,
  grimoire,
  inventory,
  wiki,
  search,
  onboarding,
  misc,
  settings,
};
