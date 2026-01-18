'use client'

import { useState, useCallback, useMemo } from 'react'

type ValidationRule<T> = {
  validate: (value: T[keyof T], values: T) => boolean
  message: string
}

type FieldValidation<T> = {
  [K in keyof T]?: ValidationRule<T>[]
}

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T
  validation?: FieldValidation<T>
  onSubmit?: (values: T) => Promise<void> | void
}

interface UseFormResult<T extends Record<string, unknown>> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
  setValue: <K extends keyof T>(field: K, value: T[K]) => void
  setValues: (values: Partial<T>) => void
  setError: (field: keyof T, message: string) => void
  clearError: (field: keyof T) => void
  setTouched: (field: keyof T) => void
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleBlur: (field: keyof T) => () => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  reset: (newValues?: T) => void
  validateField: (field: keyof T) => boolean
  validateAll: () => boolean
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validation = {},
  onSubmit,
}: UseFormOptions<T>): UseFormResult<T> {
  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if form has been modified from initial values
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some(
      (key) => values[key as keyof T] !== initialValues[key as keyof T]
    )
  }, [values, initialValues])

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): boolean => {
      const fieldValidation = validation[field]
      if (!fieldValidation) return true

      for (const rule of fieldValidation) {
        if (!rule.validate(values[field], values)) {
          setErrors((prev) => ({ ...prev, [field]: rule.message }))
          return false
        }
      }

      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      return true
    },
    [values, validation]
  )

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let isValid = true
    const newErrors: Partial<Record<keyof T, string>> = {}

    for (const field of Object.keys(validation) as (keyof T)[]) {
      const fieldValidation = validation[field]
      if (!fieldValidation) continue

      for (const rule of fieldValidation) {
        if (!rule.validate(values[field], values)) {
          newErrors[field] = rule.message
          isValid = false
          break
        }
      }
    }

    setErrors(newErrors)
    return isValid
  }, [values, validation])

  // Check if form is currently valid (no errors)
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0
  }, [errors])

  // Set a single value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }))
  }, [])

  // Set an error for a field
  const setError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }, [])

  // Clear an error for a field
  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  // Mark a field as touched
  const setTouched = useCallback((field: keyof T) => {
    setTouchedState((prev) => ({ ...prev, [field]: true }))
  }, [])

  // Handle input change events
  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : e.target.value
        setValue(field, value as T[keyof T])
      },
    [setValue]
  )

  // Handle input blur events
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched(field)
      validateField(field)
    },
    [setTouched, validateField]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()

      // Mark all fields as touched
      const allTouched = Object.keys(initialValues).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      )
      setTouchedState(allTouched)

      // Validate all fields
      if (!validateAll()) return

      if (!onSubmit) return

      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, initialValues, validateAll, onSubmit]
  )

  // Reset the form
  const reset = useCallback(
    (newValues?: T) => {
      setValuesState(newValues ?? initialValues)
      setErrors({})
      setTouchedState({})
      setIsSubmitting(false)
    },
    [initialValues]
  )

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setValues,
    setError,
    clearError,
    setTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateField,
    validateAll,
  }
}

// Common validation rules factory
export const validators = {
  required: (message = 'This field is required'): ValidationRule<Record<string, unknown>> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0
      return value !== null && value !== undefined
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<Record<string, unknown>> => ({
    validate: (value) => typeof value === 'string' && value.length >= min,
    message: message ?? `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<Record<string, unknown>> => ({
    validate: (value) => typeof value === 'string' && value.length <= max,
    message: message ?? `Must be at most ${max} characters`,
  }),

  email: (message = 'Invalid email address'): ValidationRule<Record<string, unknown>> => ({
    validate: (value) => {
      if (typeof value !== 'string') return false
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },
    message,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<Record<string, unknown>> => ({
    validate: (value) => typeof value === 'string' && regex.test(value),
    message,
  }),
}
