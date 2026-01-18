'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project, Photo, ProjectShare } from '@/types/database'

interface SharePageProps {
  params: Promise<{ token: string }>
}

export default function SharePage({ params }: SharePageProps) {
  const { token } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchSharedGallery()
  }, [token])

  const fetchSharedGallery = async () => {
    // First, get the share record
    const { data: share, error: shareError } = await supabase
      .from('project_shares')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (shareError || !share) {
      setError('This share link is invalid or has expired.')
      setLoading(false)
      return
    }

    // Get the project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', share.project_id)
      .single()

    if (projectError || !projectData) {
      setError('Project not found.')
      setLoading(false)
      return
    }

    setProject(projectData)

    // Get the photos
    const { data: photosData } = await supabase
      .from('photos')
      .select('*')
      .eq('project_id', share.project_id)
      .order('created_at', { ascending: false })

    if (photosData) {
      setPhotos(photosData)
    }

    setLoading(false)
  }

  const getPhotoUrl = (storagePath: string) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${storagePath}`
  }

  const formatAddress = () => {
    if (!project) return null
    if (project.address_line1) {
      const parts = []
      if (project.address_line1) parts.push(project.address_line1)

      const cityStateParts = []
      if (project.city) cityStateParts.push(project.city)
      if (project.state) cityStateParts.push(project.state)
      if (project.postal_code) cityStateParts.push(project.postal_code)

      if (cityStateParts.length > 0) {
        parts.push(cityStateParts.join(', '))
      }

      return parts.join(' • ')
    }
    return project.address
  }

  const handlePrevPhoto = () => {
    if (!selectedPhoto) return
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
    if (currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1])
    }
  }

  const handleNextPhoto = () => {
    if (!selectedPhoto) return
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
    if (currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading gallery...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{project?.name}</h1>
              {formatAddress() && (
                <p className="text-sm text-gray-500 truncate">{formatAddress()}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        </div>

        {photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">No photos in this gallery yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={getPhotoUrl(photo.storage_path)}
                  alt={photo.caption || 'Project photo'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {photos.findIndex(p => p.id === selectedPhoto.id) > 0 && (
            <button
              onClick={handlePrevPhoto}
              className="absolute left-4 p-2 text-white/80 hover:text-white z-10"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next button */}
          {photos.findIndex(p => p.id === selectedPhoto.id) < photos.length - 1 && (
            <button
              onClick={handleNextPhoto}
              className="absolute right-4 p-2 text-white/80 hover:text-white z-10"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <img
            src={getPhotoUrl(selectedPhoto.storage_path)}
            alt={selectedPhoto.caption || 'Project photo'}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {photos.findIndex(p => p.id === selectedPhoto.id) + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  )
}
