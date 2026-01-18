'use client'

import { useState, useEffect } from 'react'
import { ProjectCard } from '@/components/project-card'
import { CreateProjectModal } from '@/components/create-project-modal'
import { useCurrentUser, useProjects, useInfiniteScroll, type FilterType } from '@/hooks'

function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const { user, role: userRole, loading: userLoading } = useCurrentUser()

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { projects, loading, loadingMore, hasMore, refetch, loadMore } = useProjects({
    filter,
    userId: user?.id ?? null,
    userRole,
    searchQuery: debouncedSearch,
  })

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    loading: loading || loadingMore,
  })

  // Check if user can create projects and see all projects (Admin/Standard only)
  const canManageProjects = userRole === 'Admin' || userRole === 'Standard'

  const handleProjectCreated = () => {
    setIsModalOpen(false)
    refetch()
  }

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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

      {userLoading || loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading more...</span>
              </div>
            </div>
          )}

          {/* End of list message */}
          {!hasMore && !loadingMore && projects.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              Showing all {projects.length} project{projects.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} className="h-1" />
        </>
      )}

      <CreateProjectModal isOpen={isModalOpen} onClose={handleProjectCreated} />
    </div>
  )
}
