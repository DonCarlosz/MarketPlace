import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendOtpEmail = async ({ toEmail, toName = 'Member', otp, purpose = 'signup' }) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'denrichy111@gmail.com';
  const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'oBuy';
  const isForgotPassword = purpose === 'forgot_password';

  const subject = isForgotPassword
    ? `oBuy password reset code: ${otp}`
    : `Your oBuy verification code: ${otp}`;

  const heading = isForgotPassword ? 'Password Reset Code' : 'Email Verification';
  const intro = isForgotPassword
    ? 'Use the 6-digit code below to reset your oBuy password:'
    : 'Welcome to oBuy! Use the 6-digit code below to confirm your email and activate your account:';

  const textContent = `
oBuy Verification

Hello ${toName},

${intro}

Verification Code: ${otp}

This code expires in 10 minutes. Enter it in the app to complete your verification.

If you did not request this code, you can safely ignore this email.

oBuy - Safe, direct neighborhood buying & selling
`.trim();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 24px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <tr>
          <td style="padding: 28px 28px 16px 28px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <img
              src="${process.env.BRAND_ICON_URL || 'https://marketplace-5wy3.onrender.com/brand-icon.png'}"
              alt="oBuy"
              width="48"
              height="48"
              style="display: block; width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 10px auto; background-color: #d94b06;"
            />
            <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">oBuy</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <h2 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${heading}</h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">Hello <strong>${toName}</strong>,</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">${intro}</p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 20px 0;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b83d05; display: inline-block; padding-left: 8px;">${otp}</span>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Expires in 10 minutes</p>
            </div>

            <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              If you did not request this verification, you can safely disregard this message.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">oBuy &bull; Safe, direct neighborhood commerce</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `.trim();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: toName }],
    replyTo: { email: SENDER_EMAIL, name: SENDER_NAME },
    subject,
    textContent,
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
    if (SENDER_EMAIL !== 'denrichy111@gmail.com') {
      console.warn(`[Brevo Email] Sender ${SENDER_EMAIL} failed, falling back to verified sender denrichy111@gmail.com...`);
      payload.sender.email = 'denrichy111@gmail.com';
      const fallbackRes = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const fallbackData = await fallbackRes.json().catch(() => ({}));
      if (fallbackRes.ok) {
        console.log(`[Brevo Email] OTP sent to ${toEmail} successfully via fallback (MessageId: ${fallbackData.messageId})`);
        return { success: true, messageId: fallbackData.messageId };
      }
    }
    const errorMsg = data.message || `Brevo API error (Status ${response.status})`;
    console.error('Failed to send OTP email via Brevo:', data);
    throw new Error(errorMsg);
  }

  console.log(`[Brevo Email] OTP sent to ${toEmail} successfully (MessageId: ${data.messageId})`);
  return { success: true, messageId: data.messageId };
};
