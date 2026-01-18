import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProjects } from '@/hooks/useProjects'

// Mock Supabase client
const mockProjectsRange = vi.fn()
const mockMembershipsSelect = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: () => ({
            order: () => ({
              eq: () => ({
                or: () => ({
                  range: mockProjectsRange,
                }),
                range: mockProjectsRange,
              }),
              or: () => ({
                range: mockProjectsRange,
              }),
              range: mockProjectsRange,
            }),
            in: () => ({
              eq: () => ({
                order: () => ({
                  or: () => ({
                    range: mockProjectsRange,
                  }),
                  range: mockProjectsRange,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'project_members') {
        return {
          select: () => ({
            eq: mockMembershipsSelect,
          }),
        }
      }
      return {}
    }),
  }),
}))

const createMockProject = (overrides = {}) => ({
  id: 'project-1',
  name: 'Test Project',
  address: '123 Test St',
  created_by: 'user-1',
  is_archived: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  photos: [{ id: 'photo-1', storage_path: 'test/photo.jpg' }],
  ...overrides,
})

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjectsRange.mockResolvedValue({ data: [], error: null })
    mockMembershipsSelect.mockResolvedValue({ data: [], error: null })
  })

  it('should return initial loading state', () => {
    const { result } = renderHook(() =>
      useProjects({ userId: 'user-1', userRole: 'Admin' })
    )

    expect(result.current.loading).toBe(true)
    expect(result.current.projects).toEqual([])
  })

  it('should stop loading when userId or userRole is missing', async () => {
    const { result } = renderHook(() => useProjects({}))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toEqual([])
  })

  it('should fetch projects for Admin users', async () => {
    const mockProjects = [
      createMockProject({ id: 'project-1', name: 'Project 1' }),
      createMockProject({ id: 'project-2', name: 'Project 2' }),
    ]

    mockProjectsRange.mockResolvedValue({
      data: mockProjects,
      error: null,
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-1', userRole: 'Admin' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toHaveLength(2)
    expect(result.current.projects[0].name).toBe('Project 1')
    expect(result.current.error).toBeNull()
  })

  it('should add photo_count to projects', async () => {
    const mockProjects = [
      createMockProject({
        photos: [
          { id: 'photo-1', storage_path: 'test/1.jpg' },
          { id: 'photo-2', storage_path: 'test/2.jpg' },
        ],
      }),
    ]

    mockProjectsRange.mockResolvedValue({
      data: mockProjects,
      error: null,
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-1', userRole: 'Standard' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects[0].photo_count).toBe(2)
  })

  it('should handle empty project list', async () => {
    mockProjectsRange.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-1', userRole: 'Admin' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toEqual([])
    expect(result.current.hasMore).toBe(false)
  })

  it('should handle fetch error', async () => {
    mockProjectsRange.mockResolvedValue({
      data: null,
      error: { message: 'Fetch failed' },
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-1', userRole: 'Admin' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.projects).toEqual([])
  })

  it('should fetch only member projects for Restricted users', async () => {
    const mockMemberships = [
      { project_id: 'project-1' },
      { project_id: 'project-2' },
    ]

    mockMembershipsSelect.mockResolvedValue({
      data: mockMemberships,
      error: null,
    })

    mockProjectsRange.mockResolvedValue({
      data: [createMockProject({ id: 'project-1' })],
      error: null,
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-restricted', userRole: 'Restricted' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockMembershipsSelect).toHaveBeenCalled()
  })

  it('should return empty projects for Restricted user with no memberships', async () => {
    mockMembershipsSelect.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-restricted', userRole: 'Restricted' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toEqual([])
    expect(result.current.hasMore).toBe(false)
  })

  it('should set hasMore based on page size', async () => {
    // Create 12 projects (PAGE_SIZE)
    const mockProjects = Array.from({ length: 12 }, (_, i) =>
      createMockProject({ id: `project-${i}` })
    )

    mockProjectsRange.mockResolvedValue({
      data: mockProjects,
      error: null,
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-1', userRole: 'Admin' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.hasMore).toBe(true)
  })

  it('should provide refetch function', async () => {
    mockProjectsRange.mockResolvedValue({
      data: [createMockProject()],
      error: null,
    })

    const { result } = renderHook(() =>
      useProjects({ userId: 'user-1', userRole: 'Admin' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe('function')
    expect(typeof result.current.loadMore).toBe('function')
  })
})
