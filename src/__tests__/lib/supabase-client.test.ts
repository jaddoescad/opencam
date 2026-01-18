import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/client'

// Mock createBrowserClient
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  }),
}))

describe('createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a Supabase client instance', () => {
    const client = createClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.from).toBeDefined()
  })

  it('should create a client with auth capabilities', () => {
    const client = createClient()
    expect(client.auth.getUser).toBeDefined()
  })

  it('should create a client with database capabilities', () => {
    const client = createClient()
    expect(typeof client.from).toBe('function')
  })
})
