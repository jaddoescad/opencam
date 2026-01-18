import { NextRequest, NextResponse } from 'next/server'
import * as postmark from 'postmark'

export async function POST(request: NextRequest) {
  try {
    const client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN || '')
    const { email, inviterName, inviteLink, role } = await request.json()

    if (!email || !inviteLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 32px; text-align: center;">
              <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0;">OpenCam</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
                You've been invited!
              </h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                <strong>${inviterName || 'Someone'}</strong> invited you to take and share job photos on OpenCam${role ? ` as a <strong>${role}</strong>` : ''}.
              </p>
              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                OpenCam makes it easy to capture, organize, and share photos from the job site. Click the button below to set up your account and get started.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px;">
                      Set Up Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 32px 0 0 0;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #2563eb; font-size: 14px; line-height: 20px; margin: 8px 0 0 0; text-align: center; word-break: break-all;">
                ${inviteLink}
              </p>
            </td>
          </tr>
        </table>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          &copy; ${new Date().getFullYear()} OpenCam. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`

    const textBody = `
You've been invited to OpenCam!

${inviterName || 'Someone'} invited you to take and share job photos on OpenCam${role ? ` as a ${role}` : ''}.

OpenCam makes it easy to capture, organize, and share photos from the job site.

Set up your account here: ${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
`

    await client.sendEmail({
      From: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      To: email,
      Subject: `${inviterName || 'Someone'} invited you to OpenCam`,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: 'outbound',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending invite email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
