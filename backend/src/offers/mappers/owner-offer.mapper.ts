import type { Offer, OfferAvailability, OfferStatus } from '@prisma/client';
import {
  formatDateOnly,
  formatTime12h,
  type LocalDateTimeParts,
} from '../../common/time/timezone.util';
import type { OfferAvailabilityKind } from '../dto/offer-config.dto';

/** Owner-facing lifecycle, derived from status + validity window + now —
 * distinct from the raw `status` column, which only records what the
 * owner set (an `active` offer whose end date has passed reads `ended`). */
export type OwnerOfferDisplayStatus =
  'active' | 'scheduled' | 'paused' | 'ended';

export interface OwnerOfferDto {
  id: string;
  discountPercentage: number;
  startTime: string;
  endTime: string;
  /** "4:00 PM - 8:00 PM" */
  timeLabel: string;
  minSpendPaise: number | null;
  capacityPerDay: number;
  description: string;
  availability: OfferAvailabilityKind;
  /** "Today Only" / "18 Oct – 25 Oct" / "Every day" / "Mon, Wed, Fri" */
  availabilityLabel: string;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number[];
  status: OfferStatus;
  displayStatus: OwnerOfferDisplayStatus;
  /** Today's occurrence, or null when the offer doesn't run today. */
  today: { claimed: number; total: number } | null;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dayMonthFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC', // date-only values are stored as UTC midnight
});
const weekdayDayMonthFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function availabilityKindOf(
  offer: Pick<Offer, 'validFrom' | 'validUntil'>,
): OfferAvailabilityKind {
  if (!offer.validFrom || !offer.validUntil) return 'weekly';
  return offer.validFrom.getTime() === offer.validUntil.getTime()
    ? 'today'
    : 'dateRange';
}

/** Whether the offer's calendar rules include `now`'s restaurant-local
 * date — ignores status and time-of-day on purpose. */
export function coversDate(
  offer: Pick<Offer, 'validFrom' | 'validUntil' | 'daysOfWeek'>,
  now: LocalDateTimeParts,
): boolean {
  if (!offer.daysOfWeek.includes(now.weekday)) return false;
  if (offer.validFrom && formatDateOnly(offer.validFrom) > now.date)
    return false;
  if (offer.validUntil && formatDateOnly(offer.validUntil) < now.date)
    return false;
  return true;
}

function buildAvailabilityLabel(offer: Offer, now: LocalDateTimeParts): string {
  const kind = availabilityKindOf(offer);
  if (kind === 'weekly') {
    const days = [...offer.daysOfWeek].sort((a, b) => a - b);
    if (days.length === ALL_DAYS.length) return 'Every day';
    return days.map((d) => WEEKDAY_SHORT[d - 1]).join(', ');
  }
  // Narrowed by availabilityKindOf: both bounds are set below this point.
  const from = offer.validFrom as Date;
  const until = offer.validUntil as Date;
  if (kind === 'today') {
    return formatDateOnly(from) === now.date
      ? 'Today Only'
      : weekdayDayMonthFormatter.format(from);
  }
  return `${dayMonthFormatter.format(from)} – ${dayMonthFormatter.format(until)}`;
}

function buildDisplayStatus(
  offer: Offer,
  now: LocalDateTimeParts,
): OwnerOfferDisplayStatus {
  if (offer.status === 'archived') return 'ended';
  if (offer.validUntil) {
    const until = formatDateOnly(offer.validUntil);
    if (until < now.date) return 'ended';
    if (until === now.date && now.time > offer.endTime) return 'ended';
  }
  if (offer.status === 'paused') return 'paused';
  if (offer.validFrom && formatDateOnly(offer.validFrom) > now.date) {
    return 'scheduled';
  }
  return 'active';
}

export function toOwnerOfferDto(
  offer: Offer,
  todayAvailability: OfferAvailability | null,
  now: LocalDateTimeParts,
): OwnerOfferDto {
  return {
    id: offer.id,
    discountPercentage: offer.discountPercentage,
    startTime: offer.startTime,
    endTime: offer.endTime,
    timeLabel: `${formatTime12h(offer.startTime)} - ${formatTime12h(offer.endTime)}`,
    minSpendPaise: offer.minSpendPaise,
    capacityPerDay: offer.capacityPerDay,
    description: offer.description,
    availability: availabilityKindOf(offer),
    availabilityLabel: buildAvailabilityLabel(offer, now),
    startDate: offer.validFrom ? formatDateOnly(offer.validFrom) : null,
    endDate: offer.validUntil ? formatDateOnly(offer.validUntil) : null,
    daysOfWeek: offer.daysOfWeek,
    status: offer.status,
    displayStatus: buildDisplayStatus(offer, now),
    today: todayAvailability
      ? {
          claimed: todayAvailability.capacityClaimed,
          total: todayAvailability.capacityTotal,
        }
      : null,
  };
}
