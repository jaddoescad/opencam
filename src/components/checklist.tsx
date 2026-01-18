'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import type { Checklist, ChecklistItem, ChecklistItemPhoto } from '@/types/database'

interface ChecklistListProps {
  checklists: Checklist[]
  projectId: string
  onChecklistsChange: () => void
}

export function ChecklistList({ checklists, projectId, onChecklistsChange }: ChecklistListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('checklists')
      .insert({
        project_id: projectId,
        title,
        created_by: user.id,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setTitle('')
    setShowCreateModal(false)
    onChecklistsChange()
    setLoading(false)
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!confirm('Are you sure you want to delete this checklist?')) return

    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', checklistId)

    if (!error) {
      onChecklistsChange()
    }
  }

  if (selectedChecklist) {
    return (
      <ChecklistDetailView
        checklist={selectedChecklist}
        onBack={() => setSelectedChecklist(null)}
        onDelete={() => {
          handleDeleteChecklist(selectedChecklist.id)
          setSelectedChecklist(null)
        }}
        onChecklistChange={onChecklistsChange}
      />
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Checklists</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Checklist
        </button>
      </div>

      {checklists.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-lg font-medium">No checklists yet</p>
          <p className="mt-1">Create a checklist to track tasks</p>
        </div>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              onClick={() => setSelectedChecklist(checklist)}
              onDelete={() => handleDeleteChecklist(checklist.id)}
            />
          ))}
        </div>
      )}

      {/* Create Checklist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">New Checklist</h2>

              <form onSubmit={handleCreateChecklist}>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                    placeholder="e.g., Site Inspection Checklist"
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
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Creating...' : 'Create'}
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

interface ChecklistCardProps {
  checklist: Checklist
  onClick: () => void
  onDelete: () => void
}

function ChecklistCard({ checklist, onClick, onDelete }: ChecklistCardProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchItems()
  }, [checklist.id])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklist.id)
      .order('position', { ascending: true })

    if (data) setItems(data)
  }

  const completedCount = items.filter((i) => i.is_completed).length
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  return (
    <div
      className="bg-white rounded-lg shadow-sm overflow-hidden hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{checklist.title}</h4>
            <p className="text-sm text-gray-500">
              {completedCount}/{items.length} completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-gray-400 hover:text-red-500 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChecklistDetailViewProps {
  checklist: Checklist
  onBack: () => void
  onDelete: () => void
  onChecklistChange: () => void
}

function ChecklistDetailView({ checklist, onBack, onDelete, onChecklistChange }: ChecklistDetailViewProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [hideCompleted, setHideCompleted] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [showSectionMenu, setShowSectionMenu] = useState<string | null>(null)
  const [showChecklistMenu, setShowChecklistMenu] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const supabase = createClient()

  // Close menus when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setShowSectionMenu(null)
      setShowChecklistMenu(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [checklist.id])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklist.id)
      .order('category', { ascending: true })
      .order('position', { ascending: true })

    if (data) {
      setItems(data)
      const dates = data.map(item => new Date(item.created_at))
      if (dates.length > 0) {
        setLastUpdated(new Date(Math.max(...dates.map(d => d.getTime()))))
      }
    }
  }

  const addField = async (category: string) => {
    const categoryItems = items.filter(i => i.category === category)
    const position = categoryItems.length

    const { error } = await supabase
      .from('checklist_items')
      .insert({
        checklist_id: checklist.id,
        content: 'Untitled Field',
        category: category,
        position,
        field_type: 'checkbox',
        photos_required: false,
      })

    if (!error) {
      fetchItems()
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

    const { error } = await supabase
      .from('checklist_items')
      .insert({
        checklist_id: checklist.id,
        content: 'New Field',
        category: sectionName,
        position: 0,
      })

    if (!error) {
      fetchItems()
      setEditingSection(sectionName)
    }
  }

  const renameSection = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) {
      setEditingSection(null)
      return
    }

    const sectionItems = items.filter(i => i.category === oldName)
    for (const item of sectionItems) {
      await supabase
        .from('checklist_items')
        .update({ category: newName.trim() })
        .eq('id', item.id)
    }

    setEditingSection(null)
    fetchItems()
  }

  const deleteSection = async (sectionName: string) => {
    if (!confirm(`Delete section "${sectionName}" and all its fields?`)) return

    const sectionItems = items.filter(i => i.category === sectionName)
    for (const item of sectionItems) {
      await supabase
        .from('checklist_items')
        .delete()
        .eq('id', item.id)
    }

    fetchItems()
  }

  const handleToggleItem = async (item: ChecklistItem) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('checklist_items')
      .update({
        is_completed: !item.is_completed,
        completed_by: !item.is_completed ? user?.id : null,
        completed_at: !item.is_completed ? new Date().toISOString() : null,
      })
      .eq('id', item.id)

    if (!error) {
      fetchItems()
    }
  }

  const handleUpdateItem = async (itemId: string, updates: Partial<ChecklistItem>) => {
    await supabase
      .from('checklist_items')
      .update(updates)
      .eq('id', itemId)

    fetchItems()
  }

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)

    if (!error) {
      fetchItems()
    }
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
  }, {} as Record<string, ChecklistItem[]>)

  // Filter items based on toggles
  const filterItems = (itemList: ChecklistItem[]) => {
    return itemList.filter(item => {
      if (hideCompleted && item.is_completed) return false
      return true
    })
  }

  const completedCount = items.filter((i) => i.is_completed).length
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  const formatDate = (date: Date) => {
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

  return (
    <div className="fixed inset-0 lg:left-64 flex flex-col bg-gray-100 z-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-gray-600">
          <button
            onClick={onBack}
            className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span>Projects</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Title and Progress Header */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Progress Circle */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke={progress === 100 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-900">{progress}%</span>
                </div>
              </div>

              {/* Title and Info */}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">{checklist.title}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {completedCount}/{items.length} fields completed
                  {lastUpdated && ` • Last updated ${formatDate(lastUpdated)}`}
                </p>
              </div>

              {/* Menu Button */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowChecklistMenu(!showChecklistMenu)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
                {showChecklistMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setEditMode(!editMode)
                        setShowChecklistMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      {editMode ? 'Exit Edit Mode' : 'Edit Checklist'}
                    </button>
                    <button
                      onClick={() => {
                        onDelete()
                        setShowChecklistMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                    >
                      Delete Checklist
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Filters */}
            <div className="flex items-center gap-6 mt-4">
              <button
                onClick={() => setHideCompleted(!hideCompleted)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center ${hideCompleted ? 'bg-gray-200' : 'bg-gray-100'}`}>
                  {hideCompleted && (
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700">Hide Completed Fields</span>
              </button>
            </div>

            {/* Add Field Button (top level) */}
            {editMode && (
              <button
                onClick={() => {
                  if (sections.length > 0) {
                    addField(sections[0])
                  } else {
                    addSection()
                  }
                }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium cursor-pointer mt-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                </svg>
                Add Field
              </button>
            )}
          </div>

          {/* Sections */}
          {sections.map((section) => {
            const sectionItems = itemsBySection[section] || []
            const filteredSectionItems = filterItems(sectionItems)
            if (filteredSectionItems.length === 0 && hideCompleted) return null

            const isCollapsed = collapsedSections.has(section)

            return (
              <div key={section} className="border-t border-gray-200">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSection(section)}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
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
                          className="text-lg font-semibold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-gray-900">
                          {section}
                        </span>
                      )}
                    </div>

                    {/* Section actions - only in edit mode */}
                    {editMode && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => addField(section)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                          title="Add field"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
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
                    )}
                  </div>

                  {/* Section Items */}
                  {!isCollapsed && (
                    <div className="mt-3 space-y-2">
                      {filteredSectionItems.map((item) => (
                        <ChecklistFieldItem
                          key={item.id}
                          item={item}
                          editMode={editMode}
                          onToggle={() => handleToggleItem(item)}
                          onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                          onDelete={() => handleDeleteItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* New Section Button - only in edit mode */}
          {editMode && (
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
          )}

          {items.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="font-medium">No fields yet</p>
              <p className="text-sm mt-1">Click &quot;Add Field&quot; to create your first checklist item</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

interface ChecklistFieldItemProps {
  item: ChecklistItem
  editMode: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<ChecklistItem>) => void
  onDelete: () => void
}

function ChecklistFieldItem({ item, editMode, onToggle, onUpdate, onDelete }: ChecklistFieldItemProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [content, setContent] = useState(item.content)
  const [showEditOptions, setShowEditOptions] = useState(false)
  const [photos, setPhotos] = useState<ChecklistItemPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPhotos()
  }, [item.id])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedPhoto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null)
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = photos.findIndex(p => p.id === selectedPhoto)
        const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1
        setSelectedPhoto(photos[prevIndex].id)
      } else if (e.key === 'ArrowRight') {
        const currentIndex = photos.findIndex(p => p.id === selectedPhoto)
        const nextIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1
        setSelectedPhoto(photos[nextIndex].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhoto, photos])

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from('checklist_item_photos')
      .select('*')
      .eq('checklist_item_id', item.id)
      .order('created_at', { ascending: false })

    if (data) setPhotos(data)
  }

  const handleSave = () => {
    if (content.trim() && content !== item.content) {
      onUpdate({ content: content.trim() })
    }
    setEditingTitle(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      return
    }

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${item.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file)

      if (!uploadError) {
        await supabase.from('checklist_item_photos').insert({
          checklist_item_id: item.id,
          uploaded_by: user.id,
          storage_path: fileName,
        })
      }
    }

    await fetchPhotos()
    setUploading(false)
    e.target.value = ''
  }

  const handleDeletePhoto = async (photo: ChecklistItemPhoto) => {
    if (!confirm('Delete this photo?')) return

    await supabase.storage.from('photos').remove([photo.storage_path])
    await supabase.from('checklist_item_photos').delete().eq('id', photo.id)
    await fetchPhotos()
    setSelectedPhoto(null)
  }

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  // Check if item can be completed
  const canComplete = () => {
    // If already completed, allow unchecking
    if (item.is_completed) return true
    // Check if photos required but none uploaded
    if (item.photos_required && photos.length === 0) return false
    // Check if text required but no response
    if (item.field_type === 'text' && !item.response) return false
    return true
  }

  const handleToggle = () => {
    if (!canComplete()) return
    onToggle()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        {/* Completion Checkbox */}
        <button
          onClick={handleToggle}
          disabled={!canComplete()}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            item.is_completed
              ? 'bg-green-500 border-green-500 text-white cursor-pointer'
              : canComplete()
                ? 'border-gray-300 hover:border-gray-400 cursor-pointer'
                : 'border-gray-200 cursor-not-allowed opacity-50'
          }`}
          title={!canComplete() ? 'Complete required fields first' : undefined}
        >
          {item.is_completed && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          {/* Field Title */}
          {editMode && editingTitle ? (
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setContent(item.content)
                  setEditingTitle(false)
                }
              }}
              autoFocus
              className="text-gray-900 outline-none border-b-2 border-blue-500 w-full"
            />
          ) : (
            <span
              onClick={() => editMode && setEditingTitle(true)}
              className={`${item.is_completed ? 'line-through text-gray-400' : 'text-gray-900'} ${editMode ? 'cursor-pointer hover:text-blue-600' : ''}`}
            >
              {item.content}
            </span>
          )}

          {/* Notes display */}
          {item.notes && (
            <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
          )}

          {/* Text Response - show button or response */}
          {item.field_type === 'text' && (
            <div className="mt-2">
              {item.response ? (
                <div
                  onClick={() => router.push(`/dashboard/checklist-response/${item.id}`)}
                  className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                >
                  <p className="text-sm text-gray-700">{item.response}</p>
                  <p className="text-xs text-blue-600 mt-1">Tap to edit</p>
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/dashboard/checklist-response/${item.id}`)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Response
                </button>
              )}
            </div>
          )}

          {/* Photos - always visible */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative w-20 h-20 rounded-md overflow-hidden cursor-pointer group/photo"
                  onClick={() => setSelectedPhoto(photo.id)}
                >
                  <Image
                    src={getPhotoUrl(photo.storage_path)}
                    alt="Checklist item photo"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePhoto(photo)
                    }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Photos Required Indicator */}
          {item.photos_required && photos.length === 0 && (
            <div className="mt-2 flex items-center gap-1 text-sm text-orange-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Photo required
            </div>
          )}

          {/* Upload Photos Button - always visible */}
          <div className="mt-2">
            <label className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading}
              />
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {uploading ? 'Uploading...' : 'Add Photos'}
            </label>
          </div>

          {/* Edit mode only options */}
          {editMode && (
            <>
              {/* Edit Options Toggle */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => setShowEditOptions(!showEditOptions)}
                  className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  {showEditOptions ? 'Hide options' : 'More options...'}
                </button>
                <button
                  onClick={onDelete}
                  className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Delete
                </button>
              </div>

              {/* Expanded Edit Options */}
              {showEditOptions && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Notes/Instructions</label>
                    <input
                      type="text"
                      defaultValue={item.notes || ''}
                      onBlur={(e) => onUpdate({ notes: e.target.value || null })}
                      placeholder="Add notes or instructions..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.field_type === 'text'}
                      onChange={(e) => onUpdate({ field_type: e.target.checked ? 'text' : 'checkbox' })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    Requires Text Response
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.photos_required || false}
                      onChange={(e) => onUpdate({ photos_required: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    Photos Required
                  </label>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Left Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const currentIndex = photos.findIndex(p => p.id === selectedPhoto)
                const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1
                setSelectedPhoto(photos[prevIndex].id)
              }}
              className="absolute left-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white cursor-pointer z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-4xl max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getPhotoUrl(photos.find(p => p.id === selectedPhoto)?.storage_path || '')}
              alt="Checklist item photo"
              width={1200}
              height={800}
              className="object-contain max-h-[85vh]"
            />
            {/* Photo counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {photos.findIndex(p => p.id === selectedPhoto) + 1} / {photos.length}
              </div>
            )}
          </div>

          {/* Right Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const currentIndex = photos.findIndex(p => p.id === selectedPhoto)
                const nextIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1
                setSelectedPhoto(photos[nextIndex].id)
              }}
              className="absolute right-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white cursor-pointer z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
