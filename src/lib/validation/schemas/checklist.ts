import { z } from 'zod'
import { uuidSchema } from './common'

export const createChecklistInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Checklist title is required')
    .max(200, 'Title must be 200 characters or less'),
  templateId: uuidSchema.optional().nullable(),
})

export type CreateChecklistInput = z.infer<typeof createChecklistInputSchema>
