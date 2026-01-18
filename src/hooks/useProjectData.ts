'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project, Profile, ProjectMember, Checklist, ProjectPage, PhotoWithUploader } from '@/types/database'

export type MemberWithProfile = ProjectMember & { profile: Profile }

interface UseProjectDataResult {
  project: Project | null
  photos: PhotoWithUploader[]
  members: MemberWithProfile[]
  checklists: Checklist[]
  pages: ProjectPage[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  refetchPhotos: () => Promise<void>
  refetchMembers: () => Promise<void>
  refetchChecklists: () => Promise<void>
  refetchPages: () => Promise<void>
}

export function useProjectData(projectId: string): UseProjectDataResult {
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<PhotoWithUploader[]>([])
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [pages, setPages] = useState<ProjectPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProject = useCallback(async () => {
    const supabase = createClient()
    const { data, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError
    setProject(data)
    return data
  }, [projectId])

  const fetchPhotos = useCallback(async () => {
    const supabase = createClient()
    const { data, error: photosError } = await supabase
      .from('photos')
      .select(`
        *,
        uploader:profiles(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (photosError) throw photosError
    setPhotos((data as PhotoWithUploader[]) || [])
    return data
  }, [projectId])

  const fetchMembers = useCallback(async () => {
    const supabase = createClient()
    const { data, error: membersError } = await supabase
      .from('project_members')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('project_id', projectId)

    if (membersError) throw membersError
    setMembers((data as MemberWithProfile[]) || [])
    return data
  }, [projectId])

  const fetchChecklists = useCallback(async () => {
    const supabase = createClient()
    const { data, error: checklistsError } = await supabase
      .from('checklists')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (checklistsError) throw checklistsError
    setChecklists(data || [])
    return data
  }, [projectId])

  const fetchPages = useCallback(async () => {
    const supabase = createClient()
    const { data, error: pagesError } = await supabase
      .from('project_pages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (pagesError) throw pagesError
    setPages(data || [])
    return data
  }, [projectId])

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all data in parallel for better performance
      await Promise.all([
        fetchProject(),
        fetchPhotos(),
        fetchMembers(),
        fetchChecklists(),
        fetchPages(),
      ])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project data'))
    } finally {
      setLoading(false)
    }
  }, [fetchProject, fetchPhotos, fetchMembers, fetchChecklists, fetchPages])

  // Individual refetch functions that don't require full reload
  const refetchPhotos = useCallback(async () => {
    try {
      await fetchPhotos()
    } catch (err) {
      console.error('Error fetching photos:', err)
    }
  }, [fetchPhotos])

  const refetchMembers = useCallback(async () => {
    try {
      await fetchMembers()
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }, [fetchMembers])

  const refetchChecklists = useCallback(async () => {
    try {
      await fetchChecklists()
    } catch (err) {
      console.error('Error fetching checklists:', err)
    }
  }, [fetchChecklists])

  const refetchPages = useCallback(async () => {
    try {
      await fetchPages()
    } catch (err) {
      console.error('Error fetching pages:', err)
    }
  }, [fetchPages])

  useEffect(() => {
    refetch()
  }, [projectId]) // Only re-fetch when projectId changes

  return {
    project,
    photos,
    members,
    checklists,
    pages,
    loading,
    error,
    refetch,
    refetchPhotos,
    refetchMembers,
    refetchChecklists,
    refetchPages,
  }
}
