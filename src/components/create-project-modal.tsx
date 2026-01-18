'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProjectTemplate } from '@/types/database'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

const COUNTRIES = [
  'Canada',
  'United States',
  'United Kingdom',
  'Australia',
  'Other',
]

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Canada')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchProjectTemplates()
    }
  }, [isOpen])

  const fetchProjectTemplates = async () => {
    const { data } = await supabase
      .from('project_templates')
      .select('*')
      .order('name')

    if (data) {
      setProjectTemplates(data)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to create a project')
      setLoading(false)
      return
    }

    // Get the user's profile to get company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // Build full address string for display
    const addressParts = [addressLine1, city, state, postalCode].filter(Boolean)
    const fullAddress = addressParts.join(', ')

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        name,
        address: fullAddress || null,
        address_line1: addressLine1 || null,
        city: city || null,
        state: state || null,
        postal_code: postalCode || null,
        country: country || null,
        created_by: user.id,
        company_id: profile?.company_id,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Apply template if selected
    if (selectedTemplateId && data) {
      await applyTemplate(data.id, selectedTemplateId, user.id)
    }

    resetForm()
    onClose()
    router.push(`/dashboard/projects/${data.id}`)
    router.refresh()
  }

  const applyTemplate = async (projectId: string, templateId: string, userId: string) => {
    // Get template checklists
    const { data: templateChecklists } = await supabase
      .from('project_template_checklists')
      .select('checklist_template_id')
      .eq('project_template_id', templateId)

    // Create checklists from templates
    if (templateChecklists) {
      for (const tc of templateChecklists) {
        // Get checklist template
        const { data: checklistTemplate } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('id', tc.checklist_template_id)
          .single()

        if (checklistTemplate) {
          // Create checklist
          const { data: newChecklist } = await supabase
            .from('checklists')
            .insert({
              project_id: projectId,
              title: checklistTemplate.name,
              created_by: userId,
            })
            .select()
            .single()

          if (newChecklist) {
            // Get template items
            const { data: templateItems } = await supabase
              .from('checklist_template_items')
              .select('*')
              .eq('checklist_template_id', tc.checklist_template_id)
              .order('position')

            // Create checklist items
            if (templateItems && templateItems.length > 0) {
              const items = templateItems.map((item) => ({
                checklist_id: newChecklist.id,
                content: item.content,
                category: item.category,
                position: item.position,
              }))

              await supabase.from('checklist_items').insert(items)
            }
          }
        }
      }
    }

    // Get template pages
    const { data: templatePages } = await supabase
      .from('project_template_pages')
      .select('page_template_id')
      .eq('project_template_id', templateId)

    // Create pages from templates
    if (templatePages) {
      for (const tp of templatePages) {
        // Get page template
        const { data: pageTemplate } = await supabase
          .from('page_templates')
          .select('*')
          .eq('id', tp.page_template_id)
          .single()

        if (pageTemplate) {
          // Create project page
          await supabase
            .from('project_pages')
            .insert({
              project_id: projectId,
              name: pageTemplate.name,
              content: pageTemplate.content,
              created_by: userId,
            })
        }
      }
    }
  }

  const resetForm = () => {
    setName('')
    setAddressLine1('')
    setCity('')
    setState('')
    setPostalCode('')
    setCountry('Canada')
    setSelectedTemplateId('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain pointer-events-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Project</h2>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-1">
                  Project Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                  placeholder="Project Name"
                />
              </div>

              {/* Address */}
              <div>
                <label htmlFor="addressLine1" className="block text-sm font-semibold text-gray-800 mb-1">
                  Address
                </label>
                <input
                  id="addressLine1"
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                  placeholder="Address"
                />
              </div>

              {/* City */}
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-gray-800 mb-1">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                  placeholder="City"
                />
              </div>

              {/* State and Postal Code - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="state" className="block text-sm font-semibold text-gray-800 mb-1">
                    State
                  </label>
                  <input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-800 mb-1">
                    Postal Code
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                    placeholder="Postal Code"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-semibold text-gray-800 mb-1">
                  Country
                </label>
                <div className="relative">
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Project Templates */}
              <div>
                <label htmlFor="template" className="block text-sm font-semibold text-gray-800 mb-1">
                  Project Templates
                </label>
                <div className="relative">
                  <select
                    id="template"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className={`block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer ${
                      selectedTemplateId ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    <option value="">
                      Apply a Project Template
                    </option>
                    {projectTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-8 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-4 text-base font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
