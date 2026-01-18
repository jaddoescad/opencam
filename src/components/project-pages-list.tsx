'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CreatePageModal } from './create-page-modal'
import type { ProjectPage } from '@/types/database'

interface ProjectPagesListProps {
  pages: ProjectPage[]
  projectId: string
  onPagesChange: () => void
}

export function ProjectPagesList({ pages, projectId, onPagesChange }: ProjectPagesListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    const { error } = await supabase
      .from('project_pages')
      .delete()
      .eq('id', pageId)

    if (!error) {
      onPagesChange()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (pages.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">No pages yet</p>
          <p className="mt-1 text-center">Create a page to add documentation or notes to this project.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Page
          </button>
        </div>

        <CreatePageModal
          isOpen={showCreateModal}
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={onPagesChange}
        />
      </>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Project Pages</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Page
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm divide-y">
        {pages.map((page) => (
          <div
            key={page.id}
            className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
            onClick={() => router.push(`/dashboard/project-page/${page.id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{page.name}</p>
                <p className="text-sm text-gray-500">Updated {formatDate(page.updated_at)}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeletePage(page.id)
              }}
              className="text-gray-400 hover:text-red-500 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <CreatePageModal
        isOpen={showCreateModal}
        projectId={projectId}
        onClose={() => setShowCreateModal(false)}
        onCreated={onPagesChange}
      />
    </div>
  )
}
