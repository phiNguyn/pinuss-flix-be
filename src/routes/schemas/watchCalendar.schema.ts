import { z } from 'zod';

export const calendarMonthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const calendarDateParamsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type CalendarMonthQueryInput = z.infer<typeof calendarMonthQuerySchema>;
export type CalendarDateParams = z.infer<typeof calendarDateParamsSchema>;
