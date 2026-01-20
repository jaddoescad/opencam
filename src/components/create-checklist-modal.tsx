'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createChecklistInputSchema, useZodForm } from '@/lib/validation'
import type { ChecklistTemplate } from '@/types/database'

interface CreateChecklistModalProps {
  isOpen: boolean
  projectId: string
  onClose: () => void
  onCreated: () => void
}

export function CreateChecklistModal({ isOpen, projectId, onClose, onCreated }: CreateChecklistModalProps) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const supabase = createClient()
  const { errors, validate, clearErrors } = useZodForm(createChecklistInputSchema)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    const { data } = await supabase
      .from('checklist_templates')
      .select('*')
      .order('name')
    if (data) setTemplates(data)
    setLoadingTemplates(false)
  }

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplateId(templateId)
    if (templateId) {
      const template = templates.find(t => t.id === templateId)
      if (template) setTitle(template.name)
    } else {
      setTitle('')
    }
  }

  if (!isOpen) return null

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = {
      title,
      templateId: selectedTemplateId || undefined,
    }

    const result = validate(formData)
    if (!result.success) {
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const { data: newChecklist, error: insertError } = await supabase
      .from('checklists')
      .insert({
        project_id: projectId,
        title,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Copy template items if a template was selected
    if (selectedTemplateId && newChecklist) {
      const { data: templateItems } = await supabase
        .from('checklist_template_items')
        .select('*')
        .eq('checklist_template_id', selectedTemplateId)
        .order('position')

      if (templateItems && templateItems.length > 0) {
        const items = templateItems.map((item) => ({
          checklist_id: newChecklist.id,
          content: item.content,
          category: item.category,
          position: item.position,
          field_type: item.field_type,
          notes: item.notes,
          photos_required: item.photos_required,
          options: item.options,
        }))
        await supabase.from('checklist_items').insert(items)
      }
    }

    setTitle('')
    setSelectedTemplateId(null)
    onCreated()
    onClose()
    setLoading(false)
  }

  const handleClose = () => {
    setTitle('')
    setSelectedTemplateId(null)
    setError(null)
    clearErrors()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">New Checklist</h2>

          <form onSubmit={handleCreateChecklist}>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                Template
              </label>
              <select
                id="template"
                value={selectedTemplateId || ''}
                onChange={(e) => handleTemplateChange(e.target.value || null)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                disabled={loadingTemplates}
              >
                <option value="">Start from scratch</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Site Inspection Checklist"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
