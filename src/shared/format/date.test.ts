import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  browserTimeZone,
  calendarDateOf,
  formatBusinessDate,
  formatInstant,
  isCalendarDate,
  parseBusinessDateInput,
  todayBusinessDate,
} from './date';
import { setDisplayLocale } from './locale';

afterEach(() => {
  vi.restoreAllMocks();
  setDisplayLocale('id-ID');
});

describe('business today (Asia/Jakarta)', () => {
  it('takes the Jakarta date of an instant whatever the browser zone is', () => {
    // 18:30 UTC on 31 Dec is already 1 Jan in Jakarta (UTC+7).
    expect(calendarDateOf('2026-12-31T18:30:00Z')).toBe('2027-01-01');
    expect(todayBusinessDate(new Date('2026-11-13T17:00:00Z'))).toBe('2026-11-14');
  });

  it('validates real calendar dates only', () => {
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2027-02-29')).toBe(false);
    expect(isCalendarDate('2026-1-01')).toBe(false);
    expect(isCalendarDate(undefined)).toBe(false);
  });
});

describe('business dates', () => {
  it('formats every style in id-ID', () => {
    expect(formatBusinessDate('2026-11-24', 'long', 'id-ID')).toBe('24 November 2026');
    expect(formatBusinessDate('2026-11-24', 'medium', 'id-ID')).toBe('24 Nov 2026');
    expect(formatBusinessDate('2026-11-24', 'short', 'id-ID')).toBe('24-11-2026');
    expect(formatBusinessDate('2026-12-31', 'medium', 'id-ID')).toBe('31 Des 2026');
  });

  it('formats every style in en-US', () => {
    expect(formatBusinessDate('2026-11-24', 'long', 'en-US')).toBe('November 24, 2026');
    expect(formatBusinessDate('2026-11-24', 'medium', 'en-US')).toBe('Nov 24, 2026');
    expect(formatBusinessDate('2026-11-24', 'short', 'en-US')).toBe('11/24/2026');
  });

  it('follows the active language and shows nothing for no date', () => {
    expect(formatBusinessDate('2026-11-24')).toBe('24 Nov 2026');
    setDisplayLocale('en-US');
    expect(formatBusinessDate('2026-11-24')).toBe('Nov 24, 2026');
    expect(formatBusinessDate(null)).toBe('—');
  });

  describe('in a process zone behind UTC', () => {
    const original = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = 'America/Los_Angeles';
    });
    afterAll(() => {
      process.env.TZ = original;
    });

    it('never shifts a business date', () => {
      // Proof the zone is active: a date-only value read as UTC lands on 23 Nov here.
      expect(new Date('2026-11-24').getDate()).toBe(23);
      expect(formatBusinessDate('2026-11-24', 'short', 'id-ID')).toBe('24-11-2026');
      expect(formatBusinessDate('2026-01-01', 'long', 'en-US')).toBe('January 1, 2026');
      expect(parseBusinessDateInput('24-11-2026', 'id-ID')).toBe('2026-11-24');
    });
  });

  it('parses typed dates per language', () => {
    expect(parseBusinessDateInput('24-11-2026', 'id-ID')).toBe('2026-11-24');
    expect(parseBusinessDateInput('11/24/2026', 'en-US')).toBe('2026-11-24');
    expect(parseBusinessDateInput('2026-11-24', 'en-US')).toBe('2026-11-24');
    expect(parseBusinessDateInput('11/24/2026', 'id-ID')).toBeUndefined();
    expect(parseBusinessDateInput('31-02-2026', 'id-ID')).toBeUndefined();
    expect(parseBusinessDateInput('24-11-26', 'id-ID')).toBeUndefined();
  });
});

describe('instants', () => {
  const instant = '2026-11-24T03:05:00Z';

  it('shows an instant in the given zone, 24-hour with a colon and the zone, in both languages', () => {
    expect(formatInstant(instant, { locale: 'id-ID', timeZone: 'Asia/Jakarta' })).toBe('24 Nov 2026 10:05 WIB');
    expect(formatInstant(instant, { locale: 'en-US', timeZone: 'Asia/Jakarta' })).toBe('Nov 24, 2026 10:05 WIB');
    expect(formatInstant(instant, { locale: 'id-ID', timeZone: 'Asia/Jakarta', style: 'long' })).toBe(
      '24 November 2026 10:05 WIB',
    );
    expect(formatInstant(instant, { locale: 'en-US', timeZone: 'Asia/Jakarta', style: 'short' })).toBe(
      '11/24/2026 10:05 WIB',
    );
  });

  it('names the Indonesian zones WIB, WITA and WIT, and others by their Intl short name', () => {
    expect(formatInstant(instant, { locale: 'id-ID', timeZone: 'Asia/Pontianak' })).toBe('24 Nov 2026 10:05 WIB');
    expect(formatInstant(instant, { locale: 'id-ID', timeZone: 'Asia/Makassar' })).toBe('24 Nov 2026 11:05 WITA');
    expect(formatInstant(instant, { locale: 'en-US', timeZone: 'Asia/Jayapura' })).toBe('Nov 24, 2026 12:05 WIT');
    expect(formatInstant(instant, { locale: 'en-US', timeZone: 'Asia/Singapore' })).toBe('Nov 24, 2026 11:05 GMT+8');
  });

  it('uses the browser zone by default, never a fixed Asia/Jakarta', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'America/Los_Angeles',
    } as Intl.ResolvedDateTimeFormatOptions);
    expect(browserTimeZone()).toBe('America/Los_Angeles');
    // 03:05 UTC on 24 Nov is still 23 Nov, 19:05 in Los Angeles (UTC-8).
    expect(formatInstant(instant, { locale: 'id-ID' })).toBe('23 Nov 2026 19:05 PST');
    expect(formatInstant(instant, { locale: 'en-US' })).toBe('Nov 23, 2026 19:05 PST');
  });

  it('keeps unreadable values and shows nothing for none', () => {
    expect(formatInstant('not a date')).toBe('not a date');
    expect(formatInstant(undefined)).toBe('—');
  });
});
