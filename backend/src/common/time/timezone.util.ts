export interface LocalDateTimeParts {
  /** YYYY-MM-DD in the given timezone */
  date: string;
  /** HH:mm, 24-hour, zero-padded — safe to compare lexicographically */
  time: string;
  /** ISO weekday number, 1 = Monday .. 7 = Sunday */
  weekday: number;
}

const WEEKDAY_TO_ISO: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Restaurant offer timing is defined in the restaurant's local timezone,
 * never server or device time (see data-model.md §17 rationale). Built on
 * Intl.DateTimeFormat rather than pulling in date-fns/luxon — MVP only
 * needs "what's today's date/time/weekday in this IANA zone", which the
 * platform already does correctly including DST. */
export function getLocalDateTimeParts(
  timezone: string,
  at: Date = new Date(),
): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
    weekday: WEEKDAY_TO_ISO[get('weekday')] ?? 1,
  };
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "15:00" -> "3:00 PM" for display copy. */
export function formatTime12h(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr} ${period}`;
}

/** Converts a restaurant-local wall-clock time ("YYYY-MM-DD", "HH:mm", zone)
 * into the correct UTC instant, DST-aware. Implemented as guess-and-correct
 * rather than a date library: build a naive UTC Date from the same digits,
 * check what full date+time that instant reads as in the target zone, then
 * apply a single linear correction. This is exact as long as the zone's UTC
 * offset doesn't change between the naive guess and the true instant (i.e.
 * not itself sitting inside a DST transition) — Asia/Kolkata, the only zone
 * this MVP uses, has no DST at all, so that's a non-issue here in practice.
 *
 * The correction MUST compare full date+time, not just the "HH:mm" clock
 * time — an earlier version compared time-of-day only and silently
 * corrupted any case where the naive guess's local reading rolled onto a
 * different calendar day (e.g. a 23:59 restaurant-local endTime, which is
 * exactly the case Claim.expiresAt hits on every claim). Caught via a live
 * end-to-end smoke test against the real database, not by the original
 * unit tests, which happened to only cover same-day cases — see
 * timezone.util.spec.ts for the regression test this added. */
export function zonedTimeToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string,
): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const observed = getLocalDateTimeParts(timezone, naiveUtc);
  const observedAsUtc = new Date(`${observed.date}T${observed.time}:00.000Z`);

  return new Date(2 * naiveUtc.getTime() - observedAsUtc.getTime());
}
