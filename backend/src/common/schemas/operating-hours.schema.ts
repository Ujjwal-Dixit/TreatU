import { z } from 'zod';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const operatingHoursEntrySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  openTime: z.string().regex(TIME_PATTERN),
  closeTime: z.string().regex(TIME_PATTERN),
});

export const operatingHoursSchema = z.array(operatingHoursEntrySchema);

export type OperatingHoursEntry = z.infer<typeof operatingHoursEntrySchema>;
