'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePhotoAnnotation } from '@/hooks'
import { getPhotoUrl } from '@/lib/utils'
import { loadAnnotationsFromJson } from '@/lib/annotation/fabric-helpers'
import { AnnotationCanvas, type AnnotationCanvasHandle } from './annotation-canvas'
import { AnnotationToolbar } from './annotation-toolbar'
import type { ToolMode, AnnotationColor } from '@/lib/annotation/fabric-helpers'
import type { PhotoWithUploader } from '@/types/database'

interface PhotoAnnotationEditorProps {
  photo: PhotoWithUploader
  projectId: string
  onClose: () => void
  onSaved: () => void
}

export function PhotoAnnotationEditor({
  photo,
  projectId,
  onClose,
  onSaved,
}: PhotoAnnotationEditorProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('arrow')
  const [strokeColor, setStrokeColor] = useState<AnnotationColor>('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [existingAnnotation, setExistingAnnotation] = useState<Record<string, unknown> | null>(
    null
  )
  const [initialized, setInitialized] = useState(false)

  const canvasRef = useRef<AnnotationCanvasHandle>(null)

  const {
    loading,
    saving,
    error,
    undoRedoState,
    loadAnnotation,
    saveAnnotation,
    pushToUndoStack,
    undo,
    redo,
    clearHistory,
  } = usePhotoAnnotation()

  // Load existing annotation on mount
  useEffect(() => {
    const load = async () => {
      const annotation = await loadAnnotation(photo.id)
      if (annotation?.annotation_data) {
        setExistingAnnotation(annotation.annotation_data)
      }
      setInitialized(true)
    }
    load()
  }, [photo.id, loadAnnotation])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Ctrl+Z to undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }

      // Ctrl+Shift+Z or Ctrl+Y to redo
      if (
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'y' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault()
        handleRedo()
        return
      }

      // Delete or Backspace to delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        canvasRef.current?.deleteSelected()
        return
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') {
        setToolMode('select')
      } else if (e.key === 'a' || e.key === 'A') {
        setToolMode('arrow')
      } else if (e.key === 'f' || e.key === 'F') {
        setToolMode('freehand')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleStateChange = useCallback(
    (state: Record<string, unknown>) => {
      pushToUndoStack(state)
    },
    [pushToUndoStack]
  )

  const handleUndo = useCallback(async () => {
    const previousState = undo()
    if (previousState && canvasRef.current) {
      const canvas = canvasRef.current.getCanvas()
      if (canvas) {
        const fabric = await import('fabric')
        await loadAnnotationsFromJson(canvas, previousState, fabric)
      }
    }
  }, [undo])

  const handleRedo = useCallback(async () => {
    const nextState = redo()
    if (nextState && canvasRef.current) {
      const canvas = canvasRef.current.getCanvas()
      if (canvas) {
        const fabric = await import('fabric')
        await loadAnnotationsFromJson(canvas, nextState, fabric)
      }
    }
  }, [redo])

  const handleClear = useCallback(() => {
    canvasRef.current?.clear()
    clearHistory()
  }, [clearHistory])

  const handleDelete = useCallback(() => {
    canvasRef.current?.deleteSelected()
  }, [])

  const handleSave = async () => {
    if (!canvasRef.current) return

    const annotationData = canvasRef.current.toJSON()
    const flattenedDataUrl = canvasRef.current.toDataURL()

    const result = await saveAnnotation(photo.id, projectId, annotationData, flattenedDataUrl)

    if (result) {
      onSaved()
      onClose()
    }
  }

  const imageUrl = getPhotoUrl(photo.storage_path)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
            title="Close (Escape)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white">Annotate Photo</h2>
        </div>

        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-400">{error}</span>}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-center p-4 border-b border-gray-700">
        <AnnotationToolbar
          toolMode={toolMode}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          canUndo={undoRedoState.past.length > 0}
          canRedo={undoRedoState.future.length > 0}
          onToolModeChange={setToolMode}
          onStrokeColorChange={setStrokeColor}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onDelete={handleDelete}
        />
      </div>

      {/* Canvas Container */}
      <div className="flex-1 min-h-0 p-4">
        {loading && !initialized ? (
          <div className="w-full h-full flex items-center justify-center text-white">
            Loading...
          </div>
        ) : (
          <AnnotationCanvas
            ref={canvasRef}
            imageUrl={imageUrl}
            toolMode={toolMode}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            existingAnnotation={existingAnnotation}
            onStateChange={handleStateChange}
          />
        )}
      </div>

      {/* Help text */}
      <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-700">
        Press <kbd className="px-1 bg-gray-700 rounded">V</kbd> for select,{' '}
        <kbd className="px-1 bg-gray-700 rounded">A</kbd> for arrow,{' '}
        <kbd className="px-1 bg-gray-700 rounded">F</kbd> for freehand |{' '}
        <kbd className="px-1 bg-gray-700 rounded">Ctrl+Z</kbd> undo,{' '}
        <kbd className="px-1 bg-gray-700 rounded">Ctrl+Shift+Z</kbd> redo |{' '}
        <kbd className="px-1 bg-gray-700 rounded">Esc</kbd> to close
      </div>
    </div>
  )
}
