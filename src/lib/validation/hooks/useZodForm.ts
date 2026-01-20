'use client'

import { useState, useCallback } from 'react'
import { z } from 'zod'

export interface FieldError {
  field: string
  message: string
}

export interface UseZodFormResult<T> {
  errors: Record<string, string>
  validate: (data: unknown) => { success: true; data: T } | { success: false; errors: FieldError[] }
  validateField: (field: string, value: unknown, partialSchema?: z.ZodTypeAny) => string | null
  setFieldError: (field: string, message: string) => void
  clearErrors: () => void
  clearFieldError: (field: string) => void
  hasErrors: boolean
}

export function useZodForm<T extends z.ZodTypeAny>(schema: T): UseZodFormResult<z.infer<T>> {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(
    (data: unknown): { success: true; data: z.infer<T> } | { success: false; errors: FieldError[] } => {
      const result = schema.safeParse(data)

      if (result.success) {
        setErrors({})
        return { success: true, data: result.data }
      }

      const fieldErrors: FieldError[] = []
      const errorMap: Record<string, string> = {}

      if (result.error && result.error.issues) {
        result.error.issues.forEach((issue) => {
          const field = issue.path.join('.') || '_root'
          if (!errorMap[field]) {
            errorMap[field] = issue.message
            fieldErrors.push({ field, message: issue.message })
          }
        })
      }

      setErrors(errorMap)
      return { success: false, errors: fieldErrors }
    },
    [schema]
  )

  const validateField = useCallback(
    (field: string, value: unknown, partialSchema?: z.ZodTypeAny): string | null => {
      const schemaToUse = partialSchema || schema

      // For partial field validation, wrap the value in an object with the field name
      const testData = partialSchema ? value : { [field]: value }
      const result = partialSchema
        ? schemaToUse.safeParse(value)
        : schemaToUse.safeParse(testData)

      if (result.success) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
        return null
      }

      const fieldError = result.error.issues.find(
        (issue) => issue.path.join('.') === field || issue.path.length === 0
      )

      if (fieldError) {
        setErrors((prev) => ({ ...prev, [field]: fieldError.message }))
        return fieldError.message
      }

      return null
    },
    [schema]
  )

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  return {
    errors,
    validate,
    validateField,
    setFieldError,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
  }
}
