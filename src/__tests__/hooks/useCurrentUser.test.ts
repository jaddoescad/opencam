import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockProfileSelect = vi.fn()

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
              single: mockProfileSelect,
            }),
          }),
        }
      }
      return {}
    }),
  }),
}))

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return initial loading state', () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const { result } = renderHook(() => useCurrentUser())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.role).toBeNull()
  })

  it('should return null user when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.role).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should return user and profile when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'Admin',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockProfileSelect.mockResolvedValue({
      data: mockProfile,
      error: null,
    })

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.profile).toEqual(mockProfile)
    expect(result.current.role).toBe('Admin')
    expect(result.current.error).toBeNull()
  })

  it('should return Standard role for Standard users', async () => {
    const mockUser = { id: 'user-456', email: 'standard@example.com' }
    const mockProfile = {
      id: 'user-456',
      email: 'standard@example.com',
      full_name: 'Standard User',
      role: 'Standard',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockProfileSelect.mockResolvedValue({
      data: mockProfile,
      error: null,
    })

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.role).toBe('Standard')
  })

  it('should return Restricted role for Restricted users', async () => {
    const mockUser = { id: 'user-789', email: 'restricted@example.com' }
    const mockProfile = {
      id: 'user-789',
      email: 'restricted@example.com',
      full_name: 'Restricted User',
      role: 'Restricted',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockProfileSelect.mockResolvedValue({
      data: mockProfile,
      error: null,
    })

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.role).toBe('Restricted')
  })

  it('should handle auth error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error' },
    })

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.user).toBeNull()
  })

  it('should handle profile fetch error', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    mockProfileSelect.mockResolvedValue({
      data: null,
      error: { message: 'Profile not found' },
    })

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })
})
