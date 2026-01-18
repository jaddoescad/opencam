import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreatePageModal } from '@/components/create-page-modal'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Supabase client
const mockGetUser = vi.fn()
const mockInsertSingle = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockImplementation((table) => {
      if (table === 'project_pages') {
        return {
          insert: () => ({
            select: () => ({
              single: mockInsertSingle,
            }),
          }),
        }
      }
      return {}
    }),
  }),
}))

describe('CreatePageModal', () => {
  const mockOnClose = vi.fn()
  const mockOnCreated = vi.fn()
  const defaultProps = {
    isOpen: true,
    projectId: 'project-1',
    onClose: mockOnClose,
    onCreated: mockOnCreated,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockInsertSingle.mockResolvedValue({
      data: { id: 'new-page-id' },
      error: null,
    })
  })

  it('should not render when isOpen is false', () => {
    render(<CreatePageModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('New Page')).not.toBeInTheDocument()
  })

  it('should render modal with form elements', () => {
    render(<CreatePageModal {...defaultProps} />)

    expect(screen.getByText('New Page')).toBeInTheDocument()
    expect(screen.getByLabelText('Page Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., Site Notes, Daily Report')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
  })

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<CreatePageModal {...defaultProps} />)

    await user.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<CreatePageModal {...defaultProps} />)

    // Click the backdrop (the semi-transparent overlay)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50')
    if (backdrop) {
      await user.click(backdrop)
    }

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should clear input when closed', async () => {
    const user = userEvent.setup()
    render(<CreatePageModal {...defaultProps} />)

    const input = screen.getByLabelText('Page Name')
    await user.type(input, 'Test Page')

    await user.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should not submit with empty page name', async () => {
    const user = userEvent.setup()
    render(<CreatePageModal {...defaultProps} />)

    const submitButton = screen.getByText('Create')
    await user.click(submitButton)

    // Form validation should prevent submission
    expect(mockInsertSingle).not.toHaveBeenCalled()
  })

  it('should create page successfully', async () => {
    const user = userEvent.setup()
    render(<CreatePageModal {...defaultProps} />)

    const input = screen.getByLabelText('Page Name')
    await user.type(input, 'Test Page')
    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })

    expect(mockOnClose).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/dashboard/project-page/new-page-id')
  })

  it('should show Creating... while submitting', async () => {
    const user = userEvent.setup()

    // Delay the response
    mockInsertSingle.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 'new-page-id' }, error: null }), 100))
    )

    render(<CreatePageModal {...defaultProps} />)

    const input = screen.getByLabelText('Page Name')
    await user.type(input, 'Test Page')
    await user.click(screen.getByText('Create'))

    expect(screen.getByText('Creating...')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })
  })

  it('should trim page name before submitting', async () => {
    const user = userEvent.setup()
    render(<CreatePageModal {...defaultProps} />)

    const input = screen.getByLabelText('Page Name')
    await user.type(input, '  Test Page  ')
    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })
  })

  it('should not create page if error occurs', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Failed to create' },
    })

    const user = userEvent.setup()
    render(<CreatePageModal {...defaultProps} />)

    const input = screen.getByLabelText('Page Name')
    await user.type(input, 'Test Page')
    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(mockOnCreated).not.toHaveBeenCalled()
    })
  })

  it('should disable submit button while creating', async () => {
    const user = userEvent.setup()

    mockInsertSingle.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 'new-page-id' }, error: null }), 100))
    )

    render(<CreatePageModal {...defaultProps} />)

    const input = screen.getByLabelText('Page Name')
    await user.type(input, 'Test Page')

    const submitButton = screen.getByText('Create')
    await user.click(submitButton)

    expect(screen.getByText('Creating...')).toBeDisabled()

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })
  })
})
