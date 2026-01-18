'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Checklist, ChecklistItem, ChecklistItemPhoto, ChecklistItemQuestion } from '@/types/database'

interface ChecklistPageProps {
  params: Promise<{ id: string }>
}

export default function ChecklistPage({ params }: ChecklistPageProps) {
  const { id } = use(params)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [hideCompleted, setHideCompleted] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchChecklist()
    fetchItems()
  }, [id])

  const fetchChecklist = async () => {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      router.push('/dashboard')
      return
    }

    setChecklist(data)
    setLoading(false)
  }

  const fetchItems = async () => {
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', id)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!checklist) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Checklist not found</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2 text-gray-600">
          <button
            onClick={() => router.push(`/dashboard/projects/${checklist.project_id}`)}
            className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Project</span>
          </button>
        </div>
      </div>

      {/* Content */}
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

              {/* Edit Button */}
              <Link
                href={`/dashboard/checklist/${id}/edit`}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
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
                      <span className="text-lg font-semibold text-gray-900">{section}</span>
                    </div>
                  </div>

                  {/* Section Items */}
                  {!isCollapsed && (
                    <div className="mt-3 space-y-2">
                      {filteredSectionItems.map((item) => (
                        <ChecklistFieldItem
                          key={item.id}
                          item={item}
                          onToggle={() => handleToggleItem(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {items.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="font-medium">No fields yet</p>
              <p className="text-sm mt-1">Click &quot;Edit&quot; to add checklist items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ChecklistFieldItemProps {
  item: ChecklistItem
  onToggle: () => void
}

function ChecklistFieldItem({ item, onToggle }: ChecklistFieldItemProps) {
  const [photos, setPhotos] = useState<ChecklistItemPhoto[]>([])
  const [questions, setQuestions] = useState<ChecklistItemQuestion[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchPhotos()
    fetchQuestions()
  }, [item.id])

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from('checklist_item_photos')
      .select('*')
      .eq('checklist_item_id', item.id)
      .order('created_at', { ascending: false })

    if (data) setPhotos(data)
  }

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('checklist_item_questions')
      .select('*')
      .eq('checklist_item_id', item.id)
      .order('position', { ascending: true })

    if (data) setQuestions(data)
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

  const handleUpdateResponse = async (questionId: string, response: string) => {
    await supabase
      .from('checklist_item_questions')
      .update({ response })
      .eq('id', questionId)

    await fetchQuestions()
  }

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('photos').getPublicUrl(path)
    return data.publicUrl
  }

  // Check if item can be completed
  const canComplete = () => {
    if (item.is_completed) return true
    if (item.photos_required && photos.length === 0) return false
    // Check if all questions have responses
    const unansweredQuestions = questions.filter(q => !q.response)
    if (unansweredQuestions.length > 0) return false
    return true
  }

  const handleToggle = () => {
    if (!canComplete()) return
    onToggle()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start gap-3">
        {/* Completion Checkbox */}
        <button
          onClick={handleToggle}
          disabled={!canComplete()}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            item.is_completed
              ? 'bg-green-500 border-green-500 text-white cursor-pointer'
              : canComplete()
                ? 'border-gray-300 hover:border-gray-400 cursor-pointer'
                : 'border-gray-300 cursor-not-allowed'
          }`}
          title={!canComplete() ? 'Complete required fields first' : undefined}
        >
          {item.is_completed && (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          {/* Item Title */}
          <span className={`font-medium ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {item.content}
          </span>

          {/* Photos Required Badge */}
          {item.photos_required && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Photos Required
              </span>
            </div>
          )}

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="mt-4 space-y-4">
              {questions.map((question) => (
                <QuestionResponseField
                  key={question.id}
                  question={question}
                  onUpdateResponse={(response) => handleUpdateResponse(question.id, response)}
                />
              ))}
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
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

          {/* Add Photos Button */}
          <div className="mt-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-md text-sm font-medium cursor-pointer border border-gray-200">
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
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={getPhotoUrl(photos.find(p => p.id === selectedPhoto)?.storage_path || '')}
              alt="Checklist item photo"
              width={1200}
              height={800}
              className="object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Question Response Field Component
interface QuestionResponseFieldProps {
  question: ChecklistItemQuestion
  onUpdateResponse: (response: string) => void
}

function QuestionResponseField({ question, onUpdateResponse }: QuestionResponseFieldProps) {
  const [localResponse, setLocalResponse] = useState(question.response || '')
  const [isFocused, setIsFocused] = useState(false)

  const handleBlur = () => {
    setIsFocused(false)
    if (localResponse !== question.response) {
      onUpdateResponse(localResponse)
    }
  }

  return (
    <div>
      {/* Question Label */}
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <span className="text-gray-700">{question.question}</span>
      </div>

      {/* Response Input */}
      <input
        type="text"
        value={localResponse}
        onChange={(e) => setLocalResponse(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder="Add Response..."
        className={`w-full px-4 py-3 border rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          isFocused ? 'border-blue-500' : 'border-gray-200'
        }`}
      />
    </div>
  )
}
