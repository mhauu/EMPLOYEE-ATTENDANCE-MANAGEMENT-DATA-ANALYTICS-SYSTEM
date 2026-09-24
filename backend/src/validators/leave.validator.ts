import { z } from 'zod';

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().uuid('Invalid leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z
      .string()
      .min(5, 'Reason must be at least 5 characters')
      .max(1000),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const reviewLeaveSchema = z.object({
  rejectionReason: z.string().max(500).optional(),
});

export const leaveQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : 20)),
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;
export type LeaveQueryInput = z.infer<typeof leaveQuerySchema>;
