import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useZodForm } from '@/lib/validation'

const testSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0, 'Age must be positive').optional(),
})

describe('useZodForm', () => {
  it('should initialize with empty errors', () => {
    const { result } = renderHook(() => useZodForm(testSchema))

    expect(result.current.errors).toEqual({})
    expect(result.current.hasErrors).toBe(false)
  })

  describe('validate', () => {
    it('should return success for valid data', () => {
      const { result } = renderHook(() => useZodForm(testSchema))

      let validationResult: ReturnType<typeof result.current.validate>
      act(() => {
        validationResult = result.current.validate({
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        })
      })

      expect(validationResult!.success).toBe(true)
      expect(result.current.errors).toEqual({})
      expect(result.current.hasErrors).toBe(false)
    })

    it('should return errors for invalid data', () => {
      const { result } = renderHook(() => useZodForm(testSchema))

      let validationResult: ReturnType<typeof result.current.validate>
      act(() => {
        validationResult = result.current.validate({
          name: '',
          email: 'notanemail',
        })
      })

      expect(validationResult!.success).toBe(false)
      expect(result.current.errors.name).toBe('Name is required')
      expect(result.current.errors.email).toBe('Invalid email')
      expect(result.current.hasErrors).toBe(true)
    })

    it('should clear previous errors on successful validation', () => {
      const { result } = renderHook(() => useZodForm(testSchema))

      // First validation with errors
      act(() => {
        result.current.validate({ name: '', email: 'invalid' })
      })
      expect(result.current.hasErrors).toBe(true)

      // Second validation with valid data
      act(() => {
        result.current.validate({ name: 'John', email: 'john@example.com' })
      })
      expect(result.current.hasErrors).toBe(false)
      expect(result.current.errors).toEqual({})
    })
  })

  describe('setFieldError', () => {
    it('should set a custom error for a field', () => {
      const { result } = renderHook(() => useZodForm(testSchema))

      act(() => {
        result.current.setFieldError('name', 'Custom error message')
      })

      expect(result.current.errors.name).toBe('Custom error message')
      expect(result.current.hasErrors).toBe(true)
    })
  })

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useZodForm(testSchema))

      // Set some errors
      act(() => {
        result.current.validate({ name: '', email: 'invalid' })
      })
      expect(result.current.hasErrors).toBe(true)

      // Clear errors
      act(() => {
        result.current.clearErrors()
      })
      expect(result.current.errors).toEqual({})
      expect(result.current.hasErrors).toBe(false)
    })
  })

  describe('clearFieldError', () => {
    it('should clear a specific field error', () => {
      const { result } = renderHook(() => useZodForm(testSchema))

      // Set some errors
      act(() => {
        result.current.validate({ name: '', email: 'invalid' })
      })
      expect(result.current.errors.name).toBeDefined()
      expect(result.current.errors.email).toBeDefined()

      // Clear one field error
      act(() => {
        result.current.clearFieldError('name')
      })
      expect(result.current.errors.name).toBeUndefined()
      expect(result.current.errors.email).toBeDefined()
    })
  })
})
