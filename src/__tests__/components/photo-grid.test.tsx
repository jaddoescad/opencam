import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGrid } from '@/components/photo-grid'
import type { Photo } from '@/types/database'

// Mock environment variable
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')

// Mock Supabase client
const mockSelect = vi.fn()
const mockRemove = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            in: mockSelect,
          }),
        }
      }
      if (table === 'photos') {
        return {
          delete: () => ({
            eq: mockDelete,
          }),
        }
      }
      return {}
    }),
    storage: {
      from: () => ({
        remove: mockRemove,
      }),
    },
  }),
}))

const createMockPhoto = (overrides?: Partial<Photo>): Photo => ({
  id: 'photo-1',
  project_id: 'project-1',
  uploaded_by: 'user-1',
  storage_path: 'project-1/test-photo.jpg',
  caption: null,
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

describe('PhotoGrid', () => {
  const mockOnPhotosChange = vi.fn()
  const defaultProps = {
    photos: [],
    projectId: 'project-1',
    onPhotosChange: mockOnPhotosChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockResolvedValue({ data: [], error: null })
    mockRemove.mockResolvedValue({ data: null, error: null })
    mockDelete.mockResolvedValue({ data: null, error: null })
  })

  it('should render empty state when no photos', () => {
    render(<PhotoGrid {...defaultProps} />)

    expect(screen.getByText('Start taking pictures in the mobile app.')).toBeInTheDocument()
    expect(screen.getByText('All photos and videos taken by your team will appear here, instantly.')).toBeInTheDocument()
  })

  it('should render photos in a grid', async () => {
    const photos = [
      createMockPhoto({ id: '1', created_at: '2024-01-15T10:00:00Z' }),
      createMockPhoto({ id: '2', created_at: '2024-01-15T11:00:00Z' }),
    ]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2)
    })
  })

  it('should generate correct photo URLs', async () => {
    const photos = [createMockPhoto({ storage_path: 'project-1/image.jpg' })]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', 'https://test.supabase.co/storage/v1/object/public/photos/project-1/image.jpg')
    })
  })

  it('should open lightbox when clicking on a photo', async () => {
    const user = userEvent.setup()
    const photos = [createMockPhoto()]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    const img = screen.getByRole('img')
    await user.click(img.parentElement!)

    // Lightbox should be visible
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should close lightbox when pressing Escape', async () => {
    const user = userEvent.setup()
    const photos = [createMockPhoto()]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    // Open lightbox
    const img = screen.getByRole('img')
    await user.click(img.parentElement!)

    expect(screen.getByText('Delete')).toBeInTheDocument()

    // Press Escape
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })
  })

  it('should confirm before deleting photo', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    const photos = [createMockPhoto()]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    // Open lightbox
    const img = screen.getByRole('img')
    await user.click(img.parentElement!)

    // Click delete
    await user.click(screen.getByText('Delete'))

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this photo?')
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('should delete photo when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const photos = [createMockPhoto({ storage_path: 'test/photo.jpg' })]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    // Open lightbox
    const img = screen.getByRole('img')
    await user.click(img.parentElement!)

    // Click delete
    await user.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(['test/photo.jpg'])
      expect(mockDelete).toHaveBeenCalled()
      expect(mockOnPhotosChange).toHaveBeenCalled()
    })
  })

  it('should fetch uploader info for photos', async () => {
    const photos = [createMockPhoto({ uploaded_by: 'user-123' })]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled()
    })
  })
})
