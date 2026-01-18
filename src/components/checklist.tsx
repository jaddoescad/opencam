'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CreateChecklistModal } from './create-checklist-modal'
import type { Checklist, ChecklistItem } from '@/types/database'

interface ChecklistListProps {
  checklists: Checklist[]
  projectId: string
  onChecklistsChange: () => void
}

export function ChecklistList({ checklists, projectId, onChecklistsChange }: ChecklistListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
              onClick={() => router.push(`/dashboard/checklist/${checklist.id}`)}
              onDelete={() => handleDeleteChecklist(checklist.id)}
            />
          ))}
        </div>
      )}

      <CreateChecklistModal
        isOpen={showCreateModal}
        projectId={projectId}
        onClose={() => setShowCreateModal(false)}
        onCreated={onChecklistsChange}
      />
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
