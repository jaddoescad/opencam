'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPageInputSchema, useZodForm } from '@/lib/validation'
import type { PageTemplate } from '@/types/database'

interface CreatePageModalProps {
  isOpen: boolean
  projectId: string
  onClose: () => void
  onCreated: () => void
}

export function CreatePageModal({ isOpen, projectId, onClose, onCreated }: CreatePageModalProps) {
  const [pageName, setPageName] = useState('')
  const [creating, setCreating] = useState(false)
  const [templates, setTemplates] = useState<PageTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { errors, validate, clearErrors } = useZodForm(createPageInputSchema)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    const { data } = await supabase
      .from('page_templates')
      .select('*')
      .order('name')
    if (data) setTemplates(data)
    setLoadingTemplates(false)
  }

  const handleTemplateChange = (templateId: string | null) => {
    setSelectedTemplateId(templateId)
    if (templateId) {
      const template = templates.find(t => t.id === templateId)
      if (template) setPageName(template.name)
    } else {
      setPageName('')
    }
  }

  if (!isOpen) return null

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = {
      name: pageName,
      templateId: selectedTemplateId || undefined,
    }

    const result = validate(formData)
    if (!result.success) {
      return
    }

    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Get template content if a template was selected
    let content = ''
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template?.content) {
        content = template.content
      }
    }

    const { data, error } = await supabase
      .from('project_pages')
      .insert({
        project_id: projectId,
        name: pageName.trim(),
        content,
        created_by: user?.id,
      })
      .select()
      .single()

    if (!error && data) {
      setPageName('')
      setSelectedTemplateId(null)
      onCreated()
      onClose()
      // Navigate to the new page
      router.push(`/dashboard/project-page/${data.id}`)
    }
    setCreating(false)
  }

  const handleClose = () => {
    setPageName('')
    setSelectedTemplateId(null)
    clearErrors()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">New Page</h2>
          <form onSubmit={handleCreatePage}>
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
              <label htmlFor="pageName" className="block text-sm font-medium text-gray-700">
                Page Name
              </label>
              <input
                id="pageName"
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Site Notes, Daily Report"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
