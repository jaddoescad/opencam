import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectCard } from '@/components/project-card'
import type { Project, Photo } from '@/types/database'

// Mock environment variable
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')

const createMockProject = (overrides?: Partial<Project & { photo_count?: number; photos?: Photo[] }>): Project & { photo_count?: number; photos?: Photo[] } => ({
  id: 'test-project-id',
  name: 'Test Project',
  address: '123 Test Street',
  created_by: 'user-id',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  photo_count: 5,
  ...overrides,
})

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  it('should render project name', () => {
    const project = createMockProject({ name: 'My Construction Site' })
    render(<ProjectCard project={project} />)

    expect(screen.getByText('My Construction Site')).toBeInTheDocument()
  })

  it('should render project address when provided', () => {
    const project = createMockProject({ address: '456 Builder Ave' })
    render(<ProjectCard project={project} />)

    expect(screen.getByText('456 Builder Ave')).toBeInTheDocument()
  })

  it('should not render address section when address is null', () => {
    const project = createMockProject({ address: null })
    render(<ProjectCard project={project} />)

    expect(screen.queryByText('123 Test Street')).not.toBeInTheDocument()
  })

  it('should render photo count', () => {
    const project = createMockProject({ photo_count: 10 })
    render(<ProjectCard project={project} />)

    expect(screen.getByText('10 photos')).toBeInTheDocument()
  })

  it('should render 0 photos when photo_count is undefined', () => {
    const project = createMockProject({ photo_count: undefined })
    render(<ProjectCard project={project} />)

    expect(screen.getByText('0 photos')).toBeInTheDocument()
  })

  it('should render relative time', () => {
    const project = createMockProject({ updated_at: '2024-01-15T10:00:00Z' })
    render(<ProjectCard project={project} />)

    expect(screen.getByText('2h ago')).toBeInTheDocument()
  })

  it('should link to project details page', () => {
    const project = createMockProject({ id: 'abc-123' })
    render(<ProjectCard project={project} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard/projects/abc-123')
  })

  it('should render thumbnail when photos exist', () => {
    const project = createMockProject({
      photos: [
        {
          id: 'photo-1',
          project_id: 'test-project-id',
          uploaded_by: 'user-id',
          storage_path: 'test/photo.jpg',
          created_at: '2024-01-15T10:00:00Z',
        },
      ],
    })
    render(<ProjectCard project={project} />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('alt', project.name)
    expect(img).toHaveAttribute('src', 'https://test.supabase.co/storage/v1/object/public/photos/test/photo.jpg')
  })

  it('should render placeholder icon when no photos', () => {
    const project = createMockProject({ photos: [] })
    render(<ProjectCard project={project} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // The SVG placeholder should be rendered
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('should render placeholder when photos array is undefined', () => {
    const project = createMockProject({ photos: undefined })
    render(<ProjectCard project={project} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
