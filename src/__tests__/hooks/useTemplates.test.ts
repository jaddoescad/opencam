import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTemplates } from '@/hooks/useTemplates'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockProjectTemplatesOrder = vi.fn()
const mockChecklistTemplatesOrder = vi.fn()
const mockPageTemplatesOrder = vi.fn()
const mockInsertSingle = vi.fn()
const mockDelete = vi.fn()
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
      if (table === 'project_templates') {
        return {
          select: () => ({
            order: mockProjectTemplatesOrder,
          }),
          insert: () => ({
            select: () => ({
              single: mockInsertSingle,
            }),
          }),
          delete: () => ({
            eq: mockDelete,
          }),
        }
      }
      if (table === 'checklist_templates') {
        return {
          select: () => ({
            order: mockChecklistTemplatesOrder,
          }),
          insert: () => ({
            select: () => ({
              single: mockInsertSingle,
            }),
          }),
          delete: () => ({
            eq: mockDelete,
          }),
        }
      }
      if (table === 'page_templates') {
        return {
          select: () => ({
            order: mockPageTemplatesOrder,
          }),
          insert: () => ({
            select: () => ({
              single: mockInsertSingle,
            }),
          }),
          delete: () => ({
            eq: mockDelete,
          }),
        }
      }
      return {}
    }),
  }),
}))

const createMockProjectTemplate = (overrides = {}) => ({
  id: 'template-1',
  name: 'Project Template',
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockChecklistTemplate = (overrides = {}) => ({
  id: 'checklist-template-1',
  name: 'Checklist Template',
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

const createMockPageTemplate = (overrides = {}) => ({
  id: 'page-template-1',
  name: 'Page Template',
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

describe('useTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockProjectTemplatesOrder.mockResolvedValue({ data: [], error: null })
    mockChecklistTemplatesOrder.mockResolvedValue({ data: [], error: null })
    mockPageTemplatesOrder.mockResolvedValue({ data: [], error: null })
    mockInsertSingle.mockResolvedValue({ data: null, error: null })
    mockDelete.mockResolvedValue({ data: null, error: null })
    mockProfileSelect.mockResolvedValue({
      data: { company_id: 'test-company-id' },
      error: null,
    })
  })

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useTemplates())

    expect(result.current.loading).toBe(true)
    expect(result.current.projectTemplates).toEqual([])
    expect(result.current.checklistTemplates).toEqual([])
    expect(result.current.pageTemplates).toEqual([])
  })

  it('should fetch all template types in parallel', async () => {
    const mockProjectTemplates = [createMockProjectTemplate()]
    const mockChecklistTemplates = [createMockChecklistTemplate()]
    const mockPageTemplates = [createMockPageTemplate()]

    mockProjectTemplatesOrder.mockResolvedValue({ data: mockProjectTemplates, error: null })
    mockChecklistTemplatesOrder.mockResolvedValue({ data: mockChecklistTemplates, error: null })
    mockPageTemplatesOrder.mockResolvedValue({ data: mockPageTemplates, error: null })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projectTemplates).toEqual(mockProjectTemplates)
    expect(result.current.checklistTemplates).toEqual(mockChecklistTemplates)
    expect(result.current.pageTemplates).toEqual(mockPageTemplates)
    expect(result.current.error).toBeNull()
  })

  it('should handle empty template lists', async () => {
    mockProjectTemplatesOrder.mockResolvedValue({ data: [], error: null })
    mockChecklistTemplatesOrder.mockResolvedValue({ data: [], error: null })
    mockPageTemplatesOrder.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projectTemplates).toEqual([])
    expect(result.current.checklistTemplates).toEqual([])
    expect(result.current.pageTemplates).toEqual([])
  })

  it('should handle fetch error', async () => {
    mockProjectTemplatesOrder.mockResolvedValue({
      data: null,
      error: { message: 'Fetch failed' },
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refetch).toBe('function')

    await act(async () => {
      await result.current.refetch()
    })

    // Should have fetched twice (initial + refetch)
    expect(mockProjectTemplatesOrder).toHaveBeenCalledTimes(2)
  })

  it('should create project template', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'new-template-id' },
      error: null,
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let createResult
    await act(async () => {
      createResult = await result.current.createTemplate('projects')
    })

    expect(createResult).toEqual({ id: 'new-template-id' })
  })

  it('should create checklist template', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'new-checklist-template-id' },
      error: null,
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let createResult
    await act(async () => {
      createResult = await result.current.createTemplate('checklists')
    })

    expect(createResult).toEqual({ id: 'new-checklist-template-id' })
  })

  it('should create page template', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { id: 'new-page-template-id' },
      error: null,
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let createResult
    await act(async () => {
      createResult = await result.current.createTemplate('pages')
    })

    expect(createResult).toEqual({ id: 'new-page-template-id' })
  })

  it('should return null when user is not logged in for create', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let createResult
    await act(async () => {
      createResult = await result.current.createTemplate('projects')
    })

    expect(createResult).toBeNull()
  })

  it('should return null on create error', async () => {
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let createResult
    await act(async () => {
      createResult = await result.current.createTemplate('projects')
    })

    expect(createResult).toBeNull()
  })

  it('should delete template and refetch', async () => {
    mockDelete.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let deleteResult
    await act(async () => {
      deleteResult = await result.current.deleteTemplate('projects', 'template-1')
    })

    expect(deleteResult).toBe(true)
    // Should have refetched after delete
    expect(mockProjectTemplatesOrder).toHaveBeenCalledTimes(2)
  })

  it('should return false on delete error', async () => {
    mockDelete.mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let deleteResult
    await act(async () => {
      deleteResult = await result.current.deleteTemplate('checklists', 'template-1')
    })

    expect(deleteResult).toBe(false)
  })
})
