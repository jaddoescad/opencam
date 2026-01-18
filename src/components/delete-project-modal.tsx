'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/database'

interface DeleteProjectModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
}

export function DeleteProjectModal({ project, isOpen, onClose, onDelete }: DeleteProjectModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  if (!isOpen || !project) return null

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    // Delete the project (cascade will handle related records if configured)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onDelete()
    onClose()
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          {/* Warning Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Project</h2>
          <p className="text-gray-600 text-center mb-6">
            Are you sure you want to delete <span className="font-semibold">{project.name}</span>? This will permanently remove all photos, checklists, and pages associated with this project.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-3 px-4 text-base font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete Project'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full py-3 px-4 text-base font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
