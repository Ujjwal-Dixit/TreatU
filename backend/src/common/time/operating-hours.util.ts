import { getLocalDateTimeParts, formatTime12h } from './timezone.util';
import type { OperatingHoursEntry } from '../schemas/operating-hours.schema';

export interface OpenStatus {
  isOpen: boolean;
  closesAtLabel: string;
}

export function computeOpenStatus(
  operatingHours: readonly OperatingHoursEntry[],
  timezone: string,
  now: Date = new Date(),
): OpenStatus {
  const { time, weekday } = getLocalDateTimeParts(timezone, now);
  const today = operatingHours.find((h) => h.dayOfWeek === weekday);
  if (!today) {
    return { isOpen: false, closesAtLabel: 'Closed today' };
  }
  const isOpen = time >= today.openTime && time <= today.closeTime;
  return {
    isOpen,
    closesAtLabel: isOpen
      ? `Closes at ${formatTime12h(today.closeTime)}`
      : `Opens at ${formatTime12h(today.openTime)}`,
  };
}
