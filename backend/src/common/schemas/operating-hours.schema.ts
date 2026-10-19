import { z } from 'zod';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const operatingHoursEntrySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  openTime: z.string().regex(TIME_PATTERN),
  closeTime: z.string().regex(TIME_PATTERN),
});

export const operatingHoursSchema = z.array(operatingHoursEntrySchema);

/** Stricter shape for hours an owner submits. Kept separate from
 * operatingHoursSchema, which also parses stored rows on every read and
 * must not start rejecting data that predates these rules. Overnight hours
 * (close <= open) are refused because computeOpenStatus compares times
 * within a single day; "until midnight" is sent as 23:59. A day missing
 * from the array means closed that day. */
export const editableOperatingHoursSchema = operatingHoursSchema
  .max(7)
  .superRefine((entries, ctx) => {
    const seen = new Set<number>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.dayOfWeek)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'dayOfWeek'],
          message: `Day ${entry.dayOfWeek} appears more than once.`,
        });
      }
      seen.add(entry.dayOfWeek);
      if (entry.closeTime <= entry.openTime) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'closeTime'],
          message: 'Closing time must be after opening time.',
        });
      }
    });
  });

export type OperatingHoursEntry = z.infer<typeof operatingHoursEntrySchema>;
