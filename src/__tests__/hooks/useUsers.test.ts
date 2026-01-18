import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useUsers } from '@/hooks/useUsers'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockProfilesOrder = vi.fn()
const mockInvitationsInsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            order: mockProfilesOrder,
          }),
        }
      }
      if (table === 'invitations') {
        return {
          insert: () => ({
            select: () => ({
              single: mockInvitationsInsert,
            }),
          }),
        }
      }
      return {}
    }),
  }),
}))

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'Standard',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfilesOrder.mockResolvedValue({ data: [], error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'current-user-id' } },
      error: null,
    })
    mockInvitationsInsert.mockResolvedValue({ data: null, error: null })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    })
  })

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useUsers())

    expect(result.current.loading).toBe(true)
    expect(result.current.users).toEqual([])
  })

  it('should fetch users successfully', async () => {
    const mockUsers = [
      createMockUser({ id: 'user-1', full_name: 'User One' }),
      createMockUser({ id: 'user-2', full_name: 'User Two' }),
    ]

    mockProfilesOrder.mockResolvedValue({
      data: mockUsers,
      error: null,
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.users).toHaveLength(2)
    expect(result.current.users[0].full_name).toBe('User One')
    expect(result.current.users[0].is_active).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should handle empty user list', async () => {
    mockProfilesOrder.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.users).toEqual([])
  })

  it('should handle fetch error', async () => {
    mockProfilesOrder.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch users' },
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.users).toEqual([])
  })

  it('should provide refetch function that works', async () => {
    mockProfilesOrder.mockResolvedValue({
      data: [createMockUser()],
      error: null,
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe('function')

    // Call refetch
    await act(async () => {
      await result.current.refetch()
    })

    // Should have called the fetch again
    expect(mockProfilesOrder).toHaveBeenCalledTimes(2)
  })

  it('should invite user successfully', async () => {
    mockProfilesOrder.mockResolvedValue({
      data: [],
      error: null,
    })
    mockInvitationsInsert.mockResolvedValue({
      data: { token: 'invite-token-123' },
      error: null,
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let inviteResult
    await act(async () => {
      inviteResult = await result.current.inviteUser('new@example.com', 'Standard')
    })

    expect(inviteResult).toEqual({
      success: true,
      link: 'http://localhost:3000/invite/invite-token-123',
    })
  })

  it('should handle invite error when not logged in', async () => {
    mockProfilesOrder.mockResolvedValue({
      data: [],
      error: null,
    })
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let inviteResult
    await act(async () => {
      inviteResult = await result.current.inviteUser('new@example.com', 'Standard')
    })

    expect(inviteResult).toEqual({
      success: false,
      error: 'You must be logged in to invite users',
    })
  })

  it('should handle invite database error', async () => {
    mockProfilesOrder.mockResolvedValue({
      data: [],
      error: null,
    })
    mockInvitationsInsert.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let inviteResult
    await act(async () => {
      inviteResult = await result.current.inviteUser('new@example.com', 'Admin')
    })

    expect(inviteResult).toEqual({
      success: false,
      error: 'Database error',
    })
  })

  it('should return users with all roles', async () => {
    const mockUsers = [
      createMockUser({ id: 'user-1', role: 'Admin' }),
      createMockUser({ id: 'user-2', role: 'Standard' }),
      createMockUser({ id: 'user-3', role: 'Restricted' }),
    ]

    mockProfilesOrder.mockResolvedValue({
      data: mockUsers,
      error: null,
    })

    const { result } = renderHook(() => useUsers())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.users).toHaveLength(3)
    expect(result.current.users.map((u) => u.role)).toEqual(['Admin', 'Standard', 'Restricted'])
  })
})
