import nodemailer from 'nodemailer';
import axios from 'axios';
import { ENV } from '../config/env';

/**
 * MSG91 SMTP & API Transporter Manager
 */
let smtpTransporter: nodemailer.Transporter | null = null;

if (ENV.SMTP_USER && ENV.SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS
    }
  });
}

export class Msg91Service {
  /**
   * Universal HTML Email Dispatcher (Supports MSG91 SMTP Transporter + Attachments + REST API)
   */
  static async sendHtmlEmail(
    toEmail: string,
    subject: string,
    htmlContent: string,
    attachments?: { filename: string; content: Buffer; contentType?: string }[]
  ): Promise<boolean> {
    const fromAddress = `"${ENV.MSG91_FROM_NAME}" <${ENV.MSG91_FROM_EMAIL}>`;

    // Strategy 1: Attempt MSG91 SMTP Email Delivery with Attachments
    if (smtpTransporter) {
      try {
        const info = await smtpTransporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject,
          html: htmlContent,
          attachments: attachments || []
        });
        console.log(`📧 [MSG91 SMTP Email Sent] Message ID: ${info.messageId} | To: ${toEmail}`);
        return true;
      } catch (err: any) {
        console.error('❌ [MSG91 SMTP Email Error]:', err.message);
      }
    }

    // Strategy 2: MSG91 v5 REST API Fallback
    if (ENV.MSG91_AUTH_KEY) {
      try {
        const payload: any = {
          to: [{ email: toEmail }],
          from: { email: ENV.MSG91_FROM_EMAIL, name: ENV.MSG91_FROM_NAME },
          domain: ENV.MSG91_DOMAIN,
          subject,
          body: htmlContent
        };

        const response = await axios.post('https://api.msg91.com/api/v5/email/send', payload, {
          headers: {
            authkey: ENV.MSG91_AUTH_KEY,
            'Content-Type': 'application/json'
          }
        });

        console.log(`📧 [MSG91 REST API Email Sent] Status: ${response.data.status} | To: ${toEmail}`);
        return true;
      } catch (error: any) {
        console.error('❌ [MSG91 REST API Email Error]:', error.response?.data || error.message);
      }
    }

    // Strategy 3: Mock Fallback Log for local dev without credentials
    console.log(`\n======================================================`);
    console.log(`📧 [MOCK EMAIL DISPATCH]`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Has Attachment: ${Boolean(attachments && attachments.length > 0)}`);
    console.log(`Body Snippet: ${htmlContent.substring(0, 150)}...`);
    console.log(`======================================================\n`);
    return true;
  }

  /**
   * 1. Send 6-Digit Email OTP (Registration, Login, or Password Reset)
   */
  static async sendOtpEmail(toEmail: string, otp: string, purpose: string): Promise<boolean> {
    const subject = `🔑 ${otp} is your 6-Digit OTP for AlphaaTechh ${purpose}`;

    const htmlContent = `
      <div style="background-color: #000000; color: #FFFFFF; font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #2A2A2A; border-radius: 8px;">
        <div style="border-bottom: 2px solid #E2131F; padding-bottom: 20px; text-align: center;">
          <h1 style="color: #E2131F; font-size: 24px; margin: 0; font-weight: bold; letter-spacing: 2px;">ALPHAATECHH</h1>
          <p style="color: #9A9A9A; font-size: 11px; margin-top: 5px; text-transform: uppercase;">High-Performance PC Parts & Workstation Solutions</p>
        </div>

        <div style="padding: 30px 0; text-align: center;">
          <h2 style="color: #FFFFFF; font-size: 20px; margin-bottom: 10px;">Security Verification Code</h2>
          <p style="color: #9A9A9A; font-size: 14px; margin-bottom: 25px;">Use the 6-digit One-Time Password below to complete your <strong>${purpose}</strong>.</p>
          
          <div style="background-color: #121212; border: 1px solid #E2131F; border-radius: 6px; padding: 20px; display: inline-block; min-width: 200px;">
            <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #E2131F; letter-spacing: 8px;">${otp}</span>
          </div>

          <p style="color: #616161; font-size: 12px; margin-top: 25px;">This OTP code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>

        <div style="border-top: 1px solid #2A2A2A; padding-top: 20px; text-align: center; color: #616161; font-size: 11px;">
          <p>Sent via MSG91 Email Service · AlphaaTechh Computers, Nehru Place, New Delhi</p>
        </div>
      </div>
    `;

    return this.sendHtmlEmail(toEmail, subject, htmlContent);
  }

  /**
   * 2. Send Signup Welcome Email
   */
  static async sendWelcomeEmail(toEmail: string, fullName: string): Promise<boolean> {
    const subject = `🔥 Welcome to AlphaaTechh, ${fullName}!`;

    const htmlContent = `
      <div style="background-color: #000000; color: #FFFFFF; font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #2A2A2A; border-radius: 8px;">
        <div style="border-bottom: 2px solid #E2131F; padding-bottom: 20px;">
          <h1 style="color: #E2131F; font-size: 24px; margin: 0; font-weight: bold;">ALPHAATECHH COMPUTERS</h1>
        </div>

        <div style="padding: 30px 0;">
          <h2 style="color: #FFFFFF; font-size: 22px;">Welcome aboard, ${fullName}!</h2>
          <p style="color: #9A9A9A; font-size: 14px; line-height: 1.6;">Your AlphaaTechh account is verified and ready. You now have access to genuine AMD & Intel processors, benchmarked graphics cards, and our custom PC builder.</p>
          
          <div style="margin: 30px 0;">
            <a href="${ENV.FRONTEND_URL}/build" style="background-color: #E2131F; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; display: inline-block;">START A CUSTOM BUILD →</a>
          </div>

          <p style="color: #9A9A9A; font-size: 13px;">Need help picking parts? Reply directly to this email or call our store concierge.</p>
        </div>

        <div style="border-top: 1px solid #2A2A2A; padding-top: 20px; text-align: center; color: #616161; font-size: 11px;">
          <p>© 2026 AlphaaTechh Computers · Genuine Retail Parts & Workstations</p>
        </div>
      </div>
    `;

    return this.sendHtmlEmail(toEmail, subject, htmlContent);
  }

  /**
   * 3. Send Order Confirmation Email with PDF Invoice Attachment
   */
  static async sendOrderConfirmationEmail(
    toEmail: string,
    customerName: string,
    orderNumber: string,
    totalAmount: string,
    items: any[],
    pdfBuffer?: Buffer
  ): Promise<boolean> {
    const subject = `📦 Order Confirmed #${orderNumber} — AlphaaTechh (Tax Invoice Attached)`;

    const itemsHtml = items
      .map(
        (it) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #2A2A2A; color: #FFFFFF; font-size: 13px;">${it.name || it.product?.name || 'Hardware Component'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #2A2A2A; color: #9A9A9A; font-size: 13px; text-align: center;">${it.quantity || it.qty || 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #2A2A2A; color: #E2131F; font-size: 13px; text-align: right; font-weight: bold;">₹${Number(it.price || 0).toLocaleString('en-IN')}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <div style="background-color: #000000; color: #FFFFFF; font-family: Arial, sans-serif; padding: 40px; max-width: 650px; margin: 0 auto; border: 1px solid #2A2A2A; border-radius: 8px;">
        <div style="border-bottom: 2px solid #E2131F; padding-bottom: 20px;">
          <h1 style="color: #E2131F; font-size: 22px; margin: 0; font-weight: bold;">ALPHAATECHH ORDER CONFIRMATION</h1>
          <p style="color: #9A9A9A; font-size: 12px; margin-top: 5px;">Order Number: <strong style="color: #FFFFFF;">${orderNumber}</strong></p>
        </div>

        <div style="padding: 25px 0;">
          <p style="color: #FFFFFF; font-size: 15px;">Hello ${customerName},</p>
          <p style="color: #9A9A9A; font-size: 14px;">Thank you for your order! Your components have entered our precision assembly line. Your official Tax Invoice PDF is attached to this email.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #2A2A2A;">
            <thead>
              <tr style="background-color: #121212;">
                <th style="padding: 10px; text-align: left; color: #E2131F; font-size: 12px;">ITEM</th>
                <th style="padding: 10px; text-align: center; color: #E2131F; font-size: 12px;">QTY</th>
                <th style="padding: 10px; text-align: right; color: #E2131F; font-size: 12px;">PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; font-size: 18px; color: #E2131F; font-weight: bold; margin-bottom: 30px;">
            Total Amount: ${totalAmount}
          </div>

          <div style="text-align: center;">
            <a href="${ENV.FRONTEND_URL}/confirmation?orderNumber=${orderNumber}" style="background-color: #E2131F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; display: inline-block;">TRACK ASSEMBLY TELEMETRY →</a>
          </div>
        </div>

        <div style="border-top: 1px solid #2A2A2A; padding-top: 20px; text-align: center; color: #616161; font-size: 11px;">
          <p>Sent via MSG91 Email Service · All builds include 3-Year Warranty & On-Site Support</p>
        </div>
      </div>
    `;

    const attachments = pdfBuffer
      ? [
          {
            filename: `INVOICE_${orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      : undefined;

    return this.sendHtmlEmail(toEmail, subject, htmlContent, attachments);
  }

  /**
   * 4. Send Password Reset Successful Email
   */
  static async sendPasswordResetSuccessEmail(toEmail: string, fullName: string): Promise<boolean> {
    const subject = `🔒 Password Reset Successful — AlphaaTechh Account`;

    const htmlContent = `
      <div style="background-color: #000000; color: #FFFFFF; font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #2A2A2A; border-radius: 8px;">
        <div style="border-bottom: 2px solid #E2131F; padding-bottom: 20px; text-align: center;">
          <h1 style="color: #E2131F; font-size: 24px; margin: 0; font-weight: bold;">ALPHAATECHH</h1>
        </div>

        <div style="padding: 30px 0; text-align: center;">
          <h2 style="color: #FFFFFF; font-size: 20px; margin-bottom: 10px;">Password Reset Confirmed</h2>
          <p style="color: #9A9A9A; font-size: 14px; line-height: 1.6;">Hello ${fullName}, your account password was successfully updated. You can now sign in using your new password.</p>
          
          <div style="margin: 30px 0;">
            <a href="${ENV.FRONTEND_URL}" style="background-color: #E2131F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; display: inline-block;">SIGN IN NOW →</a>
          </div>

          <p style="color: #616161; font-size: 12px;">If you did not perform this action, please contact our support team immediately.</p>
        </div>

        <div style="border-top: 1px solid #2A2A2A; padding-top: 20px; text-align: center; color: #616161; font-size: 11px;">
          <p>© 2026 AlphaaTechh Computers · Nehru Place, New Delhi</p>
        </div>
      </div>
    `;

    return this.sendHtmlEmail(toEmail, subject, htmlContent);
  }

  /**
   * 5. Send Status / Assembly Update Email
   */
  static async sendStatusUpdateEmail(
    toEmail: string,
    customerName: string,
    orderNumber: string,
    newStatus: string
  ): Promise<boolean> {
    const subject = `⚙️ Order #${orderNumber} Update: ${newStatus.replace(/_/g, ' ')}`;

    const htmlContent = `
      <div style="background-color: #000000; color: #FFFFFF; font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #2A2A2A; border-radius: 8px;">
        <div style="border-bottom: 2px solid #E2131F; padding-bottom: 15px;">
          <h1 style="color: #E2131F; font-size: 20px; margin: 0;">ALPHAATECHH ASSEMBLY LINE</h1>
        </div>

        <div style="padding: 25px 0;">
          <p style="color: #FFFFFF; font-size: 15px;">Dear ${customerName},</p>
          <p style="color: #9A9A9A; font-size: 14px;">Your order <strong style="color: #FFFFFF;">#${orderNumber}</strong> status has been updated:</p>
          
          <div style="background-color: #121212; border-left: 4px solid #E2131F; padding: 15px; margin: 20px 0;">
            <span style="color: #E2131F; font-size: 12px; text-transform: uppercase; font-weight: bold; display: block;">CURRENT STAGE:</span>
            <span style="color: #FFFFFF; font-size: 18px; font-weight: bold;">${newStatus.replace(/_/g, ' ')}</span>
          </div>

          <p style="color: #9A9A9A; font-size: 13px;">You can view detailed assembly telemetry and invoice directly on your dashboard.</p>
        </div>

        <div style="border-top: 1px solid #2A2A2A; padding-top: 15px; text-align: center; color: #616161; font-size: 11px;">
          <p>Sent via MSG91 Email Service · AlphaaTechh Computers</p>
        </div>
      </div>
    `;

    return this.sendHtmlEmail(toEmail, subject, htmlContent);
  }
}
