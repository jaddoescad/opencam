'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useTemplates, type TemplateType } from '@/hooks'
import type { ProjectTemplate, ChecklistTemplate, PageTemplate } from '@/types/database'

type Tab = 'projects' | 'checklists' | 'pages'

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const router = useRouter()
  const { role, profile, loading: userLoading, error: userError } = useCurrentUser()
  const {
    projectTemplates,
    checklistTemplates,
    pageTemplates,
    loading,
    createTemplate,
    deleteTemplate,
  } = useTemplates()

  // Check if user has permission to view this page
  useEffect(() => {
    if (!userLoading) {
      if (!profile) {
        // No profile - redirect to login
        router.push('/login')
      } else if (role === 'Restricted') {
        router.push('/dashboard')
      }
    }
  }, [role, profile, userLoading, router])

  const handleCreateTemplate = async () => {
    const result = await createTemplate(activeTab as TemplateType)
    if (result) {
      router.push(`/dashboard/templates/${activeTab}/${result.id}`)
    }
  }

  const handleDeleteTemplate = async (id: string, type: Tab) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    await deleteTemplate(type as TemplateType, id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getButtonLabel = () => {
    switch (activeTab) {
      case 'projects': return 'Create Project Template'
      case 'checklists': return 'Create Checklist Template'
      case 'pages': return 'Create Page Template'
    }
  }

  const getCurrentTemplates = () => {
    let templates: (ProjectTemplate | ChecklistTemplate | PageTemplate)[] = []
    switch (activeTab) {
      case 'projects': templates = projectTemplates; break
      case 'checklists': templates = checklistTemplates; break
      case 'pages': templates = pageTemplates; break
    }

    if (searchQuery) {
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return templates
  }

  const getTemplateLink = (id: string) => {
    switch (activeTab) {
      case 'projects': return `/dashboard/templates/projects/${id}`
      case 'checklists': return `/dashboard/templates/checklists/${id}`
      case 'pages': return `/dashboard/templates/pages/${id}`
    }
  }

  const templates = getCurrentTemplates()

  // Show loading while checking auth
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Show error if user fetch failed
  if (userError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {userError.message}</div>
      </div>
    )
  }

  // Don't render if not authorized (redirect will happen via useEffect)
  if (!profile || role === 'Restricted') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">Create and manage templates across your company.</p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium cursor-pointer w-full sm:w-auto shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {getButtonLabel()}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mt-6 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('projects')}
            className={`pb-4 text-sm font-medium border-b-2 cursor-pointer ${
              activeTab === 'projects'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={`pb-4 text-sm font-medium border-b-2 cursor-pointer ${
              activeTab === 'checklists'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Checklists
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`pb-4 text-sm font-medium border-b-2 cursor-pointer ${
              activeTab === 'pages'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pages
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a Template"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="col-span-8 flex items-center gap-1">
            Template Name
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <div className="col-span-3 flex items-center gap-1">
            Last Updated
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="col-span-1"></div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {searchQuery ? 'No templates found matching your search' : 'No templates yet. Create your first template!'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((template) => (
              <div
                key={template.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(getTemplateLink(template.id))}
              >
                <div className="col-span-8">
                  <span className="font-medium text-gray-900">{template.name}</span>
                </div>
                <div className="col-span-3 text-sm text-gray-500">
                  {formatDate(template.updated_at)}
                </div>
                <div className="col-span-1 flex justify-end relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === template.id ? null : template.id)
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>

                  {openMenuId === template.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(null)
                        }}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            router.push(getTemplateLink(template.id))
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            handleDeleteTemplate(template.id, activeTab)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
