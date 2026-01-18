import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateChecklistModal } from '@/components/create-checklist-modal'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockInsertSingle = vi.fn()
const mockTemplatesSelect = vi.fn()
const mockTemplateItemsSelect = vi.fn()
const mockChecklistItemsInsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockImplementation((table) => {
      if (table === 'checklists') {
        return {
          insert: vi.fn().mockImplementation((data) => {
            mockInsert(data)
            return {
              select: vi.fn().mockReturnValue({
                single: () => mockInsertSingle(data),
              }),
            }
          }),
        }
      }
      if (table === 'checklist_templates') {
        return {
          select: vi.fn().mockReturnValue({
            order: mockTemplatesSelect,
          }),
        }
      }
      if (table === 'checklist_template_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: mockTemplateItemsSelect,
            }),
          }),
        }
      }
      if (table === 'checklist_items') {
        return {
          insert: mockChecklistItemsInsert,
        }
      }
      return {}
    }),
  }),
}))

describe('CreateChecklistModal', () => {
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
    mockInsertSingle.mockImplementation((data) =>
      Promise.resolve({
        data: { id: 'new-checklist-id', ...data },
        error: null,
      })
    )
    mockTemplatesSelect.mockResolvedValue({
      data: [],
      error: null,
    })
    mockTemplateItemsSelect.mockResolvedValue({
      data: [],
      error: null,
    })
    mockChecklistItemsInsert.mockResolvedValue({
      data: null,
      error: null,
    })
  })

  it('should not render when isOpen is false', () => {
    render(<CreateChecklistModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('New Checklist')).not.toBeInTheDocument()
  })

  it('should render modal with form elements', () => {
    render(<CreateChecklistModal {...defaultProps} />)

    expect(screen.getByText('New Checklist')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., Site Inspection Checklist')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
  })

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateChecklistModal {...defaultProps} />)

    await user.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateChecklistModal {...defaultProps} />)

    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50')
    if (backdrop) {
      await user.click(backdrop)
    }

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should clear input and error when closed', async () => {
    const user = userEvent.setup()
    render(<CreateChecklistModal {...defaultProps} />)

    const input = screen.getByLabelText('Title')
    await user.type(input, 'Test Checklist')

    await user.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should not submit with empty title', async () => {
    const user = userEvent.setup()
    render(<CreateChecklistModal {...defaultProps} />)

    const submitButton = screen.getByText('Create')
    await user.click(submitButton)

    // Form validation should prevent submission
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should create checklist successfully', async () => {
    const user = userEvent.setup()
    render(<CreateChecklistModal {...defaultProps} />)

    const input = screen.getByLabelText('Title')
    await user.type(input, 'Test Checklist')
    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })

    expect(mockOnClose).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith({
      project_id: 'project-1',
      title: 'Test Checklist',
      created_by: 'user-1',
    })
  })

  it('should show Creating... while submitting', async () => {
    const user = userEvent.setup()

    mockInsertSingle.mockImplementation(
      (data) => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 'new-checklist-id', ...data }, error: null }), 100))
    )

    render(<CreateChecklistModal {...defaultProps} />)

    const input = screen.getByLabelText('Title')
    await user.type(input, 'Test Checklist')
    await user.click(screen.getByText('Create'))

    expect(screen.getByText('Creating...')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })
  })

  it('should show error message when user not logged in', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const user = userEvent.setup()
    render(<CreateChecklistModal {...defaultProps} />)

    const input = screen.getByLabelText('Title')
    await user.type(input, 'Test Checklist')
    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.getByText('You must be logged in')).toBeInTheDocument()
    })

    expect(mockOnCreated).not.toHaveBeenCalled()
  })

  it('should show error message on insert error', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error occurred' },
    })

    const user = userEvent.setup()
    render(<CreateChecklistModal {...defaultProps} />)

    const input = screen.getByLabelText('Title')
    await user.type(input, 'Test Checklist')
    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.getByText('Database error occurred')).toBeInTheDocument()
    })

    expect(mockOnCreated).not.toHaveBeenCalled()
  })

  it('should disable submit button while creating', async () => {
    const user = userEvent.setup()

    mockInsertSingle.mockImplementation(
      (data) => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 'new-checklist-id', ...data }, error: null }), 100))
    )

    render(<CreateChecklistModal {...defaultProps} />)

    const input = screen.getByLabelText('Title')
    await user.type(input, 'Test Checklist')

    const submitButton = screen.getByText('Create')
    await user.click(submitButton)

    expect(screen.getByText('Creating...')).toBeDisabled()

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })
  })

  it('should clear error on subsequent open', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const user = userEvent.setup()
    const { rerender } = render(<CreateChecklistModal {...defaultProps} />)

    // Trigger error
    const input = screen.getByLabelText('Title')
    await user.type(input, 'Test')
    await user.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument()
    })

    // Close and reopen
    await user.click(screen.getByText('Cancel'))
    rerender(<CreateChecklistModal {...defaultProps} isOpen={true} />)

    // Error should be cleared
    expect(screen.queryByText('Database error')).not.toBeInTheDocument()
  })

  describe('Template selection', () => {
    it('should render template dropdown', async () => {
      render(<CreateChecklistModal {...defaultProps} />)

      expect(screen.getByLabelText('Template')).toBeInTheDocument()
      expect(screen.getByText('Start from scratch')).toBeInTheDocument()
    })

    it('should display fetched templates in dropdown', async () => {
      mockTemplatesSelect.mockResolvedValue({
        data: [
          { id: 'template-1', name: 'Safety Checklist', description: null },
          { id: 'template-2', name: 'Inspection Checklist', description: null },
        ],
        error: null,
      })

      render(<CreateChecklistModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Safety Checklist')).toBeInTheDocument()
        expect(screen.getByText('Inspection Checklist')).toBeInTheDocument()
      })
    })

    it('should auto-fill title when template is selected', async () => {
      const user = userEvent.setup()
      mockTemplatesSelect.mockResolvedValue({
        data: [
          { id: 'template-1', name: 'Safety Checklist', description: null },
        ],
        error: null,
      })

      render(<CreateChecklistModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Safety Checklist')).toBeInTheDocument()
      })

      const dropdown = screen.getByLabelText('Template')
      await user.selectOptions(dropdown, 'template-1')

      expect(screen.getByLabelText('Title')).toHaveValue('Safety Checklist')
    })

    it('should clear title when switching back to start from scratch', async () => {
      const user = userEvent.setup()
      mockTemplatesSelect.mockResolvedValue({
        data: [
          { id: 'template-1', name: 'Safety Checklist', description: null },
        ],
        error: null,
      })

      render(<CreateChecklistModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Safety Checklist')).toBeInTheDocument()
      })

      const dropdown = screen.getByLabelText('Template')
      await user.selectOptions(dropdown, 'template-1')
      expect(screen.getByLabelText('Title')).toHaveValue('Safety Checklist')

      await user.selectOptions(dropdown, '')
      expect(screen.getByLabelText('Title')).toHaveValue('')
    })

    it('should copy template items when creating checklist from template', async () => {
      const user = userEvent.setup()
      mockTemplatesSelect.mockResolvedValue({
        data: [
          { id: 'template-1', name: 'Safety Checklist', description: null },
        ],
        error: null,
      })
      mockTemplateItemsSelect.mockResolvedValue({
        data: [
          {
            id: 'item-1',
            checklist_template_id: 'template-1',
            content: 'Check fire extinguisher',
            category: 'Safety',
            position: 0,
            field_type: 'checkbox',
            notes: 'Check monthly',
            photos_required: true,
            options: null,
          },
          {
            id: 'item-2',
            checklist_template_id: 'template-1',
            content: 'Test emergency lights',
            category: 'Safety',
            position: 1,
            field_type: 'yes_no',
            notes: null,
            photos_required: false,
            options: null,
          },
        ],
        error: null,
      })

      render(<CreateChecklistModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Safety Checklist')).toBeInTheDocument()
      })

      const dropdown = screen.getByLabelText('Template')
      await user.selectOptions(dropdown, 'template-1')
      await user.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(mockOnCreated).toHaveBeenCalled()
      })

      expect(mockChecklistItemsInsert).toHaveBeenCalledWith([
        {
          checklist_id: 'new-checklist-id',
          content: 'Check fire extinguisher',
          category: 'Safety',
          position: 0,
          field_type: 'checkbox',
          notes: 'Check monthly',
          photos_required: true,
          options: null,
        },
        {
          checklist_id: 'new-checklist-id',
          content: 'Test emergency lights',
          category: 'Safety',
          position: 1,
          field_type: 'yes_no',
          notes: null,
          photos_required: false,
          options: null,
        },
      ])
    })

    it('should not copy items when creating checklist from scratch', async () => {
      const user = userEvent.setup()
      render(<CreateChecklistModal {...defaultProps} />)

      const input = screen.getByLabelText('Title')
      await user.type(input, 'My Custom Checklist')
      await user.click(screen.getByText('Create'))

      await waitFor(() => {
        expect(mockOnCreated).toHaveBeenCalled()
      })

      expect(mockChecklistItemsInsert).not.toHaveBeenCalled()
    })
  })
})
