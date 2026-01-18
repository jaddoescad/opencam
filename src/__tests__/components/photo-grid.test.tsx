import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGrid } from '@/components/photo-grid'
import type { PhotoWithUploader } from '@/types/database'

// Mock environment variable
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')

// Mock Supabase client
const mockRemove = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockImplementation((table) => {
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

const createMockPhoto = (overrides?: Partial<PhotoWithUploader>): PhotoWithUploader => ({
  id: 'photo-1',
  project_id: 'project-1',
  uploaded_by: 'user-1',
  storage_path: 'project-1/test-photo.jpg',
  caption: null,
  created_at: '2024-01-15T10:00:00Z',
  uploader: {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
    role: 'Standard',
    created_at: '2024-01-01T00:00:00Z',
  },
  ...overrides,
})

describe('PhotoGrid', () => {
  const mockOnPhotosChange = vi.fn()
  const defaultProps = {
    photos: [] as PhotoWithUploader[],
    projectId: 'project-1',
    onPhotosChange: mockOnPhotosChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
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

  it('should show confirmation dialog when clicking delete', async () => {
    const user = userEvent.setup()
    const photos = [createMockPhoto()]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    // Open lightbox
    const img = screen.getByRole('img')
    await user.click(img.parentElement!)

    // Click delete button in lightbox
    await user.click(screen.getByText('Delete'))

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Delete Photo')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete this photo? This action cannot be undone.')).toBeInTheDocument()
    })
  })

  it('should cancel delete when clicking cancel in dialog', async () => {
    const user = userEvent.setup()
    const photos = [createMockPhoto()]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    // Open lightbox
    const img = screen.getByRole('img')
    await user.click(img.parentElement!)

    // Click delete button
    await user.click(screen.getByText('Delete'))

    // Click cancel in dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Photo')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Cancel'))

    // Dialog should close, delete should not happen
    await waitFor(() => {
      expect(screen.queryByText('Delete Photo')).not.toBeInTheDocument()
    })
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('should delete photo when confirmed in dialog', async () => {
    const user = userEvent.setup()
    const photos = [createMockPhoto({ storage_path: 'test/photo.jpg' })]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    // Open lightbox
    const img = screen.getByRole('img')
    await user.click(img.parentElement!)

    // Click delete button
    await user.click(screen.getByText('Delete'))

    // Confirm delete in dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Photo')).toBeInTheDocument()
    })

    // Find and click the Delete button in the dialog (not the one in lightbox)
    const deleteButtons = screen.getAllByText('Delete')
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1] // Last one is in dialog
    await user.click(dialogDeleteButton)

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(['test/photo.jpg'])
      expect(mockDelete).toHaveBeenCalled()
      expect(mockOnPhotosChange).toHaveBeenCalled()
    })
  })

  it('should display uploader info from photos', async () => {
    const photos = [
      createMockPhoto({
        uploader: {
          id: 'user-123',
          email: 'john@example.com',
          full_name: 'John Doe',
          avatar_url: null,
          role: 'Admin',
          created_at: '2024-01-01T00:00:00Z',
        },
      }),
    ]

    render(<PhotoGrid {...defaultProps} photos={photos} />)

    await waitFor(() => {
      // Check that uploader info is displayed
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      // Check that initials avatar is displayed
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })
})
