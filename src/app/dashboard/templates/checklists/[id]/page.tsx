'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistTemplate, ChecklistTemplateItem } from '@/types/database'

interface ChecklistTemplatePageProps {
  params: Promise<{ id: string }>
}

export default function ChecklistTemplatePage({ params }: ChecklistTemplatePageProps) {
  const { id } = use(params)
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [items, setItems] = useState<ChecklistTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [showSectionMenu, setShowSectionMenu] = useState<string | null>(null)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [emptySections, setEmptySections] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTemplate()
  }, [id])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setShowSectionMenu(null)
      setShowTemplateMenu(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const fetchTemplate = async () => {
    const [templateRes, itemsRes] = await Promise.all([
      supabase.from('checklist_templates').select('*').eq('id', id).single(),
      supabase.from('checklist_template_items').select('*').eq('checklist_template_id', id).order('category').order('position'),
    ])

    if (templateRes.data) setTemplate(templateRes.data)
    if (itemsRes.data) setItems(itemsRes.data)
    setLoading(false)
  }

  const updateTemplate = async (updates: Partial<ChecklistTemplate>) => {
    const { error } = await supabase
      .from('checklist_templates')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setTemplate((prev) => prev ? { ...prev, ...updates } : prev)
      setLastSaved(new Date())
    }
  }

  const addField = async (category: string) => {
    const categoryItems = items.filter(i => i.category === category)
    const position = categoryItems.length

    const { data, error } = await supabase
      .from('checklist_template_items')
      .insert({
        checklist_template_id: id,
        content: 'Untitled Field',
        category: category,
        position,
        field_type: 'checkbox',
        photos_required: false,
      })
      .select()
      .single()

    if (!error && data) {
      setItems([...items, data])
      setLastSaved(new Date())
    }
  }

  const updateItem = async (itemId: string, updates: Partial<ChecklistTemplateItem>) => {
    const { error } = await supabase
      .from('checklist_template_items')
      .update(updates)
      .eq('id', itemId)

    if (!error) {
      setItems(items.map((item) => item.id === itemId ? { ...item, ...updates } : item))
      setLastSaved(new Date())
    }
  }

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('checklist_template_items')
      .delete()
      .eq('id', itemId)

    if (!error) {
      setItems(items.filter((item) => item.id !== itemId))
      setLastSaved(new Date())
    }
  }

  const addSection = async () => {
    // Generate unique section name
    const existingSections = [...new Set(items.map(i => i.category).filter(Boolean))] as string[]
    let sectionName = 'New Section'
    let counter = 1
    while (existingSections.includes(sectionName)) {
      counter++
      sectionName = `New Section ${counter}`
    }

    // Add a placeholder item to create the section
    const { data, error } = await supabase
      .from('checklist_template_items')
      .insert({
        checklist_template_id: id,
        content: 'New Field',
        category: sectionName,
        position: 0,
      })
      .select()
      .single()

    if (!error && data) {
      setItems([...items, data])
      setLastSaved(new Date())
      setEditingSection(sectionName)
    }
  }

  const renameSection = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) {
      setEditingSection(null)
      return
    }

    // Update all items in this section
    const sectionItems = items.filter(i => i.category === oldName)
    for (const item of sectionItems) {
      await supabase
        .from('checklist_template_items')
        .update({ category: newName.trim() })
        .eq('id', item.id)
    }

    setItems(items.map(item =>
      item.category === oldName ? { ...item, category: newName.trim() } : item
    ))
    setEditingSection(null)
    setLastSaved(new Date())
  }

  const deleteSection = async (sectionName: string) => {
    if (!confirm(`Delete section "${sectionName}" and all its fields?`)) return

    const sectionItems = items.filter(i => i.category === sectionName)
    for (const item of sectionItems) {
      await supabase
        .from('checklist_template_items')
        .delete()
        .eq('id', item.id)
    }

    setItems(items.filter(item => item.category !== sectionName))
    setLastSaved(new Date())
  }

  const handleDuplicate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !template) return

    const { data: newTemplate, error: templateError } = await supabase
      .from('checklist_templates')
      .insert({
        name: `${template.name} (Copy)`,
        description: template.description,
        created_by: user.id,
      })
      .select()
      .single()

    if (templateError || !newTemplate) return

    if (items.length > 0) {
      const newItems = items.map((item) => ({
        checklist_template_id: newTemplate.id,
        content: item.content,
        category: item.category,
        position: item.position,
      }))

      await supabase.from('checklist_template_items').insert(newItems)
    }

    router.push(`/dashboard/templates/checklists/${newTemplate.id}`)
  }

  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section)
    } else {
      newCollapsed.add(section)
    }
    setCollapsedSections(newCollapsed)
  }

  // Get unique sections (categories)
  const sections = [...new Set(items.map(i => i.category).filter(Boolean))] as string[]

  // Group items by section
  const itemsBySection = items.reduce((acc, item) => {
    const section = item.category || '__uncategorized__'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {} as Record<string, ChecklistTemplateItem[]>)

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-US', {
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
    <div className="min-h-screen bg-gray-100">
      {/* Top Banner */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>You&apos;re editing a template. If you want to keep this version, make a duplicate first. Any previously created Checklists will not be changed.</span>
          </div>
          <button
            onClick={handleDuplicate}
            className="px-4 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 cursor-pointer"
          >
            Duplicate Template
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard/templates" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Templates</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {lastSaved && (
              <span className="text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Changes Saved
              </span>
            )}
            <span className="text-gray-500">
              Last Updated {formatDateTime(new Date(template.updated_at))}
            </span>
          </div>
        </div>

        {/* Template Card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Template Header */}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Title */}
                  <div className="flex items-center gap-2">
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
                        className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none"
                      />
                    ) : (
                      <>
                        <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
                        <button
                          onClick={() => setEditingName(true)}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex items-center gap-2 mt-1">
                    {editingDescription ? (
                      <input
                        type="text"
                        value={template.description || ''}
                        onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                        onBlur={() => {
                          setEditingDescription(false)
                          updateTemplate({ description: template.description })
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingDescription(false)
                            updateTemplate({ description: template.description })
                          }
                        }}
                        autoFocus
                        placeholder="Enter Template Description"
                        className="text-gray-500 border-b-2 border-blue-500 outline-none"
                      />
                    ) : (
                      <>
                        <p className="text-gray-500">{template.description || 'Enter Template Description'}</p>
                        <button
                          onClick={() => setEditingDescription(true)}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mt-2">{items.length} Fields</p>
                </div>

                {/* Template Menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTemplateMenu(!showTemplateMenu)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                  {showTemplateMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={handleDuplicate}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        Duplicate Template
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Sections */}
            {sections.map((section) => (
              <div key={section} className="border-t border-gray-200">
                <div className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSection(section)}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${collapsedSections.has(section) ? '' : 'rotate-90'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {editingSection === section ? (
                        <input
                          type="text"
                          defaultValue={section}
                          autoFocus
                          onBlur={(e) => renameSection(section, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameSection(section, e.currentTarget.value)
                            } else if (e.key === 'Escape') {
                              setEditingSection(null)
                            }
                          }}
                          className="text-lg font-medium text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingSection(section)}
                          className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        >
                          {section}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Section Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowSectionMenu(showSectionMenu === section ? null : section)
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>
                        {showSectionMenu === section && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => {
                                setEditingSection(section)
                                setShowSectionMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              Rename Section
                            </button>
                            <button
                              onClick={() => {
                                deleteSection(section)
                                setShowSectionMenu(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                            >
                              Delete Section
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section Items */}
                  {!collapsedSections.has(section) && (
                    <div className="mt-4 space-y-2 pl-7">
                      {/* Add Field in Section */}
                      <button
                        onClick={() => addField(section)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                        </svg>
                        Add Field
                      </button>

                      {itemsBySection[section]?.map((item) => (
                        <FieldItem
                          key={item.id}
                          item={item}
                          onUpdate={(updates) => updateItem(item.id, updates)}
                          onDelete={() => deleteItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* New Section Button */}
            <div className="p-4">
              <button
                onClick={addSection}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                </svg>
                New Section
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FieldItemProps {
  item: ChecklistTemplateItem
  onUpdate: (updates: Partial<ChecklistTemplateItem>) => void
  onDelete: () => void
}

function FieldItem({ item, onUpdate, onDelete }: FieldItemProps) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(item.content)
  const [showNotes, setShowNotes] = useState(!!item.notes)
  const [notes, setNotes] = useState(item.notes || '')

  const handleSave = () => {
    if (content.trim() && content !== item.content) {
      onUpdate({ content: content.trim() })
    }
    setEditing(false)
  }

  const handleNotesBlur = () => {
    if (notes !== item.notes) {
      onUpdate({ notes: notes || null })
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 group">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />

          <div className="flex-1">
            {/* Field Title */}
            {editing ? (
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') {
                    setContent(item.content)
                    setEditing(false)
                  }
                }}
                autoFocus
                className="text-gray-900 outline-none border-b-2 border-blue-500 w-full"
              />
            ) : (
              <span
                onClick={() => setEditing(true)}
                className="text-gray-900 cursor-pointer hover:text-blue-600"
              >
                {item.content}
              </span>
            )}

            {/* Notes/Instructions */}
            {showNotes ? (
              <div className="mt-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes or instructions..."
                  className="w-full text-sm text-gray-600 outline-none border-b border-gray-200 focus:border-blue-500 placeholder-gray-400"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowNotes(true)}
                className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Add Notes/Instructions
              </button>
            )}

            {/* Text Response Toggle */}
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.field_type === 'text'}
                  onChange={(e) => onUpdate({ field_type: e.target.checked ? 'text' : 'checkbox' })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Requires Text Response
              </label>
            </div>

            {/* Photos Required Toggle */}
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.photos_required || false}
                  onChange={(e) => onUpdate({ photos_required: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Photos Required
              </label>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
