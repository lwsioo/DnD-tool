import { describe, expect, it } from 'vitest';
import { DAY, shouldRemindBackup } from '../actions';

describe('promemoria backup', () => {
  const now = 100 * DAY;
  it.each([
    [{ hasData: false, lastBackupAt: null, snoozeUntil: 0 }, false],
    [{ hasData: true, lastBackupAt: null, snoozeUntil: 0 }, true],
    [{ hasData: true, lastBackupAt: now - 3 * DAY, snoozeUntil: 0 }, false],
    [{ hasData: true, lastBackupAt: now - 20 * DAY, snoozeUntil: 0 }, true],
    [{ hasData: true, lastBackupAt: null, snoozeUntil: now + DAY }, false],
  ])('%j → %s', (opts, expected) => {
    expect(shouldRemindBackup({ ...opts, now })).toBe(expected);
  });
});
