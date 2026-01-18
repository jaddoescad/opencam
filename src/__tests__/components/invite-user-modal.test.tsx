import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteUserModal } from '@/components/invite-user-modal'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockInvitationInsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockProfileSingle,
            }),
          }),
        }
      }
      if (table === 'invitations') {
        return {
          insert: () => ({
            select: () => ({
              single: mockInvitationInsert,
            }),
          }),
        }
      }
      return {}
    }),
  }),
}))

// Mock fetch for email API
global.fetch = vi.fn()

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
})

describe('InviteUserModal', () => {
  const mockOnClose = vi.fn()
  const mockOnInvited = vi.fn()
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onInvited: mockOnInvited,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText.mockClear()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockProfileSingle.mockResolvedValue({
      data: { full_name: 'Test Inviter' },
      error: null,
    })
    mockInvitationInsert.mockResolvedValue({
      data: { token: 'invite-token-123' },
      error: null,
    })
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    })
  })

  it('should not render when isOpen is false', () => {
    render(<InviteUserModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Invite Users')).not.toBeInTheDocument()
  })

  it('should render step 1 with email input', () => {
    render(<InviteUserModal {...defaultProps} />)

    expect(screen.getByText('Invite Users')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument()
    expect(screen.getByText('Add Another Email')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('should render step indicators', () => {
    render(<InviteUserModal {...defaultProps} />)

    expect(screen.getByText('Add Emails')).toBeInTheDocument()
    expect(screen.getByText('Review Invites')).toBeInTheDocument()
    expect(screen.getByText('Done!')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const closeButton = screen.getByText('Users').closest('button')
    await user.click(closeButton!)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should add another email field when clicking Add Another Email', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    expect(screen.getAllByPlaceholderText('email@example.com')).toHaveLength(1)

    await user.click(screen.getByText('Add Another Email'))

    expect(screen.getAllByPlaceholderText('email@example.com')).toHaveLength(2)
  })

  it('should remove email field when clicking remove button', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    // Add another email
    await user.click(screen.getByText('Add Another Email'))
    expect(screen.getAllByPlaceholderText('email@example.com')).toHaveLength(2)

    // Remove one
    const removeButtons = screen.getAllByRole('button').filter((btn) =>
      btn.querySelector('svg path[d*="M6 18L18 6"]')
    )
    await user.click(removeButtons[0])

    expect(screen.getAllByPlaceholderText('email@example.com')).toHaveLength(1)
  })

  it('should disable Next button when no valid emails', () => {
    render(<InviteUserModal {...defaultProps} />)

    const nextButton = screen.getByText('Next')
    expect(nextButton).toBeDisabled()
  })

  it('should enable Next button when valid email is entered', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')

    const nextButton = screen.getByText('Next')
    expect(nextButton).not.toBeDisabled()
  })

  it('should navigate to step 2 when Next is clicked with valid email', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByText('Next'))

    expect(screen.getByText('Set Roles and Send')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should show role selector in step 2', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByText('Next'))

    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Restricted')).toBeInTheDocument()
  })

  it('should show send button with correct count in step 2', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByText('Next'))

    expect(screen.getByText('Send 1 Invite')).toBeInTheDocument()
  })

  it('should send invites and show step 3 on completion', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByText('Next'))
    await user.click(screen.getByText('Send 1 Invite'))

    await waitFor(() => {
      expect(screen.getByText('Invitations Created!')).toBeInTheDocument()
    })

    expect(screen.getByText('1 invitation sent!')).toBeInTheDocument()
  })

  it('should show invitation link in step 3', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByText('Next'))
    await user.click(screen.getByText('Send 1 Invite'))

    await waitFor(() => {
      expect(screen.getByText('Invitation Links')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue(/invite-token-123/)).toBeInTheDocument()
  })

  it('should call onInvited and onClose when Done is clicked', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByText('Next'))
    await user.click(screen.getByText('Send 1 Invite'))

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Done'))

    expect(mockOnInvited).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should have Copy All button in step 3', async () => {
    const user = userEvent.setup()
    render(<InviteUserModal {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText('email@example.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByText('Next'))
    await user.click(screen.getByText('Send 1 Invite'))

    await waitFor(() => {
      expect(screen.getByText('Copy All')).toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
    })
  })
})
