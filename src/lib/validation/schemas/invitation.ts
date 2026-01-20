import { z } from 'zod'
import { emailSchema, roleSchema } from './common'

export const inviteUserInputSchema = z.object({
  email: emailSchema,
  role: roleSchema,
})

export const inviteUsersInputSchema = z.object({
  invites: z.array(inviteUserInputSchema).min(1, 'At least one invite is required'),
})

export type InviteUserInput = z.infer<typeof inviteUserInputSchema>
export type InviteUsersInput = z.infer<typeof inviteUsersInputSchema>
