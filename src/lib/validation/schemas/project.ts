import { z } from 'zod'
import { uuidSchema } from './common'

export const createProjectInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
  addressLine1: z.string().max(200, 'Address must be 200 characters or less').optional(),
  city: z.string().max(100, 'City must be 100 characters or less').optional(),
  state: z.string().max(100, 'State must be 100 characters or less').optional(),
  postalCode: z.string().max(20, 'Postal code must be 20 characters or less').optional(),
  country: z.string().max(100, 'Country must be 100 characters or less').optional(),
  templateId: uuidSchema.optional(),
})

export const updateProjectInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
  addressLine1: z.string().max(200, 'Address must be 200 characters or less').optional(),
  addressLine2: z.string().max(200, 'Address must be 200 characters or less').optional(),
  city: z.string().max(100, 'City must be 100 characters or less').optional(),
  state: z.string().max(100, 'State must be 100 characters or less').optional(),
  postalCode: z.string().max(20, 'Postal code must be 20 characters or less').optional(),
  country: z.string().max(100, 'Country must be 100 characters or less').optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>
