'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PhotoGrid } from '@/components/photo-grid'
import { PhotoUpload } from '@/components/photo-upload'
import { MemberList } from '@/components/member-list'
import { ChecklistList } from '@/components/checklist'
import { ProjectPagesList } from '@/components/project-pages-list'
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
  const router = useRouter()
  const supabase = createClient()

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

  const handleArchiveProject = async () => {
    if (!project) return

    const { error } = await supabase
      .from('projects')
      .update({ is_archived: !project.is_archived })
      .eq('id', id)

    if (!error) {
      setProject({ ...project, is_archived: !project.is_archived })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
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
    <div className="p-6">
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {formatAddress() && (
              <p className="text-gray-600 mt-1 underline decoration-gray-400 underline-offset-2">
                {formatAddress()}
              </p>
            )}
            <button className="mt-2 text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Add Labels
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleArchiveProject}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {project.is_archived ? 'Unarchive' : 'Archive'}
            </button>
            {activeTab === 'photos' && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Photos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
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
    </div>
  )
}
