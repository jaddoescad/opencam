import { describe, it, expect, vi } from 'vitest'

// Mock next/headers before any imports
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// Mock createServerClient
const mockExchangeCodeForSession = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}))

describe('Auth Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it('should be defined', async () => {
    // Dynamic import after mocks are set up
    const { GET } = await import('@/app/auth/callback/route')
    expect(GET).toBeDefined()
  })

  it('should handle auth callback with valid code', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const request = new Request('http://localhost:3000/auth/callback?code=valid-code')
    const response = await GET(request)

    expect(response.status).toBe(307) // Redirect
  })

  it('should redirect to login when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid code' },
    })

    const { GET } = await import('@/app/auth/callback/route')

    const request = new Request('http://localhost:3000/auth/callback?code=invalid')
    const response = await GET(request)

    expect(response.headers.get('location')).toContain('/login?error=auth_failed')
  })

  it('should redirect to login when no code provided', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const request = new Request('http://localhost:3000/auth/callback')
    const response = await GET(request)

    expect(response.headers.get('location')).toContain('/login?error=auth_failed')
  })
})
