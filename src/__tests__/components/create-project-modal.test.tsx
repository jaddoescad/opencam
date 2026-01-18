import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateProjectModal } from '@/components/create-project-modal'

// Mock router
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockImplementation((table) => {
      if (table === 'project_templates') {
        return {
          select: () => ({
            order: mockSelect,
          }),
        }
      }
      if (table === 'projects') {
        return {
          insert: () => ({
            select: () => ({
              single: mockInsert,
            }),
          }),
        }
      }
      // For template-related tables
      return {
        select: () => ({
          eq: () => mockSelect,
        }),
        insert: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'new-checklist-id' }, error: null }),
          }),
        }),
      }
    }),
  }),
}))

describe('CreateProjectModal', () => {
  const mockOnClose = vi.fn()
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
    mockInsert.mockResolvedValue({
      data: { id: 'new-project-id', name: 'Test Project' },
      error: null,
    })
    mockSelect.mockResolvedValue({ data: [], error: null })
  })

  it('should not render when isOpen is false', () => {
    render(<CreateProjectModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Create New Project')).not.toBeInTheDocument()
  })

  it('should render modal when isOpen is true', () => {
    render(<CreateProjectModal {...defaultProps} />)

    expect(screen.getByText('Create New Project')).toBeInTheDocument()
  })

  it('should render all form fields', () => {
    render(<CreateProjectModal {...defaultProps} />)

    expect(screen.getByLabelText('Project Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Project Address 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Project Address 2')).toBeInTheDocument()
    expect(screen.getByLabelText('City')).toBeInTheDocument()
    expect(screen.getByLabelText('State')).toBeInTheDocument()
    expect(screen.getByLabelText('Postal Code')).toBeInTheDocument()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
    expect(screen.getByLabelText('Project Templates')).toBeInTheDocument()
  })

  it('should have Canada as default country', () => {
    render(<CreateProjectModal {...defaultProps} />)

    const countrySelect = screen.getByLabelText('Country') as HTMLSelectElement
    expect(countrySelect.value).toBe('Canada')
  })

  it('should render all country options', () => {
    render(<CreateProjectModal {...defaultProps} />)

    expect(screen.getByRole('option', { name: 'Canada' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'United States' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'United Kingdom' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Australia' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument()
  })

  it('should call onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when clicking backdrop', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    const backdrop = document.querySelector('.bg-black\\/50')
    if (backdrop) {
      await user.click(backdrop)
    }

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should create project when form is submitted', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Project Name'), 'My New Project')
    await user.type(screen.getByLabelText('Project Address 1'), '123 Main St')
    await user.type(screen.getByLabelText('City'), 'Toronto')
    await user.type(screen.getByLabelText('State'), 'Ontario')
    await user.type(screen.getByLabelText('Postal Code'), 'M5V 1A1')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  it('should show error when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Project Name'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to create a project')).toBeInTheDocument()
    })
  })

  it('should show error when insert fails', async () => {
    mockInsert.mockResolvedValue({
      data: null,
      error: { message: 'Failed to create project' },
    })

    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Project Name'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to create project')).toBeInTheDocument()
    })
  })

  it('should navigate to new project after successful creation', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Project Name'), 'Test Project')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/projects/new-project-id')
      expect(mockRefresh).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should show Creating... while loading', async () => {
    mockInsert.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 'test' }, error: null }), 100)))

    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    await user.type(screen.getByLabelText('Project Name'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))

    expect(screen.getByText('Creating...')).toBeInTheDocument()
  })

  it('should require project name', () => {
    render(<CreateProjectModal {...defaultProps} />)

    const nameInput = screen.getByLabelText('Project Name')
    expect(nameInput).toBeRequired()
  })

  it('should not require address fields', () => {
    render(<CreateProjectModal {...defaultProps} />)

    expect(screen.getByLabelText('Project Address 1')).not.toBeRequired()
    expect(screen.getByLabelText('City')).not.toBeRequired()
    expect(screen.getByLabelText('State')).not.toBeRequired()
    expect(screen.getByLabelText('Postal Code')).not.toBeRequired()
  })

  it('should update country when selected', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal {...defaultProps} />)

    const countrySelect = screen.getByLabelText('Country')
    await user.selectOptions(countrySelect, 'United States')

    expect((countrySelect as HTMLSelectElement).value).toBe('United States')
  })

  it('should fetch project templates when modal opens', async () => {
    render(<CreateProjectModal {...defaultProps} />)

    await waitFor(() => {
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  it('should render template dropdown with placeholder', () => {
    render(<CreateProjectModal {...defaultProps} />)

    expect(screen.getByText('Apply a Project Template')).toBeInTheDocument()
  })
})
