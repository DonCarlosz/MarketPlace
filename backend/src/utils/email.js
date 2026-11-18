import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendOtpEmail = async ({ toEmail, toName = 'Member', otp, purpose = 'signup' }) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'akhuemokhanisaiah@gmail.com';
  const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'LocalMarket';
  const isForgotPassword = purpose === 'forgot_password';
  const subject = isForgotPassword
    ? `LocalMarket: Password Reset Code (${otp})`
    : `LocalMarket: Account Verification Code (${otp})`;

  const heading = isForgotPassword ? 'Password Reset Verification' : 'Welcome to LocalMarket';
  const intro = isForgotPassword
    ? 'We received a request to reset your password. Use the verification code below to authorize this change:'
    : 'Thank you for registering on LocalMarket. Use the verification code below to confirm your email and activate your account:';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 24px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <tr>
          <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; font-weight: 900; font-size: 22px; text-align: center; margin-bottom: 10px;">
              LM
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">LocalMarket</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Direct Community Commerce</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 32px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1e293b;">${heading}</h2>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Hello <strong>${toName}</strong>,</p>
            <p style="margin: 0 0 24px 0; font-size: 13.5px; line-height: 1.6; color: #475569;">${intro}</p>

            <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
              <span style="font-family: 'Courier New', monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #4338ca; display: inline-block; padding-left: 10px;">${otp}</span>
              <p style="margin: 8px 0 0 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Valid for 10 minutes</p>
            </div>

            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 12px 16px; margin: 0 0 20px 0;">
              <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.4;">
                <strong>Security reminder:</strong> Never share this code with anyone. LocalMarket staff will never ask for your verification code.
              </p>
            </div>

            <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
              If you did not request this verification code, please ignore this email or contact support if you suspect unauthorized activity.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 32px 28px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin: 0 0 4px 0; font-size: 11px; color: #94a3b8;">LocalMarket Nigeria: Safe, direct neighborhood buying & selling.</p>
            <p style="margin: 0; font-size: 11px; color: #cbd5e1;">&copy; ${new Date().getFullYear()} LocalMarket. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: toName }],
    subject,
    htmlContent,
  };

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Brevo API error (Status ${response.status})`;
    console.error('Failed to send OTP email via Brevo:', data);
    throw new Error(errorMsg);
  }

  console.log(`[Brevo Email] OTP sent to ${toEmail} successfully (MessageId: ${data.messageId})`);
  return { success: true, messageId: data.messageId };
};
