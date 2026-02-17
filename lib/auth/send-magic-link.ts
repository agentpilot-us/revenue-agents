/**
 * Send magic link email for landing page authentication
 */

import { sendEmail as resendSendEmail } from '@/lib/tools/resend';

export async function sendMagicLinkEmail(
  email: string,
  campaignId: string,
  token: string,
  companyName: string,
  baseUrl: string = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
): Promise<boolean> {
  const magicLinkUrl = `${baseUrl}/go/${campaignId}/auth/verify?token=${token}`;

  const subject = `Verify your email to access ${companyName}'s resources`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0066FF 0%, #00c2ff 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e1df; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi there,
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Click the button below to verify your email and access ${companyName}'s resources:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLinkUrl}" style="display: inline-block; background: #0066FF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #999; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
            ${magicLinkUrl}
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            This link expires in 15 minutes. If you didn't request this email, you can safely ignore it.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>Powered by AgentPilot</p>
        </div>
      </body>
    </html>
  `;

  const result = await resendSendEmail({
    to: email,
    subject,
    html,
  });

  return result.ok;
}
