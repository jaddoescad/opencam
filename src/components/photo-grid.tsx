'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getPhotoUrl } from '@/lib/utils'
import { useKeyboardNavigation } from '@/hooks'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { PhotoWithUploader } from '@/types/database'

interface PhotoGridProps {
  photos: PhotoWithUploader[]
  projectId: string
  onPhotosChange: () => void
}

// Group photos by date
function groupPhotosByDate(photos: PhotoWithUploader[]): Map<string, PhotoWithUploader[]> {
  const groups = new Map<string, PhotoWithUploader[]>()

  photos.forEach((photo) => {
    const date = new Date(photo.created_at)
    const dateKey = date.toDateString() // e.g., "Sat Jan 17 2026"

    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(photo)
  })

  return groups
}

// Format date like "Saturday, January 17th, 2026"
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  const formatted = date.toLocaleDateString('en-US', options)

  // Add ordinal suffix (1st, 2nd, 3rd, etc.)
  const day = date.getDate()
  const suffix = getDaySuffix(day)

  return formatted.replace(/(\d+)/, `$1${suffix}`)
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

// Format time like "8:14 PM"
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function PhotoGrid({ photos, projectId, onPhotosChange }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUploader | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithUploader | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  // Keyboard navigation handlers for lightbox
  const navigateToPrevious = useCallback(() => {
    if (!selectedPhoto) return
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
    const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1
    setSelectedPhoto(photos[prevIndex])
  }, [selectedPhoto, photos])

  const navigateToNext = useCallback(() => {
    if (!selectedPhoto) return
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
    const nextIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1
    setSelectedPhoto(photos[nextIndex])
  }, [selectedPhoto, photos])

  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null)
  }, [])

  // Use custom hook for keyboard navigation
  useKeyboardNavigation(
    {
      onEscape: closeLightbox,
      onArrowLeft: navigateToPrevious,
      onArrowRight: navigateToNext,
    },
    !!selectedPhoto
  )

  const handleDeleteRequest = (photo: PhotoWithUploader) => {
    setPhotoToDelete(photo)
  }

  const handleDeleteConfirm = async () => {
    if (!photoToDelete) return

    setDeleting(true)

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('photos')
      .remove([photoToDelete.storage_path])

    if (storageError) {
      console.error('Error deleting from storage:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoToDelete.id)

    if (!dbError) {
      setSelectedPhoto(null)
      setPhotoToDelete(null)
      onPhotosChange()
    }

    setDeleting(false)
  }

  const handleDeleteCancel = () => {
    setPhotoToDelete(null)
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-xl font-semibold text-gray-900">Start taking pictures in the mobile app.</p>
        <p className="mt-2 text-gray-500">All photos and videos taken by your team will appear here, instantly.</p>
      </div>
    )
  }

  const groupedPhotos = groupPhotosByDate(photos)

  return (
    <>
      <div className="space-y-8">
        {Array.from(groupedPhotos.entries()).map(([dateKey, datePhotos]) => (
          <div key={dateKey}>
            {/* Date Header */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {formatDateHeader(dateKey)}
            </h3>

            {/* Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {datePhotos.map((photo) => (
                <div key={photo.id} className="group">
                  <div
                    className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={getPhotoUrl(photo.storage_path)}
                      alt={photo.caption || 'Project photo'}
                      className="w-full h-full object-cover"
                    />
                    {/* User avatar overlay */}
                    {photo.uploader && (
                      <div className="absolute bottom-2 left-2">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-medium shadow-lg">
                          {getInitials(photo.uploader.full_name)}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Time and uploader name */}
                  <p className="mt-2 text-sm text-gray-500">
                    {formatTime(photo.created_at)}
                    {photo.uploader?.full_name && (
                      <span> • {photo.uploader.full_name}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 cursor-pointer"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Left Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigateToPrevious()
              }}
              className="absolute left-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white cursor-pointer z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigateToNext()
              }}
              className="absolute right-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white cursor-pointer z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div
            className="max-w-4xl max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getPhotoUrl(selectedPhoto.storage_path)}
              alt={selectedPhoto.caption || 'Project photo'}
              className="max-w-full max-h-[70vh] object-contain"
            />
            <div className="mt-4 flex items-center justify-between text-white">
              <div>
                <p className="text-sm">
                  {formatTime(selectedPhoto.created_at)}
                  {selectedPhoto.uploader?.full_name && (
                    <span> • {selectedPhoto.uploader.full_name}</span>
                  )}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {formatDateHeader(new Date(selectedPhoto.created_at).toDateString())}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Photo counter */}
                {photos.length > 1 && (
                  <span className="text-sm opacity-75">
                    {photos.findIndex(p => p.id === selectedPhoto.id) + 1} / {photos.length}
                  </span>
                )}
                <button
                  onClick={() => handleDeleteRequest(selectedPhoto)}
                  disabled={deleting}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!photoToDelete}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  )
}
