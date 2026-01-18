'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export interface UserWithRole extends Profile {
  is_active?: boolean
}

interface InviteResult {
  success: boolean
  link?: string
  error?: string
}

interface UseUsersResult {
  users: UserWithRole[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  inviteUser: (email: string, role: string) => Promise<InviteResult>
}

export function useUsers(): UseUsersResult {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      if (data) {
        const usersWithRoles: UserWithRole[] = data.map((user) => ({
          ...user,
          is_active: true,
        }))
        setUsers(usersWithRoles)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch users'))
    } finally {
      setLoading(false)
    }
  }, [])

  const inviteUser = useCallback(async (email: string, role: string): Promise<InviteResult> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { success: false, error: 'You must be logged in to invite users' }
      }

      const { data, error: insertError } = await supabase
        .from('invitations')
        .insert({
          email,
          role,
          invited_by: user.id,
        })
        .select()
        .single()

      if (insertError) {
        return { success: false, error: insertError.message }
      }

      if (data) {
        const link = `${window.location.origin}/invite/${data.token}`
        return { success: true, link }
      }

      return { success: false, error: 'Failed to create invitation' }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to invite user'
      }
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    inviteUser,
  }
}
