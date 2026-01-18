import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import type { Project, Photo } from '@/types/database'

interface ProjectCardProps {
  project: Project & {
    photo_count?: number
    photos?: Photo[]
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const thumbnailUrl = project.photos?.[0]?.storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${project.photos[0].storage_path}`
    : null

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="aspect-video bg-gray-200 relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
        {project.address && (
          <p className="text-sm text-gray-500 truncate mt-1">{project.address}</p>
        )}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <span>{project.photo_count || 0} photos</span>
          <span>{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}
