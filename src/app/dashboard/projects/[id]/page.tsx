'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PhotoGrid } from '@/components/photo-grid'
import { PhotoUpload } from '@/components/photo-upload'
import { MemberList } from '@/components/member-list'
import { ChecklistList } from '@/components/checklist'
import { ProjectPagesList } from '@/components/project-pages-list'
import { EditProjectModal } from '@/components/edit-project-modal'
import { DeleteProjectModal } from '@/components/delete-project-modal'
import { ShareGalleryModal } from '@/components/share-gallery-modal'
import { useUpload } from '@/contexts/upload-context'
import { useCurrentUser, useClickOutside, useProjectData } from '@/hooks'

type Tab = 'photos' | 'members' | 'checklists' | 'pages'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState<Tab>('photos')
  const [showUpload, setShowUpload] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { setProjectId, setOnPhotosUploaded } = useUpload()

  // Use custom hooks
  const { role: userRole } = useCurrentUser()
  const {
    project,
    photos,
    members,
    checklists,
    pages,
    loading,
    error,
    refetch,
    refetchPhotos,
    refetchMembers,
    refetchChecklists,
    refetchPages,
  } = useProjectData(id)

  // Close menu when clicking outside
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  // Check if user can edit/delete (Admin or Standard only, not Restricted)
  const canEditProject = userRole === 'Admin' || userRole === 'Standard'

  // Register project ID and callback for mobile camera button
  useEffect(() => {
    setProjectId(id)
    setOnPhotosUploaded(refetchPhotos)
    return () => {
      setProjectId(null)
      setOnPhotosUploaded(null)
    }
  }, [id, refetchPhotos, setProjectId, setOnPhotosUploaded])

  // Redirect to dashboard if project not found
  useEffect(() => {
    if (error) {
      console.error('Error fetching project:', error)
      router.push('/dashboard')
    }
  }, [error, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Project not found</div>
      </div>
    )
  }

  // Format address for display
  const formatAddress = () => {
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

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Projects</span>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{project.name}</h1>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Share button - only show for Admin/Standard users */}
                {canEditProject && (
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                    title="Share gallery"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                )}
                {/* Three-dot menu - only show for Admin/Standard users */}
                {canEditProject && (
                <div className="relative flex-shrink-0" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setEditModalOpen(true)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Project
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setDeleteModalOpen(true)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
            {formatAddress() && (
              <p className="text-gray-600 mt-1 underline decoration-gray-400 underline-offset-2 text-sm sm:text-base">
                {formatAddress()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
        <nav className="flex gap-4 sm:gap-8 min-w-max">
          <button
            onClick={() => setActiveTab('photos')}
            className={`pb-4 text-sm font-medium border-b-2 cursor-pointer ${
              activeTab === 'photos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Photos ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-4 text-sm font-medium border-b-2 cursor-pointer ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={`pb-4 text-sm font-medium border-b-2 cursor-pointer ${
              activeTab === 'checklists'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Checklists ({checklists.length})
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`pb-4 text-sm font-medium border-b-2 cursor-pointer ${
              activeTab === 'pages'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pages ({pages.length})
          </button>
        </nav>
      </div>

      {/* Add Photos Button */}
      {activeTab === 'photos' && (
        <div className="mb-6">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Photos
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'photos' && (
        <PhotoGrid photos={photos} projectId={id} onPhotosChange={refetchPhotos} />
      )}
      {activeTab === 'members' && (
        <MemberList members={members} projectId={id} onMembersChange={refetchMembers} />
      )}
      {activeTab === 'checklists' && (
        <ChecklistList checklists={checklists} projectId={id} onChecklistsChange={refetchChecklists} />
      )}
      {activeTab === 'pages' && (
        <ProjectPagesList pages={pages} projectId={id} onPagesChange={refetchPages} />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <PhotoUpload
          projectId={id}
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            setShowUpload(false)
            refetchPhotos()
          }}
        />
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        project={project}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={() => {
          refetch()
        }}
      />

      {/* Delete Project Modal */}
      <DeleteProjectModal
        project={project}
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDelete={() => {
          router.push('/dashboard')
        }}
      />

      {/* Share Gallery Modal */}
      <ShareGalleryModal
        projectId={id}
        projectName={project.name}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  )
}
