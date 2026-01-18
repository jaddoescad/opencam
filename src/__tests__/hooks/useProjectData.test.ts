import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useProjectData } from '@/hooks/useProjectData'

// Mock Supabase client
const mockProjectSingle = vi.fn()
const mockPhotosOrder = vi.fn()
const mockMembersSelect = vi.fn()
const mockChecklistsOrder = vi.fn()
const mockPagesOrder = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockImplementation((table) => {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              single: mockProjectSingle,
            }),
          }),
        }
      }
      if (table === 'photos') {
        return {
          select: () => ({
            eq: () => ({
              order: mockPhotosOrder,
            }),
          }),
        }
      }
      if (table === 'project_members') {
        return {
          select: () => ({
            eq: mockMembersSelect,
          }),
        }
      }
      if (table === 'checklists') {
        return {
          select: () => ({
            eq: () => ({
              order: mockChecklistsOrder,
            }),
          }),
        }
      }
      if (table === 'project_pages') {
        return {
          select: () => ({
            eq: () => ({
              order: mockPagesOrder,
            }),
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
  ...overrides,
})

const createMockPhoto = (overrides = {}) => ({
  id: 'photo-1',
  project_id: 'project-1',
  uploaded_by: 'user-1',
  storage_path: 'project-1/photo.jpg',
  caption: null,
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockMember = (overrides = {}) => ({
  id: 'member-1',
  project_id: 'project-1',
  user_id: 'user-1',
  role: 'member',
  added_at: '2024-01-15T10:00:00Z',
  profile: {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'Test User',
    role: 'Standard',
  },
  ...overrides,
})

const createMockChecklist = (overrides = {}) => ({
  id: 'checklist-1',
  project_id: 'project-1',
  title: 'Test Checklist',
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockPage = (overrides = {}) => ({
  id: 'page-1',
  project_id: 'project-1',
  name: 'Test Page',
  content: 'Page content',
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

describe('useProjectData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjectSingle.mockResolvedValue({ data: createMockProject(), error: null })
    mockPhotosOrder.mockResolvedValue({ data: [], error: null })
    mockMembersSelect.mockResolvedValue({ data: [], error: null })
    mockChecklistsOrder.mockResolvedValue({ data: [], error: null })
    mockPagesOrder.mockResolvedValue({ data: [], error: null })
  })

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useProjectData('project-1'))

    expect(result.current.loading).toBe(true)
    expect(result.current.project).toBeNull()
    expect(result.current.photos).toEqual([])
    expect(result.current.members).toEqual([])
    expect(result.current.checklists).toEqual([])
    expect(result.current.pages).toEqual([])
  })

  it('should fetch all project data in parallel', async () => {
    const mockProject = createMockProject()
    const mockPhotos = [createMockPhoto()]
    const mockMembers = [createMockMember()]
    const mockChecklists = [createMockChecklist()]
    const mockPages = [createMockPage()]

    mockProjectSingle.mockResolvedValue({ data: mockProject, error: null })
    mockPhotosOrder.mockResolvedValue({ data: mockPhotos, error: null })
    mockMembersSelect.mockResolvedValue({ data: mockMembers, error: null })
    mockChecklistsOrder.mockResolvedValue({ data: mockChecklists, error: null })
    mockPagesOrder.mockResolvedValue({ data: mockPages, error: null })

    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.project).toEqual(mockProject)
    expect(result.current.photos).toEqual(mockPhotos)
    expect(result.current.members).toEqual(mockMembers)
    expect(result.current.checklists).toEqual(mockChecklists)
    expect(result.current.pages).toEqual(mockPages)
    expect(result.current.error).toBeNull()
  })

  it('should handle project fetch error', async () => {
    mockProjectSingle.mockResolvedValue({
      data: null,
      error: { message: 'Project not found' },
    })

    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should handle empty data gracefully', async () => {
    mockProjectSingle.mockResolvedValue({ data: createMockProject(), error: null })
    mockPhotosOrder.mockResolvedValue({ data: [], error: null })
    mockMembersSelect.mockResolvedValue({ data: [], error: null })
    mockChecklistsOrder.mockResolvedValue({ data: [], error: null })
    mockPagesOrder.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.photos).toEqual([])
    expect(result.current.members).toEqual([])
    expect(result.current.checklists).toEqual([])
    expect(result.current.pages).toEqual([])
  })

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe('function')

    await act(async () => {
      await result.current.refetch()
    })

    // Should have fetched twice
    expect(mockProjectSingle).toHaveBeenCalledTimes(2)
  })

  it('should provide individual refetch functions', async () => {
    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refetchPhotos).toBe('function')
    expect(typeof result.current.refetchMembers).toBe('function')
    expect(typeof result.current.refetchChecklists).toBe('function')
    expect(typeof result.current.refetchPages).toBe('function')
  })

  it('should refetch photos individually', async () => {
    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    mockPhotosOrder.mockClear()
    const newPhotos = [createMockPhoto({ id: 'photo-2' })]
    mockPhotosOrder.mockResolvedValue({ data: newPhotos, error: null })

    await act(async () => {
      await result.current.refetchPhotos()
    })

    expect(mockPhotosOrder).toHaveBeenCalled()
  })

  it('should refetch members individually', async () => {
    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    mockMembersSelect.mockClear()

    await act(async () => {
      await result.current.refetchMembers()
    })

    expect(mockMembersSelect).toHaveBeenCalled()
  })

  it('should refetch checklists individually', async () => {
    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    mockChecklistsOrder.mockClear()

    await act(async () => {
      await result.current.refetchChecklists()
    })

    expect(mockChecklistsOrder).toHaveBeenCalled()
  })

  it('should refetch pages individually', async () => {
    const { result } = renderHook(() => useProjectData('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    mockPagesOrder.mockClear()

    await act(async () => {
      await result.current.refetchPages()
    })

    expect(mockPagesOrder).toHaveBeenCalled()
  })

  it('should refetch when projectId changes', async () => {
    const { result, rerender } = renderHook(
      ({ projectId }) => useProjectData(projectId),
      { initialProps: { projectId: 'project-1' } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Clear mocks and change projectId
    mockProjectSingle.mockClear()
    rerender({ projectId: 'project-2' })

    await waitFor(() => {
      expect(mockProjectSingle).toHaveBeenCalled()
    })
  })
})
