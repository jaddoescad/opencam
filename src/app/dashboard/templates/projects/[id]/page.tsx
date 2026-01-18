'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProjectTemplate, ChecklistTemplate, PageTemplate } from '@/types/database'

interface ProjectTemplatePageProps {
  params: Promise<{ id: string }>
}

interface LinkedChecklist {
  id: string
  checklist_template_id: string
  checklist_template: ChecklistTemplate
}

interface LinkedPage {
  id: string
  page_template_id: string
  page_template: PageTemplate
}

export default function ProjectTemplatePage({ params }: ProjectTemplatePageProps) {
  const { id } = use(params)
  const [template, setTemplate] = useState<ProjectTemplate | null>(null)
  const [linkedChecklists, setLinkedChecklists] = useState<LinkedChecklist[]>([])
  const [linkedPages, setLinkedPages] = useState<LinkedPage[]>([])
  const [allChecklists, setAllChecklists] = useState<ChecklistTemplate[]>([])
  const [allPages, setAllPages] = useState<PageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [showChecklistPicker, setShowChecklistPicker] = useState(false)
  const [showPagePicker, setShowPagePicker] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTemplate()
    fetchAllTemplates()
  }, [id])

  const fetchTemplate = async () => {
    const [templateRes, checklistsRes, pagesRes] = await Promise.all([
      supabase.from('project_templates').select('*').eq('id', id).single(),
      supabase.from('project_template_checklists')
        .select('*, checklist_template:checklist_templates(*)')
        .eq('project_template_id', id),
      supabase.from('project_template_pages')
        .select('*, page_template:page_templates(*)')
        .eq('project_template_id', id),
    ])

    if (templateRes.data) setTemplate(templateRes.data)
    if (checklistsRes.data) setLinkedChecklists(checklistsRes.data as LinkedChecklist[])
    if (pagesRes.data) setLinkedPages(pagesRes.data as LinkedPage[])
    setLoading(false)
  }

  const fetchAllTemplates = async () => {
    const [checklistsRes, pagesRes] = await Promise.all([
      supabase.from('checklist_templates').select('*').order('name'),
      supabase.from('page_templates').select('*').order('name'),
    ])

    if (checklistsRes.data) setAllChecklists(checklistsRes.data)
    if (pagesRes.data) setAllPages(pagesRes.data)
  }

  const updateTemplate = async (updates: Partial<ProjectTemplate>) => {
    const { error } = await supabase
      .from('project_templates')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setTemplate((prev) => prev ? { ...prev, ...updates } : prev)
      setLastSaved(new Date())
    }
  }

  const addChecklist = async (checklistTemplateId: string) => {
    const { data, error } = await supabase
      .from('project_template_checklists')
      .insert({
        project_template_id: id,
        checklist_template_id: checklistTemplateId,
        position: linkedChecklists.length,
      })
      .select('*, checklist_template:checklist_templates(*)')
      .single()

    if (!error && data) {
      setLinkedChecklists([...linkedChecklists, data as LinkedChecklist])
      setLastSaved(new Date())
    }
    setShowChecklistPicker(false)
  }

  const removeChecklist = async (linkId: string) => {
    const { error } = await supabase
      .from('project_template_checklists')
      .delete()
      .eq('id', linkId)

    if (!error) {
      setLinkedChecklists(linkedChecklists.filter((c) => c.id !== linkId))
      setLastSaved(new Date())
    }
  }

  const addPage = async (pageTemplateId: string) => {
    const { data, error } = await supabase
      .from('project_template_pages')
      .insert({
        project_template_id: id,
        page_template_id: pageTemplateId,
        position: linkedPages.length,
      })
      .select('*, page_template:page_templates(*)')
      .single()

    if (!error && data) {
      setLinkedPages([...linkedPages, data as LinkedPage])
      setLastSaved(new Date())
    }
    setShowPagePicker(false)
  }

  const removePage = async (linkId: string) => {
    const { error } = await supabase
      .from('project_template_pages')
      .delete()
      .eq('id', linkId)

    if (!error) {
      setLinkedPages(linkedPages.filter((p) => p.id !== linkId))
      setLastSaved(new Date())
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Get available checklists (not already linked)
  const linkedChecklistIds = linkedChecklists.map((c) => c.checklist_template_id)
  const availableChecklists = allChecklists.filter((c) => !linkedChecklistIds.includes(c.id))

  // Get available pages (not already linked)
  const linkedPageIds = linkedPages.map((p) => p.page_template_id)
  const availablePages = allPages.filter((p) => !linkedPageIds.includes(p.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading template...</div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Template not found</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/templates" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Templates</span>
        </Link>
        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Changes Saved
            </span>
          )}
          <span className="text-sm text-gray-500">
            Last updated {new Date(template.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}, {formatTime(new Date(template.updated_at))}
          </span>
        </div>
      </div>

      {/* Template Name & Description */}
      <div className="mb-8">
        <div className="flex items-start gap-2">
          {editingName ? (
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              onBlur={() => {
                setEditingName(false)
                updateTemplate({ name: template.name })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingName(false)
                  updateTemplate({ name: template.name })
                }
              }}
              autoFocus
              className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none"
            />
          ) : (
            <h1
              onClick={() => setEditingName(true)}
              className="text-3xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 flex items-center gap-2"
            >
              {template.name}
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </h1>
          )}
          <button className="p-2 text-gray-400 hover:text-gray-600 ml-auto">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
        {editingDescription ? (
          <input
            type="text"
            value={template.description || ''}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
            onBlur={() => {
              setEditingDescription(false)
              updateTemplate({ description: template.description })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingDescription(false)
                updateTemplate({ description: template.description })
              }
            }}
            autoFocus
            placeholder="Enter Template Description"
            className="text-gray-500 border-b-2 border-blue-500 outline-none mt-1"
          />
        ) : (
          <p
            onClick={() => setEditingDescription(true)}
            className="text-gray-500 cursor-pointer hover:text-blue-600 flex items-center gap-2 mt-1"
          >
            {template.description || 'Enter Template Description'}
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </p>
        )}
      </div>

      <hr className="mb-8" />

      {/* Sections */}
      <div className="max-w-3xl space-y-6">
        {/* Checklists Section */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklists</h2>

          {linkedChecklists.length > 0 && (
            <div className="space-y-2 mb-4">
              {linkedChecklists.map((link) => (
                <div key={link.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3">
                  <span className="text-gray-900">{link.checklist_template.name}</span>
                  <button
                    onClick={() => removeChecklist(link.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowChecklistPicker(!showChecklistPicker)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Checklists
            </button>

            {showChecklistPicker && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {availableChecklists.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No more checklists available</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {availableChecklists.map((checklist) => (
                      <button
                        key={checklist.id}
                        onClick={() => addChecklist(checklist.id)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {checklist.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pages Section */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pages</h2>

          {linkedPages.length > 0 && (
            <div className="space-y-2 mb-4">
              {linkedPages.map((link) => (
                <div key={link.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3">
                  <span className="text-gray-900">{link.page_template.name}</span>
                  <button
                    onClick={() => removePage(link.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowPagePicker(!showPagePicker)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Pages
            </button>

            {showPagePicker && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {availablePages.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No more pages available</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {availablePages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => addPage(page.id)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {page.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
