'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProjectShare } from '@/types/database'

interface ShareGalleryModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
}

export function ShareGalleryModal({ projectId, projectName, isOpen, onClose }: ShareGalleryModalProps) {
  const [share, setShare] = useState<ProjectShare | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchShare()
    }
  }, [isOpen, projectId])

  const fetchShare = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('project_shares')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .single()

    setShare(data)
    setLoading(false)
  }

  const createShare = async () => {
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setCreating(false)
      return
    }

    const { data, error } = await supabase
      .from('project_shares')
      .insert({
        project_id: projectId,
        created_by: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      setShare(data)
    }
    setCreating(false)
  }

  const disableShare = async () => {
    if (!share) return

    await supabase
      .from('project_shares')
      .update({ is_active: false })
      .eq('id', share.id)

    setShare(null)
  }

  const copyLink = () => {
    if (!share) return
    const link = `${window.location.origin}/share/${share.token}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getShareLink = () => {
    if (!share) return ''
    return `${window.location.origin}/share/${share.token}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Share Photo Gallery</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Create a read-only link to share the photo gallery for <span className="font-medium">{projectName}</span> with anyone.
          </p>

          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : share ? (
            <div>
              {/* Link display */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareLink()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Read-only access</p>
                    <p className="mt-1">Anyone with this link can view the photos but cannot make changes.</p>
                  </div>
                </div>
              </div>

              {/* Disable button */}
              <button
                onClick={disableShare}
                className="w-full py-2 px-4 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium text-sm"
              >
                Disable Share Link
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-6">No share link exists for this project yet.</p>
              <button
                onClick={createShare}
                disabled={creating}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
