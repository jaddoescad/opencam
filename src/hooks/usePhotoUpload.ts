'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStorage } from '@/lib/storage'

interface UploadProgress {
  current: number
  total: number
}

interface UsePhotoUploadResult {
  uploading: boolean
  progress: UploadProgress | null
  error: string | null
  uploadFiles: (files: File[], projectId: string) => Promise<void>
  clearError: () => void
}

export function usePhotoUpload(onUploadComplete?: () => void): UsePhotoUploadResult {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadFiles = useCallback(async (files: File[], projectId: string) => {
    if (files.length === 0 || !projectId) return

    setUploading(true)
    setError(null)
    setProgress({ current: 0, total: files.length })

    try {
      const supabase = createClient()
      const storage = getStorage()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to upload photos')
        setUploading(false)
        setProgress(null)
        return
      }

      let uploaded = 0

      for (const file of files) {
        const storagePath = storage.generatePath(projectId, file.name)

        const { error: uploadError } = await storage.upload('photos', storagePath, file)

        if (uploadError) {
          setError(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        const { error: insertError } = await supabase
          .from('photos')
          .insert({
            project_id: projectId,
            uploaded_by: user.id,
            storage_path: storagePath,
          })

        if (insertError) {
          setError(`Failed to save photo record: ${insertError.message}`)
          continue
        }

        uploaded++
        setProgress({ current: uploaded, total: files.length })
      }

      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos')
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }, [onUploadComplete])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    uploading,
    progress,
    error,
    uploadFiles,
    clearError,
  }
}
