'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/types/database'

interface UseCompanyResult {
  company: Company | null
  loading: boolean
  error: Error | null
  updateCompany: (updates: Partial<Pick<Company, 'name'>>) => Promise<boolean>
  refetch: () => void
}

export function useCompany(): UseCompanyResult {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get current user's profile to find their company_id
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setLoading(false)
        return
      }

      // Fetch the user's profile to get company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      if (!profile?.company_id) {
        setLoading(false)
        return
      }

      // Fetch the company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single()

      if (companyError) {
        throw companyError
      }

      setCompany(companyData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch company'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  const updateCompany = async (updates: Partial<Pick<Company, 'name'>>): Promise<boolean> => {
    if (!company) return false

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', company.id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setCompany(prev => prev ? { ...prev, ...updates } : null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update company'))
      return false
    }
  }

  return {
    company,
    loading,
    error,
    updateCompany,
    refetch: fetchCompany,
  }
}
