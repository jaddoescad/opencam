'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProjectTemplate, ChecklistTemplate, PageTemplate } from '@/types/database'

export type TemplateType = 'projects' | 'checklists' | 'pages'

type CreateTemplateResult = {
  id: string
} | null

interface UseTemplatesResult {
  projectTemplates: ProjectTemplate[]
  checklistTemplates: ChecklistTemplate[]
  pageTemplates: PageTemplate[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createTemplate: (type: TemplateType) => Promise<CreateTemplateResult>
  deleteTemplate: (type: TemplateType, id: string) => Promise<boolean>
}

export function useTemplates(): UseTemplatesResult {
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([])
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([])
  const [pageTemplates, setPageTemplates] = useState<PageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const [projectRes, checklistRes, pageRes] = await Promise.all([
        supabase.from('project_templates').select('*').order('updated_at', { ascending: false }),
        supabase.from('checklist_templates').select('*').order('updated_at', { ascending: false }),
        supabase.from('page_templates').select('*').order('updated_at', { ascending: false }),
      ])

      if (projectRes.error) throw projectRes.error
      if (checklistRes.error) throw checklistRes.error
      if (pageRes.error) throw pageRes.error

      setProjectTemplates(projectRes.data || [])
      setChecklistTemplates(checklistRes.data || [])
      setPageTemplates(pageRes.data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch templates'))
    } finally {
      setLoading(false)
    }
  }, [])

  const createTemplate = useCallback(async (type: TemplateType): Promise<CreateTemplateResult> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return null
      }

      const tableName = type === 'projects' ? 'project_templates' :
                        type === 'checklists' ? 'checklist_templates' : 'page_templates'

      const { data, error: insertError } = await supabase
        .from(tableName)
        .insert({ name: 'Untitled Template', created_by: user.id })
        .select()
        .single()

      if (insertError || !data) {
        return null
      }

      return { id: data.id }
    } catch {
      return null
    }
  }, [])

  const deleteTemplate = useCallback(async (type: TemplateType, id: string): Promise<boolean> => {
    try {
      const supabase = createClient()
      const tableName = type === 'projects' ? 'project_templates' :
                        type === 'checklists' ? 'checklist_templates' : 'page_templates'

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (deleteError) {
        return false
      }

      // Refetch to update state
      await fetchTemplates()
      return true
    } catch {
      return false
    }
  }, [fetchTemplates])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    projectTemplates,
    checklistTemplates,
    pageTemplates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    deleteTemplate,
  }
}
