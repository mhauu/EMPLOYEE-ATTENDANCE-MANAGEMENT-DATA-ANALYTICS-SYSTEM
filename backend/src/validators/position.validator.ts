import { z } from 'zod';

export const createPositionSchema = z.object({
  name: z.string().min(2, 'Position name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
});

export const updatePositionSchema = createPositionSchema.partial();

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
