import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createShiftSchema = z.object({
  name: z.string().min(2, 'Shift name must be at least 2 characters').max(100),
  startTime: z.string().regex(timeRegex, 'Start time must be HH:MM format'),
  endTime: z.string().regex(timeRegex, 'End time must be HH:MM format'),
  breakStart: z.string().regex(timeRegex).optional().nullable(),
  breakEnd: z.string().regex(timeRegex).optional().nullable(),
  gracePeriodMinutes: z.number().int().min(0).max(60).default(10),
});

export const updateShiftSchema = createShiftSchema.partial();

export const assignShiftSchema = z.object({
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  effectiveTo: z.string().optional().nullable(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type AssignShiftInput = z.infer<typeof assignShiftSchema>;
