import { afterEach, describe, expect, it } from 'vitest';
import { dateInputToInstant, instantToDateInput } from './date-field';

const originalZone = process.env.TZ;

function inZone(zone: string) {
  process.env.TZ = zone;
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone);
}

afterEach(() => {
  process.env.TZ = originalZone;
});

describe('date field in Asia/Jakarta (UTC+7, no DST)', () => {
  it('shows the local calendar date of an instant', () => {
    inZone('Asia/Jakarta');
    expect(instantToDateInput('2026-11-30T17:00:00.000Z')).toBe('2026-12-01');
    expect(instantToDateInput('2026-11-30T00:00:00.000Z')).toBe('2026-11-30');
  });

  it('passes an unchanged prefilled value through as the exact original instant', () => {
    inZone('Asia/Jakarta');
    const original = '2026-11-30T17:00:00.000Z';
    expect(dateInputToInstant(instantToDateInput(original), original)).toBe(original);
    const midday = '2026-11-30T05:17:42.123Z';
    expect(dateInputToInstant(instantToDateInput(midday), midday)).toBe(midday);
  });

  it('reads an edited date as the start of that day in the browser time zone', () => {
    inZone('Asia/Jakarta');
    expect(dateInputToInstant('2026-12-01')).toBe('2026-11-30T17:00:00.000Z');
    expect(dateInputToInstant('2026-12-02', '2026-11-30T17:00:00.000Z')).toBe(
      '2026-12-01T17:00:00.000Z',
    );
  });
});

describe('date field in UTC', () => {
  it('shows the UTC calendar date', () => {
    inZone('UTC');
    expect(instantToDateInput('2026-11-30T17:00:00.000Z')).toBe('2026-11-30');
  });

  it('passes an unchanged prefilled value through untouched', () => {
    inZone('UTC');
    const original = '2026-11-30T17:00:00.000Z';
    expect(dateInputToInstant('2026-11-30', original)).toBe(original);
  });

  it('reads an edited date as UTC midnight', () => {
    inZone('UTC');
    expect(dateInputToInstant('2026-12-01', '2026-11-30T17:00:00.000Z')).toBe(
      '2026-12-01T00:00:00.000Z',
    );
  });
});

describe('date field across a DST change (America/New_York)', () => {
  it('uses the offset in force on that day', () => {
    inZone('America/New_York');
    expect(dateInputToInstant('2026-07-01')).toBe('2026-07-01T04:00:00.000Z');
    expect(dateInputToInstant('2026-12-01')).toBe('2026-12-01T05:00:00.000Z');
  });
});

describe('date field input rules', () => {
  it('never returns a date-only string', () => {
    for (const zone of ['Asia/Jakarta', 'UTC']) {
      inZone(zone);
      expect(dateInputToInstant('2026-12-01')).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });

  it.each(['', '   ', '2026-13-01', '2026-02-31', '01/12/2026', '2026-11-30T17:00:00.000Z', 'soon'])(
    'rejects %j',
    (value) => {
      expect(dateInputToInstant(value)).toBeUndefined();
    },
  );

  it('accepts surrounding spaces', () => {
    inZone('UTC');
    expect(dateInputToInstant(' 2026-12-01 ')).toBe('2026-12-01T00:00:00.000Z');
  });

  it('shows nothing for a missing or invalid instant', () => {
    expect(instantToDateInput(undefined)).toBe('');
    expect(instantToDateInput('not a date')).toBe('');
  });
});
