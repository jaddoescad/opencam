'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProjectPage } from '@/types/database'

interface ProjectPagesListProps {
  pages: ProjectPage[]
  projectId: string
  onPagesChange: () => void
}

export function ProjectPagesList({ pages, projectId, onPagesChange }: ProjectPagesListProps) {
  const [selectedPage, setSelectedPage] = useState<ProjectPage | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const [creating, setCreating] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPageName.trim()) return

    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('project_pages')
      .insert({
        project_id: projectId,
        name: newPageName.trim(),
        content: '',
        created_by: user?.id,
      })

    if (!error) {
      setNewPageName('')
      setShowCreateModal(false)
      onPagesChange()
    }
    setCreating(false)
  }

  const handleSelectPage = (page: ProjectPage) => {
    setSelectedPage(page)
    setTimeout(() => {
      if (editorRef.current && page.content) {
        editorRef.current.innerHTML = page.content
      } else if (editorRef.current) {
        editorRef.current.innerHTML = ''
      }
    }, 0)
  }

  const handleContentChange = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (editorRef.current && selectedPage) {
        setSaving(true)
        await supabase
          .from('project_pages')
          .update({ content: editorRef.current.innerHTML })
          .eq('id', selectedPage.id)
        setSaving(false)
        onPagesChange()
      }
    }, 1000)
  }

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    const { error } = await supabase
      .from('project_pages')
      .delete()
      .eq('id', pageId)

    if (!error) {
      if (selectedPage?.id === pageId) {
        setSelectedPage(null)
      }
      onPagesChange()
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
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

        {/* Create Page Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
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
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                      placeholder="e.g., Site Notes, Daily Report"
                      autoFocus
                    />
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
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
        )}
      </>
    )
  }

  if (selectedPage) {
    return (
      <div className="-m-6 bg-gray-100 pb-8">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedPage(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Project
            </button>
            <div className="flex items-center gap-4 text-sm">
              {saving ? (
                <span className="text-blue-600">Saving...</span>
              ) : (
                <span className="text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => execCommand('bold')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Italic"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M19 4h-9M14 20H5M15 4L9 20" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('underline')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('strikeThrough')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Strikethrough"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M16 4H9a3 3 0 100 6h6a3 3 0 010 6H8M4 12h16" />
              </svg>
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1" />
            <button
              onClick={() => execCommand('insertUnorderedList')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Bullet List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('insertOrderedList')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Numbered List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
              </svg>
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1" />
            <button
              onClick={() => {
                const url = prompt('Enter link URL:')
                if (url) execCommand('createLink', url)
              }}
              className="p-2 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
              title="Insert Link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex justify-center py-8 px-6">
          <div className="bg-white shadow-lg rounded-lg w-full max-w-4xl min-h-[700px]">
            <div className="p-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">{selectedPage.name}</h1>
              <div
                ref={editorRef}
                contentEditable
                onInput={handleContentChange}
                className="prose prose-lg max-w-none min-h-[500px] focus:outline-none text-gray-900"
                style={{ color: '#111827', lineHeight: '1.8' }}
                suppressContentEditableWarning
              />
            </div>
          </div>
        </div>
      </div>
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
            onClick={() => handleSelectPage(page)}
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

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">New Page</h2>
              <form onSubmit={handleCreatePage}>
                <div>
                  <label htmlFor="pageNameList" className="block text-sm font-medium text-gray-700">
                    Page Name
                  </label>
                  <input
                    id="pageNameList"
                    type="text"
                    required
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                    placeholder="e.g., Site Notes, Daily Report"
                    autoFocus
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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
      )}
    </div>
  )
}
