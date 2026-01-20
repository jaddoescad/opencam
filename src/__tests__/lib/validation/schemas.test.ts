import { describe, it, expect } from 'vitest'
import {
  createProjectInputSchema,
  updateProjectInputSchema,
  createChecklistInputSchema,
  createPageInputSchema,
  inviteUserInputSchema,
  emailSchema,
  roleSchema,
} from '@/lib/validation'

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'email@subdomain.domain.com',
      ]

      validEmails.forEach((email) => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        '',
      ]

      invalidEmails.forEach((email) => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('roleSchema', () => {
    it('should accept valid roles', () => {
      const validRoles = ['Admin', 'Standard', 'Restricted']

      validRoles.forEach((role) => {
        const result = roleSchema.safeParse(role)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid roles', () => {
      const invalidRoles = ['admin', 'ADMIN', 'SuperUser', '', 'User']

      invalidRoles.forEach((role) => {
        const result = roleSchema.safeParse(role)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('createProjectInputSchema', () => {
    it('should accept valid project data with only required fields', () => {
      const result = createProjectInputSchema.safeParse({
        name: 'My Project',
      })

      expect(result.success).toBe(true)
    })

    it('should accept valid project data with all fields', () => {
      const result = createProjectInputSchema.safeParse({
        name: 'My Project',
        addressLine1: '123 Main St',
        city: 'Toronto',
        state: 'Ontario',
        postalCode: 'M1M 1M1',
        country: 'Canada',
        templateId: '550e8400-e29b-41d4-a716-446655440000',
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty project name', () => {
      const result = createProjectInputSchema.safeParse({
        name: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Project name is required')
      }
    })

    it('should reject project name over 100 characters', () => {
      const result = createProjectInputSchema.safeParse({
        name: 'a'.repeat(101),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Project name must be 100 characters or less')
      }
    })

    it('should reject invalid templateId format', () => {
      const result = createProjectInputSchema.safeParse({
        name: 'My Project',
        templateId: 'not-a-uuid',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('updateProjectInputSchema', () => {
    it('should accept valid update data', () => {
      const result = updateProjectInputSchema.safeParse({
        name: 'Updated Project Name',
        addressLine1: '456 New St',
        addressLine2: 'Suite 100',
        city: 'Vancouver',
        state: 'BC',
        postalCode: 'V1V 1V1',
        country: 'Canada',
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = updateProjectInputSchema.safeParse({
        name: '',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('createChecklistInputSchema', () => {
    it('should accept valid checklist data', () => {
      const result = createChecklistInputSchema.safeParse({
        title: 'Site Inspection Checklist',
      })

      expect(result.success).toBe(true)
    })

    it('should accept checklist with template', () => {
      const result = createChecklistInputSchema.safeParse({
        title: 'Site Inspection Checklist',
        templateId: '550e8400-e29b-41d4-a716-446655440000',
      })

      expect(result.success).toBe(true)
    })

    it('should accept checklist with null template', () => {
      const result = createChecklistInputSchema.safeParse({
        title: 'Site Inspection Checklist',
        templateId: null,
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty title', () => {
      const result = createChecklistInputSchema.safeParse({
        title: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Checklist title is required')
      }
    })

    it('should reject title over 200 characters', () => {
      const result = createChecklistInputSchema.safeParse({
        title: 'a'.repeat(201),
      })

      expect(result.success).toBe(false)
    })
  })

  describe('createPageInputSchema', () => {
    it('should accept valid page data', () => {
      const result = createPageInputSchema.safeParse({
        name: 'Daily Report',
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = createPageInputSchema.safeParse({
        name: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Page name is required')
      }
    })
  })

  describe('inviteUserInputSchema', () => {
    it('should accept valid invite data', () => {
      const result = inviteUserInputSchema.safeParse({
        email: 'user@example.com',
        role: 'Standard',
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = inviteUserInputSchema.safeParse({
        email: 'notvalid',
        role: 'Standard',
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid role', () => {
      const result = inviteUserInputSchema.safeParse({
        email: 'user@example.com',
        role: 'InvalidRole',
      })

      expect(result.success).toBe(false)
    })
  })
})
