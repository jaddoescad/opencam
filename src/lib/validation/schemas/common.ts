import { z } from 'zod'

export const uuidSchema = z.string().uuid('Invalid ID format')

export const emailSchema = z.string().email('Please enter a valid email address')

export const roleSchema = z.enum(['Admin', 'Standard', 'Restricted'], {
  message: 'Please select a valid role',
})

export type UserRole = z.infer<typeof roleSchema>
