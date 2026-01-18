import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock environment variables
vi.stubEnv('POSTMARK_API_TOKEN', 'test-api-token')
vi.stubEnv('EMAIL_FROM', 'test@opencam.com')

// Mock postmark before importing the route handler
const mockSendEmail = vi.fn()

vi.mock('postmark', () => {
  return {
    ServerClient: class MockServerClient {
      sendEmail = mockSendEmail
    },
  }
})

// Import after mocking
import { POST } from '@/app/api/send-invite/route'

describe('POST /api/send-invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue({ MessageID: 'test-message-id' })
  })

  const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest('http://localhost:3000/api/send-invite', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should send invite email successfully', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
      role: 'Standard',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        From: 'test@opencam.com',
        To: 'invitee@example.com',
        Subject: 'John Doe invited you to OpenCam',
        MessageStream: 'outbound',
      })
    )
  })

  it('should return 400 when email is missing', async () => {
    const request = createRequest({
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Missing required fields' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('should return 400 when inviteLink is missing', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Missing required fields' })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('should handle missing inviterName gracefully', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviteLink: 'https://opencam.com/invite/abc123',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        Subject: 'Someone invited you to OpenCam',
      })
    )
  })

  it('should handle missing role gracefully', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it('should include role in email body when provided', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
      role: 'Admin',
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        HtmlBody: expect.stringContaining('Admin'),
        TextBody: expect.stringContaining('Admin'),
      })
    )
  })

  it('should include invite link in email body', async () => {
    const inviteLink = 'https://opencam.com/invite/unique-token-123'
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink,
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        HtmlBody: expect.stringContaining(inviteLink),
        TextBody: expect.stringContaining(inviteLink),
      })
    )
  })

  it('should return 500 when email sending fails', async () => {
    mockSendEmail.mockRejectedValue(new Error('Postmark API error'))

    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to send email' })
  })

  it('should include both HTML and text body in email', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
      role: 'Standard',
    })

    await POST(request)

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        HtmlBody: expect.any(String),
        TextBody: expect.any(String),
      })
    )

    const callArgs = mockSendEmail.mock.calls[0][0]
    expect(callArgs.HtmlBody).toContain('<!DOCTYPE html>')
    expect(callArgs.HtmlBody).toContain("You've been invited!")
    expect(callArgs.TextBody).toContain("You've been invited to OpenCam!")
  })

  it('should sanitize email properly in request', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
    })

    await POST(request)

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        To: 'invitee@example.com',
      })
    )
  })

  it('should handle empty email string', async () => {
    const request = createRequest({
      email: '',
      inviterName: 'John Doe',
      inviteLink: 'https://opencam.com/invite/abc123',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Missing required fields' })
  })

  it('should handle empty inviteLink string', async () => {
    const request = createRequest({
      email: 'invitee@example.com',
      inviterName: 'John Doe',
      inviteLink: '',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Missing required fields' })
  })
})
