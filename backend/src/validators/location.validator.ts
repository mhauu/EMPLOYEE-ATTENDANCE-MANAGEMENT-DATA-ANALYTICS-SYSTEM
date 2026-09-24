import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z
    .string()
    .min(2, 'Location name must be at least 2 characters')
    .max(100),
  address: z.string().min(5, 'Address is required').max(255),
  latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude: z
    .number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  allowedRadiusMeters: z.number().int().min(10).max(10000).default(100),
});

export const updateLocationSchema = createLocationSchema.partial();

export const assignLocationSchema = z.object({
  employeeId: z.string().uuid(),
  locationId: z.string().uuid(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional().nullable(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type AssignLocationInput = z.infer<typeof assignLocationSchema>;
