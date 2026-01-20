'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStorage } from '@/lib/storage'
import { dataUrlToBlob } from '@/lib/annotation/fabric-helpers'
import type { PhotoAnnotation } from '@/types/database'

interface UndoRedoState {
  past: Record<string, unknown>[]
  present: Record<string, unknown> | null
  future: Record<string, unknown>[]
}

interface UsePhotoAnnotationResult {
  annotation: PhotoAnnotation | null
  loading: boolean
  saving: boolean
  error: string | null
  undoRedoState: UndoRedoState
  loadAnnotation: (photoId: string) => Promise<PhotoAnnotation | null>
  saveAnnotation: (
    photoId: string,
    projectId: string,
    annotationData: Record<string, unknown>,
    flattenedDataUrl: string
  ) => Promise<PhotoAnnotation | null>
  deleteAnnotation: (annotationId: string) => Promise<boolean>
  pushToUndoStack: (state: Record<string, unknown>) => void
  undo: () => Record<string, unknown> | null
  redo: () => Record<string, unknown> | null
  clearHistory: () => void
}

export function usePhotoAnnotation(): UsePhotoAnnotationResult {
  const [annotation, setAnnotation] = useState<PhotoAnnotation | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const undoRedoRef = useRef<UndoRedoState>({
    past: [],
    present: null,
    future: [],
  })
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>(undoRedoRef.current)

  const loadAnnotation = useCallback(async (photoId: string): Promise<PhotoAnnotation | null> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('photo_annotations')
        .select('*')
        .eq('photo_id', photoId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        setError(fetchError.message)
        return null
      }

      setAnnotation(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load annotation')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const saveAnnotation = useCallback(async (
    photoId: string,
    projectId: string,
    annotationData: Record<string, unknown>,
    flattenedDataUrl: string
  ): Promise<PhotoAnnotation | null> => {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const storage = getStorage()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to save annotations')
        return null
      }

      // Generate unique path for flattened image
      const uuid = crypto.randomUUID()
      const flattenedPath = `${projectId}/annotated/${uuid}.png`

      // Convert data URL to blob and then to File for upload
      const blob = dataUrlToBlob(flattenedDataUrl)
      const file = new File([blob], 'annotated.png', { type: 'image/png' })
      const { error: uploadError } = await storage.upload('photos', flattenedPath, file)

      if (uploadError) {
        setError(`Failed to upload annotated image: ${uploadError.message}`)
        return null
      }

      // Check if annotation already exists for this photo
      const { data: existing } = await supabase
        .from('photo_annotations')
        .select('id, flattened_path')
        .eq('photo_id', photoId)
        .single()

      let result: PhotoAnnotation | null = null

      if (existing) {
        // Delete old flattened image if exists
        if (existing.flattened_path) {
          await storage.remove('photos', [existing.flattened_path])
        }

        // Update existing annotation
        const { data, error: updateError } = await supabase
          .from('photo_annotations')
          .update({
            annotation_data: annotationData,
            flattened_path: flattenedPath,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) {
          setError(`Failed to update annotation: ${updateError.message}`)
          return null
        }

        result = data
      } else {
        // Insert new annotation
        const { data, error: insertError } = await supabase
          .from('photo_annotations')
          .insert({
            photo_id: photoId,
            annotation_data: annotationData,
            flattened_path: flattenedPath,
            created_by: user.id,
          })
          .select()
          .single()

        if (insertError) {
          setError(`Failed to save annotation: ${insertError.message}`)
          return null
        }

        result = data
      }

      setAnnotation(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save annotation')
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const deleteAnnotation = useCallback(async (annotationId: string): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const storage = getStorage()

      // Get the annotation to find the flattened path
      const { data: existing } = await supabase
        .from('photo_annotations')
        .select('flattened_path')
        .eq('id', annotationId)
        .single()

      if (existing?.flattened_path) {
        await storage.remove('photos', [existing.flattened_path])
      }

      const { error: deleteError } = await supabase
        .from('photo_annotations')
        .delete()
        .eq('id', annotationId)

      if (deleteError) {
        setError(`Failed to delete annotation: ${deleteError.message}`)
        return false
      }

      setAnnotation(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete annotation')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const pushToUndoStack = useCallback((state: Record<string, unknown>) => {
    undoRedoRef.current = {
      past: undoRedoRef.current.present
        ? [...undoRedoRef.current.past, undoRedoRef.current.present]
        : undoRedoRef.current.past,
      present: state,
      future: [],
    }
    setUndoRedoState({ ...undoRedoRef.current })
  }, [])

  const undo = useCallback((): Record<string, unknown> | null => {
    const { past, present, future } = undoRedoRef.current

    if (past.length === 0) return null

    const previous = past[past.length - 1]
    const newPast = past.slice(0, past.length - 1)

    undoRedoRef.current = {
      past: newPast,
      present: previous,
      future: present ? [present, ...future] : future,
    }
    setUndoRedoState({ ...undoRedoRef.current })

    return previous
  }, [])

  const redo = useCallback((): Record<string, unknown> | null => {
    const { past, present, future } = undoRedoRef.current

    if (future.length === 0) return null

    const next = future[0]
    const newFuture = future.slice(1)

    undoRedoRef.current = {
      past: present ? [...past, present] : past,
      present: next,
      future: newFuture,
    }
    setUndoRedoState({ ...undoRedoRef.current })

    return next
  }, [])

  const clearHistory = useCallback(() => {
    undoRedoRef.current = {
      past: [],
      present: null,
      future: [],
    }
    setUndoRedoState({ ...undoRedoRef.current })
  }, [])

  return {
    annotation,
    loading,
    saving,
    error,
    undoRedoState,
    loadAnnotation,
    saveAnnotation,
    deleteAnnotation,
    pushToUndoStack,
    undo,
    redo,
    clearHistory,
  }
}
