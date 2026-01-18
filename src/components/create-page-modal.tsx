'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CreatePageModalProps {
  isOpen: boolean
  projectId: string
  onClose: () => void
  onCreated: () => void
}

export function CreatePageModal({ isOpen, projectId, onClose, onCreated }: CreatePageModalProps) {
  const [pageName, setPageName] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  if (!isOpen) return null

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pageName.trim()) return

    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('project_pages')
      .insert({
        project_id: projectId,
        name: pageName.trim(),
        content: '',
        created_by: user?.id,
      })
      .select()
      .single()

    if (!error && data) {
      setPageName('')
      onCreated()
      onClose()
      // Navigate to the new page
      router.push(`/dashboard/project-page/${data.id}`)
    }
    setCreating(false)
  }

  const handleClose = () => {
    setPageName('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">New Page</h2>
          <form onSubmit={handleCreatePage}>
            <div>
              <label htmlFor="pageName" className="block text-sm font-medium text-gray-700">
                Page Name
              </label>
              <input
                id="pageName"
                type="text"
                required
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                placeholder="e.g., Site Notes, Daily Report"
                autoFocus
              />
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
