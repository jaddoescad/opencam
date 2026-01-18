'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistItem } from '@/types/database'

interface ChecklistResponsePageProps {
  params: Promise<{ itemId: string }>
}

export default function ChecklistResponsePage({ params }: ChecklistResponsePageProps) {
  const { itemId } = use(params)
  const [item, setItem] = useState<ChecklistItem | null>(null)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchItem()
  }, [itemId])

  const fetchItem = async () => {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (error || !data) {
      router.back()
      return
    }

    setItem(data)
    setResponse(data.response || '')
    setLoading(false)
  }

  const handleSave = async () => {
    if (!item) return

    setSaving(true)

    await supabase
      .from('checklist_items')
      .update({ response: response.trim() || null })
      .eq('id', itemId)

    setSaving(false)
    router.back()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Item not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{item.content}</h1>
          {item.notes && (
            <p className="text-sm text-gray-500 mb-4">{item.notes}</p>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Response
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Enter your response..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              autoFocus
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
