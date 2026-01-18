'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project, Photo } from '@/types/database'
import type { UserRole } from './useCurrentUser'

const PAGE_SIZE = 12

export type ProjectWithPhotos = Project & {
  photo_count?: number
  photos?: Photo[]
}

export type FilterType = 'all' | 'my' | 'archived'

interface UseProjectsOptions {
  filter?: FilterType
  userId?: string | null
  userRole?: UserRole
  searchQuery?: string
}

interface UseProjectsResult {
  projects: ProjectWithPhotos[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: Error | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsResult {
  const { filter = 'all', userId = null, userRole = null, searchQuery = '' } = options
  const [projects, setProjects] = useState<ProjectWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const offsetRef = useRef(0)

  const fetchProjects = useCallback(async (isLoadMore = false) => {
    if (!userId || !userRole) {
      setLoading(false)
      return
    }

    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      offsetRef.current = 0
      setHasMore(true)
    }
    setError(null)

    try {
      const supabase = createClient()
      const from = isLoadMore ? offsetRef.current : 0
      const to = from + PAGE_SIZE - 1

      // For Restricted users, only fetch projects they are members of
      if (userRole === 'Restricted') {
        // First get project IDs where user is a member
        const { data: memberships, error: membershipError } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId)

        if (membershipError) {
          throw membershipError
        }

        if (!memberships || memberships.length === 0) {
          setProjects([])
          setLoading(false)
          setLoadingMore(false)
          setHasMore(false)
          return
        }

        const projectIds = memberships.map(m => m.project_id)

        let query = supabase
          .from('projects')
          .select(`
            *,
            photos (id, storage_path)
          `)
          .in('id', projectIds)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })

        // Apply search filter server-side
        if (searchQuery.trim()) {
          query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        }

        query = query.range(from, to)

        const { data, error: fetchError } = await query

        if (fetchError) {
          throw fetchError
        }

        if (data) {
          const projectsWithCount = data.map((project) => ({
            ...project,
            photo_count: project.photos?.length || 0,
            photos: project.photos?.slice(0, 1) || [],
          }))

          if (isLoadMore) {
            setProjects(prev => [...prev, ...projectsWithCount])
          } else {
            setProjects(projectsWithCount)
          }

          offsetRef.current = from + data.length
          setHasMore(data.length === PAGE_SIZE)
        }
      } else {
        // Admin/Standard users see all projects with filters
        let query = supabase
          .from('projects')
          .select(`
            *,
            photos (id, storage_path)
          `)
          .order('updated_at', { ascending: false })

        if (filter === 'my') {
          query = query.eq('created_by', userId)
        } else if (filter === 'archived') {
          query = query.eq('is_archived', true)
        } else {
          query = query.eq('is_archived', false)
        }

        // Apply search filter server-side
        if (searchQuery.trim()) {
          query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        }

        query = query.range(from, to)

        const { data, error: fetchError } = await query

        if (fetchError) {
          throw fetchError
        }

        if (data) {
          const projectsWithCount = data.map((project) => ({
            ...project,
            photo_count: project.photos?.length || 0,
            photos: project.photos?.slice(0, 1) || [],
          }))

          if (isLoadMore) {
            setProjects(prev => [...prev, ...projectsWithCount])
          } else {
            setProjects(projectsWithCount)
          }

          offsetRef.current = from + data.length
          setHasMore(data.length === PAGE_SIZE)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filter, userId, userRole, searchQuery])

  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await fetchProjects(true)
    }
  }, [fetchProjects, loadingMore, hasMore])

  useEffect(() => {
    fetchProjects(false)
  }, [fetchProjects])

  return {
    projects,
    loading,
    loadingMore,
    hasMore,
    error,
    refetch: () => fetchProjects(false),
    loadMore,
  }
}
