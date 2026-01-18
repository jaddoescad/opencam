import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemberList } from '@/components/member-list'
import type { Profile, ProjectMember } from '@/types/database'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()
const mockProfilesOrder = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()

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
            order: mockProfilesOrder,
          }),
        }
      }
      if (table === 'project_members') {
        return {
          insert: mockInsert,
          delete: () => ({
            eq: mockDelete,
          }),
        }
      }
      return {}
    }),
  }),
}))

const createMockMember = (overrides?: Partial<ProjectMember & { profile: Profile }>): ProjectMember & { profile: Profile } => ({
  id: 'member-1',
  project_id: 'project-1',
  user_id: 'user-1',
  role: 'member',
  added_at: '2024-01-15T10:00:00Z',
  profile: {
    id: 'user-1',
    email: 'john@example.com',
    full_name: 'John Doe',
    role: 'Standard',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  ...overrides,
})

describe('MemberList', () => {
  const mockOnMembersChange = vi.fn()
  const defaultProps = {
    members: [],
    projectId: 'project-1',
    onMembersChange: mockOnMembersChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'current-user-id' } },
      error: null,
    })
    mockProfileSingle.mockResolvedValue({
      data: { role: 'Admin' },
      error: null,
    })
    mockProfilesOrder.mockResolvedValue({ data: [], error: null })
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockDelete.mockResolvedValue({ data: null, error: null })
  })

  it('should render empty state when no members', async () => {
    render(<MemberList {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No members yet')).toBeInTheDocument()
    })
  })

  it('should render header with title and add button', () => {
    render(<MemberList {...defaultProps} />)

    expect(screen.getByText('Project Members')).toBeInTheDocument()
    expect(screen.getByText('Add Member')).toBeInTheDocument()
  })

  it('should render member list with name', async () => {
    const members = [createMockMember()]

    render(<MemberList {...defaultProps} members={members} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('should render member initials', async () => {
    const members = [createMockMember()]

    render(<MemberList {...defaultProps} members={members} />)

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  it('should show email for Admin users', async () => {
    mockProfileSingle.mockResolvedValue({
      data: { role: 'Admin' },
      error: null,
    })

    const members = [createMockMember()]

    render(<MemberList {...defaultProps} members={members} />)

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })
  })
})
