'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProjectPage } from '@/types/database'

interface ProjectPageEditorProps {
  params: Promise<{ id: string }>
}

export default function ProjectPageEditor({ params }: ProjectPageEditorProps) {
  const { id } = use(params)
  const [page, setPage] = useState<ProjectPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPage()
  }, [id])

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
    setLoading(false)

    // Set initial content
    setTimeout(() => {
      if (editorRef.current && data.content) {
        editorRef.current.innerHTML = data.content
      }
    }, 0)
  }

  const handleContentChange = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (editorRef.current && page) {
        setSaving(true)
        await supabase
          .from('project_pages')
          .update({ content: editorRef.current.innerHTML })
          .eq('id', page.id)
        setSaving(false)
      }
    }, 1000)
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
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
    <div className="bg-gray-100 pb-36 sm:pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/dashboard/projects/${page.project_id}`)}
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
            <h1 className="text-4xl font-bold text-gray-900 mb-6">{page.name}</h1>
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
