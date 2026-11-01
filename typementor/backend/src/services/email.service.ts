import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} from '../config/env';

export interface EmailSendResult {
  delivered: boolean;
  devMode: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  public isConfigured(): boolean {
    return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Generates a modern, branded HTML template for the 6-digit OTP email.
   */
  private generateOtpHtml(name: string, code: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TypeMentor AI - Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #27272a; background: linear-gradient(180deg, rgba(59,130,246,0.12) 0%, rgba(24,24,27,0) 100%);">
              <div style="display: inline-block; padding: 10px 16px; border-radius: 12px; background-color: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); margin-bottom: 12px;">
                <span style="color: #60a5fa; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">TypeMentor AI</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Verify Your Email</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                Hello <strong>${name || 'Typist'}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Thank you for joining <strong>TypeMentor AI</strong>. To secure your account and verify your email ownership, enter this 6-digit verification code:
              </p>

              <!-- OTP Box -->
              <div style="text-align: center; margin: 28px 0;">
                <div style="display: inline-block; background-color: #09090b; border: 2px solid #3b82f6; border-radius: 14px; padding: 18px 36px; box-shadow: 0 0 25px rgba(59,130,246,0.25);">
                  <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #60a5fa; margin-left: 10px;">${code}</span>
                </div>
              </div>

              <!-- Expiry Alert -->
              <p style="margin: 20px 0 0 0; font-size: 13px; text-align: center; color: #71717a;">
                ⏱️ This code expires in <strong style="color: #e4e4e7;">10 minutes</strong>.
              </p>

              <!-- Security notice -->
              <div style="margin-top: 28px; padding: 14px 16px; border-radius: 10px; background-color: rgba(39,39,42,0.6); border: 1px solid #27272a; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                <strong style="color: #f4f4f5;">Security Notice:</strong> TypeMentor AI staff will never ask for this code. If you did not sign up on TypeMentor AI, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; text-align: center; border-top: 1px solid #27272a; background-color: #121214; font-size: 11px; color: #71717a;">
              &copy; ${new Date().getFullYear()} TypeMentor AI. All rights reserved. Adaptive telemetry & tactile typing coach.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Sends an OTP verification email to the user.
   * If SMTP is not configured, logs to console (dev mode fallback) without throwing.
   */
  public async sendOtpEmail(email: string, code: string, name: string): Promise<EmailSendResult> {
    const subject = `Your TypeMentor AI Verification Code: ${code}`;
    const textContent = `Hello ${name || 'Typist'},\n\nYour TypeMentor AI 6-digit verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not request this code, please ignore this email.\n\nTypeMentor AI Security`;

    if (!this.isConfigured()) {
      // Development console fallback
      console.log(`\n=============================================================`);
      console.log(`[Email OTP Dev Console Fallback]`);
      console.log(`Recipient : ${email}`);
      console.log(`Recipient Name: ${name || 'User'}`);
      console.log(`Verification Code: >>> ${code} <<<`);
      console.log(`Valid for: 10 minutes`);
      console.log(`=============================================================\n`);

      return {
        delivered: true,
        devMode: true,
        messageId: 'dev-console-' + Date.now(),
      };
    }

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to: email,
        subject,
        text: textContent,
        html: this.generateOtpHtml(name, code),
      });

      console.log(`[Email Service] Sent verification OTP to ${email}. MessageId: ${info.messageId}`);
      return {
        delivered: true,
        devMode: false,
        messageId: info.messageId,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Email Service] Failed to send email to ${email}:`, errMsg);
      return {
        delivered: false,
        devMode: false,
        error: errMsg,
      };
    }
  }
}

export const emailService = new EmailService();
