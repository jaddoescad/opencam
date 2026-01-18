import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChecklistList } from '@/components/checklist'
import type { Checklist } from '@/types/database'

// Mock router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Supabase client
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockInsertSingle = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
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
          delete: () => ({
            eq: mockDelete,
          }),
        }
      }
      if (table === 'checklist_items') {
        return {
          select: () => ({
            eq: () => ({
              order: mockSelect,
            }),
          }),
          insert: mockChecklistItemsInsert,
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
      return {}
    }),
  }),
}))

const createMockChecklist = (overrides?: Partial<Checklist>): Checklist => ({
  id: 'checklist-1',
  project_id: 'project-1',
  title: 'Test Checklist',
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

describe('ChecklistList', () => {
  const mockOnChecklistsChange = vi.fn()
  const defaultProps = {
    checklists: [],
    projectId: 'project-1',
    onChecklistsChange: mockOnChecklistsChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
    mockInsertSingle.mockImplementation((data) =>
      Promise.resolve({
        data: { id: 'new-checklist-id', ...data },
        error: null,
      })
    )
    mockDelete.mockResolvedValue({ data: null, error: null })
    mockSelect.mockResolvedValue({ data: [], error: null })
    mockTemplatesSelect.mockResolvedValue({ data: [], error: null })
    mockTemplateItemsSelect.mockResolvedValue({ data: [], error: null })
    mockChecklistItemsInsert.mockResolvedValue({ data: null, error: null })
  })

  it('should render empty state when no checklists', () => {
    render(<ChecklistList {...defaultProps} />)

    expect(screen.getByText('No checklists yet')).toBeInTheDocument()
    expect(screen.getByText('Create a checklist to track tasks')).toBeInTheDocument()
  })

  it('should render checklist header', () => {
    render(<ChecklistList {...defaultProps} />)

    expect(screen.getByText('Checklists')).toBeInTheDocument()
    expect(screen.getByText('New Checklist')).toBeInTheDocument()
  })

  it('should render checklists when provided', () => {
    const checklists = [
      createMockChecklist({ id: '1', title: 'Site Inspection' }),
      createMockChecklist({ id: '2', title: 'Safety Checklist' }),
    ]

    render(<ChecklistList {...defaultProps} checklists={checklists} />)

    expect(screen.getByText('Site Inspection')).toBeInTheDocument()
    expect(screen.getByText('Safety Checklist')).toBeInTheDocument()
  })

  it('should open create modal when clicking New Checklist button', async () => {
    const user = userEvent.setup()
    render(<ChecklistList {...defaultProps} />)

    await user.click(screen.getByText('New Checklist'))

    expect(screen.getByRole('heading', { name: 'New Checklist' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('should close create modal when clicking Cancel', async () => {
    const user = userEvent.setup()
    render(<ChecklistList {...defaultProps} />)

    await user.click(screen.getByText('New Checklist'))
    expect(screen.getByRole('heading', { name: 'New Checklist' })).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('heading', { name: 'New Checklist' })).not.toBeInTheDocument()
  })

  it('should create checklist when form is submitted', async () => {
    const user = userEvent.setup()
    render(<ChecklistList {...defaultProps} />)

    await user.click(screen.getByText('New Checklist'))
    await user.type(screen.getByLabelText('Title'), 'My New Checklist')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        project_id: 'project-1',
        title: 'My New Checklist',
        created_by: 'test-user-id',
      })
    })

    expect(mockOnChecklistsChange).toHaveBeenCalled()
  })

  it('should show error when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const user = userEvent.setup()
    render(<ChecklistList {...defaultProps} />)

    await user.click(screen.getByText('New Checklist'))
    await user.type(screen.getByLabelText('Title'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('You must be logged in')).toBeInTheDocument()
    })
  })

  it('should show error when insert fails', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const user = userEvent.setup()
    render(<ChecklistList {...defaultProps} />)

    await user.click(screen.getByText('New Checklist'))
    await user.type(screen.getByLabelText('Title'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument()
    })
  })

  it('should navigate to checklist when clicking on checklist card', async () => {
    const user = userEvent.setup()
    const checklists = [createMockChecklist({ id: 'checklist-123', title: 'Test Checklist' })]

    render(<ChecklistList {...defaultProps} checklists={checklists} />)

    await user.click(screen.getByText('Test Checklist'))

    expect(mockPush).toHaveBeenCalledWith('/dashboard/checklist/checklist-123')
  })

  it('should show Creating... while loading', async () => {
    // Slow down the mock to see loading state
    mockInsertSingle.mockImplementation((data) => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 'new-checklist-id', ...data }, error: null }), 100)))

    const user = userEvent.setup()
    render(<ChecklistList {...defaultProps} />)

    await user.click(screen.getByText('New Checklist'))
    await user.type(screen.getByLabelText('Title'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByText('Creating...')).toBeInTheDocument()
  })

  it('should clear form after successful creation', async () => {
    const user = userEvent.setup()
    render(<ChecklistList {...defaultProps} />)

    await user.click(screen.getByText('New Checklist'))
    await user.type(screen.getByLabelText('Title'), 'My Checklist')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockOnChecklistsChange).toHaveBeenCalled()
    })

    // Modal should be closed
    expect(screen.queryByRole('heading', { name: 'New Checklist' })).not.toBeInTheDocument()
  })

  it('should delete checklist when delete button is clicked', async () => {
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const checklists = [createMockChecklist({ id: 'checklist-to-delete' })]
    render(<ChecklistList {...defaultProps} checklists={checklists} />)

    // Find and click the delete button
    const deleteButton = document.querySelector('button[class*="hover:text-red-500"]')
    if (deleteButton) {
      await act(async () => {
        fireEvent.click(deleteButton)
      })
    }

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  it('should not delete checklist when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const checklists = [createMockChecklist({ id: 'checklist-to-delete' })]
    render(<ChecklistList {...defaultProps} checklists={checklists} />)

    const deleteButton = document.querySelector('button[class*="hover:text-red-500"]')
    if (deleteButton) {
      await act(async () => {
        fireEvent.click(deleteButton)
      })
    }

    expect(mockDelete).not.toHaveBeenCalled()
  })
})
