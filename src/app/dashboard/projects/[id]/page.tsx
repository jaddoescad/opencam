'use client'

import { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PhotoGrid } from '@/components/photo-grid'
import { PhotoUpload } from '@/components/photo-upload'
import { MemberList } from '@/components/member-list'
import { ChecklistList } from '@/components/checklist'
import { ProjectPagesList } from '@/components/project-pages-list'
import { useUpload } from '@/contexts/upload-context'
import type { Project, Photo, Profile, ProjectMember, Checklist, ProjectPage } from '@/types/database'

type Tab = 'photos' | 'members' | 'checklists' | 'pages'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [members, setMembers] = useState<(ProjectMember & { profile: Profile })[]>([])
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [pages, setPages] = useState<ProjectPage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('photos')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { setProjectId, setOnPhotoTaken } = useUpload()

  // Handle photo taken from mobile camera button
  const handlePhotoTaken = useCallback(async (files: FileList) => {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      return
    }

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file)

      if (!uploadError) {
        await supabase.from('photos').insert({
          project_id: id,
          uploaded_by: user.id,
          storage_path: fileName,
        })
      }
    }

    setUploading(false)
    fetchPhotos()
  }, [id, supabase])

  // Register project ID and photo handler for mobile camera button
  useEffect(() => {
    setProjectId(id)
    setOnPhotoTaken(handlePhotoTaken)
    return () => {
      setProjectId(null)
      setOnPhotoTaken(null)
    }
  }, [id, setProjectId, setOnPhotoTaken, handlePhotoTaken])

  useEffect(() => {
    fetchProject()
    fetchPhotos()
    fetchMembers()
    fetchChecklists()
    fetchPages()
  }, [id])

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching project:', error)
      router.push('/dashboard')
    } else {
      setProject(data)
    }
    setLoading(false)
  }

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (data) setPhotos(data)
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('project_members')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('project_id', id)

    if (data) setMembers(data as (ProjectMember & { profile: Profile })[])
  }

  const fetchChecklists = async () => {
    const { data } = await supabase
      .from('checklists')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (data) setChecklists(data)
  }

  const fetchPages = async () => {
    const { data } = await supabase
      .from('project_pages')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (data) setPages(data)
  }

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
    <div className="p-4 sm:p-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Projects
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{project.name}</h1>
            {formatAddress() && (
              <p className="text-gray-600 mt-1 underline decoration-gray-400 underline-offset-2 text-sm sm:text-base">
                {formatAddress()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {activeTab === 'photos' && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Photos</span>
                <span className="sm:hidden">Add</span>
              </button>
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

      {/* Tab Content */}
      {activeTab === 'photos' && (
        <PhotoGrid photos={photos} projectId={id} onPhotosChange={fetchPhotos} />
      )}
      {activeTab === 'members' && (
        <MemberList members={members} projectId={id} onMembersChange={fetchMembers} />
      )}
      {activeTab === 'checklists' && (
        <ChecklistList checklists={checklists} projectId={id} onChecklistsChange={fetchChecklists} />
      )}
      {activeTab === 'pages' && (
        <ProjectPagesList pages={pages} projectId={id} onPagesChange={fetchPages} />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <PhotoUpload
          projectId={id}
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            setShowUpload(false)
            fetchPhotos()
          }}
        />
      )}

      {/* Camera upload indicator */}
      {uploading && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Uploading...</span>
        </div>
      )}
    </div>
  )
}
