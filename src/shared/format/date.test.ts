import { describe, expect, it } from 'vitest';
import { calendarDateOf, formatBusinessDate, formatInstant, isCalendarDate, todayBusinessDate } from './date';

describe('business dates (Asia/Jakarta)', () => {
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

  it('shows a calendar date unshifted', () => {
    expect(formatBusinessDate('2026-12-31')).toBe('31 Des 2026');
    expect(formatBusinessDate(null)).toBe('—');
  });

  it('shows an instant in Jakarta time', () => {
    expect(formatInstant('2026-12-31T18:30:00Z')).toContain('1 Jan 2027');
  });
});
