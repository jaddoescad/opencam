import { z } from 'zod'
import { uuidSchema } from './common'

export const createPageInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Page name is required')
    .max(200, 'Page name must be 200 characters or less'),
  templateId: uuidSchema.optional().nullable(),
})

export type CreatePageInput = z.infer<typeof createPageInputSchema>
