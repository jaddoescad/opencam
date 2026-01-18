'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PageTemplate } from '@/types/database'

interface PageTemplatePageProps {
  params: Promise<{ id: string }>
}

export default function PageTemplatePage({ params }: PageTemplatePageProps) {
  const { id } = use(params)
  const [template, setTemplate] = useState<PageTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [editingName, setEditingName] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchTemplate()
  }, [id])

  const fetchTemplate = async () => {
    const { data, error } = await supabase
      .from('page_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setTemplate(data)
      // Set initial content after component mounts
      setTimeout(() => {
        if (editorRef.current && data.content) {
          editorRef.current.innerHTML = data.content
        }
      }, 0)
    }
    setLoading(false)
  }

  const updateTemplate = async (updates: Partial<PageTemplate>) => {
    const { error } = await supabase
      .from('page_templates')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setTemplate((prev) => prev ? { ...prev, ...updates } : prev)
      setLastSaved(new Date())
    }
  }

  const handleContentChange = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (editorRef.current) {
        updateTemplate({ content: editorRef.current.innerHTML })
      }
    }, 1000)
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const handleDuplicate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !template) return

    const { data: newTemplate, error } = await supabase
      .from('page_templates')
      .insert({
        name: `${template.name} (Copy)`,
        description: template.description,
        content: template.content,
        created_by: user.id,
      })
      .select()
      .single()

    if (!error && newTemplate) {
      router.push(`/dashboard/templates/pages/${newTemplate.id}`)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading template...</div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Template not found</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/templates" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Templates</span>
          </Link>
          <div className="flex items-center gap-4">
            {lastSaved && (
              <span className="text-green-600 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Changes Saved
              </span>
            )}
            <span className="text-sm text-gray-500">
              Last updated {new Date(template.updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}, {formatTime(new Date(template.updated_at))}
            </span>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="flex items-center gap-4">
          <select className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700">
            <option>Paragraph</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
            <option>Heading 3</option>
          </select>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => execCommand('bold')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="Bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="Italic"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M19 4h-9M14 20H5M15 4L9 20" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('underline')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="Underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('strikeThrough')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="Strikethrough"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M16 4H9a3 3 0 100 6h6a3 3 0 010 6H8M4 12h16" />
              </svg>
            </button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => execCommand('insertUnorderedList')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="Bullet List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
            <button
              onClick={() => execCommand('insertOrderedList')}
              className="p-2 hover:bg-gray-100 rounded text-gray-600"
              title="Numbered List"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
              </svg>
            </button>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <button
            onClick={() => {
              const url = prompt('Enter link URL:')
              if (url) execCommand('createLink', url)
            }}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title="Insert Link"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <div className="flex-1" />
          <button className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Page Settings
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex justify-center py-8">
        <div className="bg-white shadow-lg rounded-lg w-full max-w-4xl min-h-[800px]">
          <div className="p-12">
            {/* Title */}
            {editingName ? (
              <input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                onBlur={() => {
                  setEditingName(false)
                  updateTemplate({ name: template.name })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingName(false)
                    updateTemplate({ name: template.name })
                  }
                }}
                autoFocus
                className="text-4xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none w-full mb-4"
              />
            ) : (
              <h1
                onClick={() => setEditingName(true)}
                className="text-4xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 mb-4"
              >
                {template.name}
              </h1>
            )}

            {/* Content Editor */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              className="prose prose-lg max-w-none min-h-[600px] focus:outline-none text-gray-900"
              style={{ lineHeight: '1.8', color: '#111827' }}
              suppressContentEditableWarning
            />
          </div>
        </div>
      </div>
    </div>
  )
}
