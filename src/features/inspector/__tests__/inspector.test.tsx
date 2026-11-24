import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/stores/uiStore';
import { MarkdownView } from '@/ui/MarkdownView';
import { describeEffect } from '../describeEffect';
import { parseRuleHref, refKey } from '../refs';

const initialUi = useUiStore.getState();
beforeEach(() => useUiStore.setState(initialUi, true));

describe('riferimenti dell’Inspector', () => {
  it.each([
    ['cond:prone', { kind: 'condition', key: 'prone' }],
    ['prop:finesse', { kind: 'property', key: 'finesse' }],
    ['mastery:topple', { kind: 'mastery', key: 'topple' }],
    ['weapon:longsword', { kind: 'weapon', id: 'longsword' }],
    ['armor:plate', { kind: 'armor', id: 'plate' }],
    ['spell:abc', { kind: 'spell', id: 'abc' }],
  ])('%s', (href, expected) => {
    expect(parseRuleHref(href)).toEqual(expected);
  });

  it.each(['cond:nope', 'prop:', 'https://example.com', 'weapon:laser', undefined])('rifiuta %j', (href) => {
    expect(parseRuleHref(href)).toBeNull();
  });

  it('non duplica in cronologia la voce già aperta', () => {
    const { openInspector } = useUiStore.getState();
    openInspector({ kind: 'condition', key: 'prone' });
    openInspector({ kind: 'condition', key: 'prone' });
    openInspector({ kind: 'mastery', key: 'vex' });
    expect(useUiStore.getState().inspectorHistory.map(refKey)).toEqual(['condition:prone', 'mastery:vex']);
  });

  it('aprire una voce dopo essere tornati indietro tronca la cronologia "avanti"', () => {
    const s = useUiStore.getState();
    s.openInspector({ kind: 'condition', key: 'prone' });
    s.openInspector({ kind: 'condition', key: 'blinded' });
    s.inspectorBack();
    s.openInspector({ kind: 'condition', key: 'stunned' });
    expect(useUiStore.getState().inspectorHistory.map(refKey)).toEqual([
      'condition:prone',
      'condition:stunned',
    ]);
  });

  it('larghezza del pannello limitata tra 320 e 720 px', () => {
    const s = useUiStore.getState();
    s.setInspectorWidth(100);
    expect(useUiStore.getState().inspectorWidth).toBe(320);
    s.setInspectorWidth(5000);
    expect(useUiStore.getState().inspectorWidth).toBe(720);
  });
});

describe('describeEffect', () => {
  it.each([
    [{ target: 'ac', op: 'add', value: '1', requires: ['armorEquipped'] }, '+1 a CA (con armatura)'],
    [{ target: 'skill.stealth', op: 'disadvantage' }, 'Svantaggio a Furtività'],
    [{ target: 'save.dex', op: 'proficiency' }, 'Competenza in TS su Destrezza'],
    [{ target: 'score.str', op: 'set', value: '19' }, 'Forza almeno 19'],
    [{ target: 'speed', op: 'add', value: '-10' }, '-10 a Velocità'],
    [
      { target: 'ac.formula', op: 'formula', value: '13 + mod.dex', requires: ['noArmor'] },
      'CA = 13 + mod.dex (senza armatura)',
    ],
  ] as const)('%j → %s', (effect, text) => {
    expect(
      describeEffect({
        id: 'x',
        ...effect,
        requires: 'requires' in effect ? [...effect.requires] : undefined,
      }),
    ).toBe(text);
  });
});

describe('MarkdownView', () => {
  it('i link alle regole aprono l’Inspector, quelli web restano link', async () => {
    const user = userEvent.setup();
    render(
      <MarkdownView>
        {'Cadi [Prono](cond:prone). Vedi [sito](https://example.com) e [nulla](cond:inesistente).'}
      </MarkdownView>,
    );
    expect(screen.getByRole('link', { name: 'sito' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('nulla')).toHaveAttribute('title', 'Riferimento non trovato');
    await user.click(screen.getByRole('button', { name: 'Prono' }));
    const s = useUiStore.getState();
    expect(s.inspectorOpen).toBe(true);
    expect(s.inspectorHistory[s.inspectorIndex]).toEqual({ kind: 'condition', key: 'prone' });
  });
});
