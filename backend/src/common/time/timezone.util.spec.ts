import {
  getLocalDateTimeParts,
  formatTime12h,
  zonedTimeToUtc,
} from './timezone.util';

describe('getLocalDateTimeParts', () => {
  it('reads the correct local wall-clock time for a UTC-offset zone', () => {
    // 2026-01-15T10:30:00Z is 16:00 IST (UTC+5:30), a Thursday -> ISO weekday 4
    const parts = getLocalDateTimeParts(
      'Asia/Kolkata',
      new Date('2026-01-15T10:30:00.000Z'),
    );
    expect(parts).toEqual({ date: '2026-01-15', time: '16:00', weekday: 4 });
  });

  it('rolls the calendar date over across the UTC boundary', () => {
    // 2026-01-15T20:00:00Z is 01:30 IST the next day
    const parts = getLocalDateTimeParts(
      'Asia/Kolkata',
      new Date('2026-01-15T20:00:00.000Z'),
    );
    expect(parts).toEqual({ date: '2026-01-16', time: '01:30', weekday: 5 });
  });
});

describe('formatTime12h', () => {
  it.each([
    ['00:00', '12:00 AM'],
    ['09:05', '9:05 AM'],
    ['12:00', '12:00 PM'],
    ['15:00', '3:00 PM'],
    ['23:59', '11:59 PM'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatTime12h(input)).toBe(expected);
  });
});

describe('zonedTimeToUtc', () => {
  it('is the inverse of getLocalDateTimeParts for a fixed-offset zone', () => {
    const utc = zonedTimeToUtc('2026-01-15', '16:00', 'Asia/Kolkata');
    expect(utc.toISOString()).toBe('2026-01-15T10:30:00.000Z');
  });

  it('round-trips through getLocalDateTimeParts', () => {
    const utc = zonedTimeToUtc('2026-06-01', '09:15', 'Asia/Kolkata');
    const parts = getLocalDateTimeParts('Asia/Kolkata', utc);
    expect(parts.date).toBe('2026-06-01');
    expect(parts.time).toBe('09:15');
  });

  it('does not roll onto the next calendar day for a late-in-the-day local time', () => {
    // Regression test: this is exactly Claim.expiresAt's shape (an offer's
    // 23:59 restaurant-local end time) — an earlier implementation that
    // diffed HH:mm only, ignoring the date, silently returned 2026-08-24
    // here instead of 2026-08-23. Caught via a live smoke test, not by the
    // other two cases above, which don't cross midnight when read in IST.
    const utc = zonedTimeToUtc('2026-08-23', '23:59', 'Asia/Kolkata');
    expect(utc.toISOString()).toBe('2026-08-23T18:29:00.000Z');
  });
});
