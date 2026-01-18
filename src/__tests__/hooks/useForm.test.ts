import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useForm, validators } from '@/hooks/useForm'

describe('useForm', () => {
  const defaultInitialValues = {
    name: '',
    email: '',
  }

  it('should initialize with provided values', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: 'John', email: 'john@example.com' },
      })
    )

    expect(result.current.values).toEqual({
      name: 'John',
      email: 'john@example.com',
    })
  })

  it('should update a single value', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: defaultInitialValues })
    )

    act(() => {
      result.current.setValue('name', 'Jane')
    })

    expect(result.current.values.name).toBe('Jane')
  })

  it('should update multiple values', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: defaultInitialValues })
    )

    act(() => {
      result.current.setValues({ name: 'Jane', email: 'jane@example.com' })
    })

    expect(result.current.values).toEqual({
      name: 'Jane',
      email: 'jane@example.com',
    })
  })

  it('should track dirty state', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: defaultInitialValues })
    )

    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.setValue('name', 'Jane')
    })

    expect(result.current.isDirty).toBe(true)
  })

  it('should set and clear errors', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: defaultInitialValues })
    )

    act(() => {
      result.current.setError('name', 'Name is required')
    })

    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.isValid).toBe(false)

    act(() => {
      result.current.clearError('name')
    })

    expect(result.current.errors.name).toBeUndefined()
    expect(result.current.isValid).toBe(true)
  })

  it('should track touched fields', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: defaultInitialValues })
    )

    expect(result.current.touched.name).toBeUndefined()

    act(() => {
      result.current.setTouched('name')
    })

    expect(result.current.touched.name).toBe(true)
  })

  it('should validate fields with validation rules', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: defaultInitialValues,
        validation: {
          name: [validators.required('Name is required')],
          email: [validators.required(), validators.email()],
        },
      })
    )

    act(() => {
      result.current.validateField('name')
    })

    expect(result.current.errors.name).toBe('Name is required')

    // Set the value first
    act(() => {
      result.current.setValue('name', 'Jane')
    })

    // Then validate in a separate act to ensure state has updated
    act(() => {
      result.current.validateField('name')
    })

    expect(result.current.errors.name).toBeUndefined()
  })

  it('should validate all fields', () => {
    const { result } = renderHook(() =>
      useForm({
        initialValues: defaultInitialValues,
        validation: {
          name: [validators.required('Name is required')],
          email: [validators.required('Email is required')],
        },
      })
    )

    let isValid: boolean
    act(() => {
      isValid = result.current.validateAll()
    })

    expect(isValid!).toBe(false)
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.errors.email).toBe('Email is required')
  })

  it('should reset form to initial values', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: defaultInitialValues })
    )

    act(() => {
      result.current.setValue('name', 'Jane')
      result.current.setError('name', 'Error')
      result.current.setTouched('name')
    })

    expect(result.current.values.name).toBe('Jane')
    expect(result.current.errors.name).toBe('Error')
    expect(result.current.touched.name).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.values).toEqual(defaultInitialValues)
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
  })

  it('should reset form to new values', () => {
    const { result } = renderHook(() =>
      useForm({ initialValues: defaultInitialValues })
    )

    act(() => {
      result.current.reset({ name: 'New Name', email: 'new@example.com' })
    })

    expect(result.current.values).toEqual({
      name: 'New Name',
      email: 'new@example.com',
    })
  })

  it('should call onSubmit with values when form is valid', async () => {
    const onSubmit = vi.fn()

    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: 'Jane' },
        onSubmit,
      })
    )

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Jane' })
  })

  it('should not call onSubmit when validation fails', async () => {
    const onSubmit = vi.fn()

    const { result } = renderHook(() =>
      useForm({
        initialValues: defaultInitialValues,
        validation: {
          name: [validators.required('Name is required')],
        },
        onSubmit,
      })
    )

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should complete submission and reset isSubmitting', async () => {
    const onSubmit = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 50)))

    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: 'Jane' },
        onSubmit,
      })
    )

    expect(result.current.isSubmitting).toBe(false)

    await act(async () => {
      await result.current.handleSubmit()
    })

    // After submission completes, isSubmitting should be false
    expect(result.current.isSubmitting).toBe(false)
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Jane' })
  })
})

describe('validators', () => {
  describe('required', () => {
    it('should fail for empty string', () => {
      const rule = validators.required()
      expect(rule.validate('', {})).toBe(false)
    })

    it('should fail for whitespace-only string', () => {
      const rule = validators.required()
      expect(rule.validate('   ', {})).toBe(false)
    })

    it('should pass for non-empty string', () => {
      const rule = validators.required()
      expect(rule.validate('test', {})).toBe(true)
    })
  })

  describe('minLength', () => {
    it('should fail for string shorter than min', () => {
      const rule = validators.minLength(5)
      expect(rule.validate('test', {})).toBe(false)
    })

    it('should pass for string equal to or longer than min', () => {
      const rule = validators.minLength(5)
      expect(rule.validate('tests', {})).toBe(true)
      expect(rule.validate('testing', {})).toBe(true)
    })
  })

  describe('maxLength', () => {
    it('should fail for string longer than max', () => {
      const rule = validators.maxLength(5)
      expect(rule.validate('testing', {})).toBe(false)
    })

    it('should pass for string equal to or shorter than max', () => {
      const rule = validators.maxLength(5)
      expect(rule.validate('tests', {})).toBe(true)
      expect(rule.validate('test', {})).toBe(true)
    })
  })

  describe('email', () => {
    it('should fail for invalid emails', () => {
      const rule = validators.email()
      expect(rule.validate('invalid', {})).toBe(false)
      expect(rule.validate('invalid@', {})).toBe(false)
      expect(rule.validate('@example.com', {})).toBe(false)
    })

    it('should pass for valid emails', () => {
      const rule = validators.email()
      expect(rule.validate('test@example.com', {})).toBe(true)
      expect(rule.validate('test.user@example.co.uk', {})).toBe(true)
    })
  })

  describe('pattern', () => {
    it('should validate against regex pattern', () => {
      const rule = validators.pattern(/^\d{5}$/, 'Must be 5 digits')
      expect(rule.validate('12345', {})).toBe(true)
      expect(rule.validate('1234', {})).toBe(false)
      expect(rule.validate('123456', {})).toBe(false)
      expect(rule.validate('abcde', {})).toBe(false)
    })
  })
})
