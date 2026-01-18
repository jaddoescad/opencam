'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProjectCard } from '@/components/project-card'
import { CreateProjectModal } from '@/components/create-project-modal'
import type { Project, Photo } from '@/types/database'

type ProjectWithPhotos = Project & {
  photo_count?: number
  photos?: Photo[]
}

type FilterType = 'all' | 'my' | 'archived'

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClient()

  // Check if user can create projects and see all projects (Admin/Standard only)
  const canManageProjects = userRole === 'Admin' || userRole === 'Standard'

  useEffect(() => {
    fetchUserRoleAndProjects()
  }, [])

  useEffect(() => {
    if (userRole) {
      fetchProjects()
    }
  }, [filter, userRole])

  const fetchUserRoleAndProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserRole(profile.role)
    }
  }

  const fetchProjects = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // For Restricted users, only fetch projects they are members of
    if (userRole === 'Restricted') {
      // First get project IDs where user is a member
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)

      if (!memberships || memberships.length === 0) {
        setProjects([])
        setLoading(false)
        return
      }

      const projectIds = memberships.map(m => m.project_id)

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          photos (id, storage_path)
        `)
        .in('id', projectIds)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        const projectsWithCount = data.map((project) => ({
          ...project,
          photo_count: project.photos?.length || 0,
          photos: project.photos?.slice(0, 1) || [],
        }))
        setProjects(projectsWithCount)
      }
    } else {
      // Admin/Standard users see all projects with filters
      let query = supabase
        .from('projects')
        .select(`
          *,
          photos (id, storage_path)
        `)
        .order('updated_at', { ascending: false })

      if (filter === 'my') {
        query = query.eq('created_by', user.id)
      } else if (filter === 'archived') {
        query = query.eq('is_archived', true)
      } else {
        query = query.eq('is_archived', false)
      }

      const { data, error } = await query

      if (!error && data) {
        const projectsWithCount = data.map((project) => ({
          ...project,
          photo_count: project.photos?.length || 0,
          photos: project.photos?.slice(0, 1) || [],
        }))
        setProjects(projectsWithCount)
      }
    }
    setLoading(false)
  }

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {userRole === 'Restricted' ? 'My Assigned Projects' : 'Projects'}
        </h1>
        {canManageProjects && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        {/* Only show filters for Admin/Standard users */}
        {canManageProjects && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                filter === 'my'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              My Projects
            </button>
            <button
              onClick={() => setFilter('archived')}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                filter === 'archived'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Archived
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading projects...</div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-lg font-medium">No projects found</p>
          {userRole === 'Restricted' ? (
            <p className="mt-1">You haven&apos;t been assigned to any projects yet.</p>
          ) : (
            <>
              <p className="mt-1">Create a new project to get started</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first project
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
