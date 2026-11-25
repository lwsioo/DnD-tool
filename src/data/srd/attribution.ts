import { pick } from '@/i18n/locale';
/** Attribuzione richiesta dalla licenza CC-BY-4.0 del System Reference Document 5.2. */
const SRD_ATTRIBUTION_IT =
  'Questa app include materiale tratto dal System Reference Document 5.2 ("SRD 5.2") di Wizards of the Coast LLC, ' +
  'disponibile su https://dnd.wizards.com/resources/systems-reference-document. ' +
  'L’SRD 5.2 è concesso in licenza Creative Commons Attribution 4.0 International ' +
  '(https://creativecommons.org/licenses/by/4.0/legalcode). I testi sono riassunti e tradotti in italiano.';

export const SRD_ATTRIBUTION = pick(
  SRD_ATTRIBUTION_IT,
  'This app includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, ' +
    'available at https://dnd.wizards.com/resources/systems-reference-document. ' +
    'The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License ' +
    '(https://creativecommons.org/licenses/by/4.0/legalcode). Rules text is summarized.',
);
