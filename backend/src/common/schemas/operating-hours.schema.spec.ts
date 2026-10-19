import { editableOperatingHoursSchema } from './operating-hours.schema';

describe('editableOperatingHoursSchema', () => {
  it('accepts a normal week with closed days left out', () => {
    const result = editableOperatingHoursSchema.safeParse([
      { dayOfWeek: 1, openTime: '11:00', closeTime: '23:00' },
      { dayOfWeek: 5, openTime: '11:00', closeTime: '23:59' },
    ]);
    expect(result.success).toBe(true);
  });

  it('accepts an empty array (closed every day)', () => {
    expect(editableOperatingHoursSchema.safeParse([]).success).toBe(true);
  });

  it('rejects overnight hours', () => {
    const result = editableOperatingHoursSchema.safeParse([
      { dayOfWeek: 6, openTime: '18:00', closeTime: '02:00' },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects the same day twice', () => {
    const result = editableOperatingHoursSchema.safeParse([
      { dayOfWeek: 2, openTime: '09:00', closeTime: '12:00' },
      { dayOfWeek: 2, openTime: '18:00', closeTime: '22:00' },
    ]);
    expect(result.success).toBe(false);
  });
});
