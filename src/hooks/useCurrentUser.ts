'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'Admin' | 'Standard' | 'Restricted' | null

interface UseCurrentUserResult {
  user: User | null
  profile: Profile | null
  role: UserRole
  loading: boolean
  error: Error | null
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
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

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          throw profileError
        }

        setProfile(profileData)
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
    role: profile?.role ?? null,
    loading,
    error,
  }
}
