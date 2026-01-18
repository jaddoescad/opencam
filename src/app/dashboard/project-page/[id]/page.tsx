'use client'

import { useState, useEffect, use, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProjectPage } from '@/types/database'

interface ProjectPageEditorProps {
  params: Promise<{ id: string }>
}

export default function ProjectPageEditor({ params }: ProjectPageEditorProps) {
  const { id } = use(params)
  const [page, setPage] = useState<ProjectPage | null>(null)
  const [initialContent, setInitialContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contentSetRef = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPage()
  }, [id])

  // Ref callback to set content when editor mounts
  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node
    if (node && initialContent !== null && !contentSetRef.current) {
      node.innerHTML = initialContent
      contentSetRef.current = true
    }
  }, [initialContent])

  // Also set content when initialContent changes (if editor already mounted)
  useEffect(() => {
    if (editorRef.current && initialContent !== null && !contentSetRef.current) {
      editorRef.current.innerHTML = initialContent
      contentSetRef.current = true
    }
  }, [initialContent])

  const fetchPage = async () => {
    const { data, error } = await supabase
      .from('project_pages')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      router.push('/dashboard')
      return
    }

    setPage(data)
    setInitialContent(data.content || '')
    setLoading(false)
  }

  // Save function that can be called directly
  const saveContent = useCallback(async () => {
    if (!editorRef.current || !page) return false

    setSaving(true)
    const { error } = await supabase
      .from('project_pages')
      .update({
        content: editorRef.current.innerHTML,
        updated_at: new Date().toISOString()
      })
      .eq('id', page.id)

    setSaving(false)

    if (!error) {
      setHasUnsavedChanges(false)
      return true
    } else {
      console.error('Error saving:', error)
      return false
    }
  }, [page, supabase])

  const handleContentChange = () => {
    setHasUnsavedChanges(true)

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Auto-save after 1 second of no typing
    saveTimeoutRef.current = setTimeout(() => {
      saveContent()
    }, 1000)
  }

  // Save before navigating away
  const handleBack = async () => {
    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Save if there are unsaved changes
    if (hasUnsavedChanges) {
      await saveContent()
    }

    router.push(`/dashboard/projects/${page?.project_id}`)
  }

  // Warn user if they try to leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    // Mark as changed when formatting is applied
    setHasUnsavedChanges(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Page not found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-100">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Project</span>
          </button>
          <div className="flex items-center gap-4 text-sm">
            {saving ? (
              <span className="text-blue-600">Saving...</span>
            ) : hasUnsavedChanges ? (
              <span className="text-orange-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                </svg>
                Unsaved changes
              </span>
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
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
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
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button
            onClick={() => saveContent()}
            disabled={saving || !hasUnsavedChanges}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Save now"
          >
            Save
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="flex justify-center py-2 sm:py-8 px-2 sm:px-6 pb-24 sm:pb-8">
          <div className="bg-white sm:shadow-lg sm:rounded-lg w-full max-w-4xl min-h-[500px] sm:min-h-[700px]">
            <div className="p-4 sm:p-12">
              <h1 className="text-xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-6">{page.name}</h1>
              <div
                ref={setEditorRef}
                contentEditable
                onInput={handleContentChange}
                className="prose prose-sm sm:prose-lg max-w-none min-h-[400px] sm:min-h-[500px] focus:outline-none text-gray-900"
                style={{ color: '#111827', lineHeight: '1.7' }}
                suppressContentEditableWarning
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
