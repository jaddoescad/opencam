'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Company } from '@/types/database'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'Admin' | 'Standard' | 'Restricted' | null

interface UseCurrentUserResult {
  user: User | null
  profile: Profile | null
  company: Company | null
  role: UserRole
  loading: boolean
  error: Error | null
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const supabase = createClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          setLoading(false)
          return
        }

        setUser(user)

        // Fetch profile with company join (explicit foreign key to avoid ambiguity)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, company:companies!profiles_company_id_fkey(*)')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        // Handle case where profile doesn't exist yet
        if (profileData) {
          // Extract company from the joined data
          const { company: companyData, ...profileWithoutCompany } = profileData
          setProfile(profileWithoutCompany)
          setCompany(companyData)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  return {
    user,
    profile,
    company,
    role: profile?.role ?? null,
    loading,
    error,
  }
}
