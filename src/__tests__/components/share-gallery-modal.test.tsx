import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareGalleryModal } from '@/components/share-gallery-modal'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: mockInsert,
        }),
      }),
      update: () => ({
        eq: mockUpdate,
      }),
    })),
  }),
}))

// Mock clipboard API
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

describe('ShareGalleryModal', () => {
  const mockOnClose = vi.fn()
  const defaultProps = {
    projectId: 'project-1',
    projectName: 'Test Project',
    isOpen: true,
    onClose: mockOnClose,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
    mockSelect.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({
      data: { id: 'share-1', token: 'abc123', is_active: true },
      error: null,
    })
    mockUpdate.mockResolvedValue({ data: null, error: null })
    mockWriteText.mockResolvedValue(undefined)
  })

  it('should not render when isOpen is false', () => {
    render(<ShareGalleryModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Share Photo Gallery')).not.toBeInTheDocument()
  })

  it('should render modal when isOpen is true', async () => {
    render(<ShareGalleryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Share Photo Gallery')).toBeInTheDocument()
    })
  })

  it('should display project name in description', async () => {
    render(<ShareGalleryModal {...defaultProps} projectName="My Construction Site" />)
    await waitFor(() => {
      expect(screen.getByText('My Construction Site')).toBeInTheDocument()
    })
  })

  it('should show create button when no share exists', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null })
    render(<ShareGalleryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('No share link exists for this project yet.')).toBeInTheDocument()
      expect(screen.getByText('Create Share Link')).toBeInTheDocument()
    })
  })

  it('should show share link when share exists', async () => {
    mockSelect.mockResolvedValue({
      data: { id: 'share-1', token: 'test-token-123', is_active: true },
      error: null,
    })
    render(<ShareGalleryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Share Link')).toBeInTheDocument()
    })
  })

  it('should show read-only access info when share exists', async () => {
    mockSelect.mockResolvedValue({
      data: { id: 'share-1', token: 'test-token', is_active: true },
      error: null,
    })
    render(<ShareGalleryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Read-only access')).toBeInTheDocument()
    })
  })

  it('should show disable button when share exists', async () => {
    mockSelect.mockResolvedValue({
      data: { id: 'share-1', token: 'test-token', is_active: true },
      error: null,
    })
    render(<ShareGalleryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Disable Share Link')).toBeInTheDocument()
    })
  })

  it('should call onClose when clicking backdrop', async () => {
    const user = userEvent.setup()
    render(<ShareGalleryModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Share Photo Gallery')).toBeInTheDocument()
    })
    const backdrop = document.querySelector('.bg-black\\/50')
    if (backdrop) {
      await user.click(backdrop)
    }
    expect(mockOnClose).toHaveBeenCalled()
  })
})
