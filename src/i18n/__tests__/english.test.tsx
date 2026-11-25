import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * La lingua è fissata al caricamento dei moduli: per provare l'inglese si salva la scelta
 * e si ricaricano i moduli da capo.
 */
describe('app in inglese', () => {
  beforeAll(() => {
    localStorage.setItem('codex-locale', 'en');
    vi.resetModules();
  });
  afterAll(() => {
    localStorage.removeItem('codex-locale');
    vi.resetModules();
  });

  it('testi dell’interfaccia', async () => {
    const { m, LOCALE, LANG_TAG } = await import('@/i18n');
    expect(LOCALE).toBe('en');
    expect(LANG_TAG).toBe('en-US');
    expect(m.settings.language.title).toBe('Language');
    expect(m.onboarding.wizard.steps[2]).toBe('Abilities');
    expect(m.common.importFailed('x')).toMatch(/^Import/);
    expect(document.documentElement.lang).toBe('en');
  });

  it('regole SRD e liste', async () => {
    const { CLASSES, canonicalClass } = await import('@/data/srd/classes');
    const { CONDITIONS } = await import('@/data/srd/conditions');
    const { ALIGNMENTS } = await import('@/domain/origins');
    const { ABILITY_LABELS } = await import('@/data/i18n/it');
    expect(CLASSES.find((c) => c.key === 'wizard')?.name).toBe('Wizard');
    expect(canonicalClass('Mago')).toBe('Wizard');
    expect(canonicalClass('Homebrew')).toBe('Homebrew');
    expect(CONDITIONS.blinded.name).toBe('Blinded');
    expect(ALIGNMENTS).toContain('Chaotic Good');
    expect(ABILITY_LABELS.str.short).toBe('STR');
  });

  it('il messaggio di un file non valido è in inglese', async () => {
    const { parseImportText } = await import('@/db/importParse');
    expect(() => parseImportText('{ nope')).toThrow('The file is not valid JSON.');
  });

  it('pagina di benvenuto', async () => {
    const { MemoryRouter } = await import('react-router');
    const { WelcomePage } = await import('@/features/onboarding/WelcomePage');
    render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Welcome, adventurer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create a new character/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
  });
});
