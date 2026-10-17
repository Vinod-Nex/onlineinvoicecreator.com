/**
 * Email dispatch provider interface and implementations
 * Supports Resend, Postmark, SendGrid, and Generic Webhook HTTP APIs.
 */
import type { Env, ValidatedContactInput } from './types';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends contact email using the configured provider.
 */
export async function sendContactEmail(
  contact: ValidatedContactInput,
  env: Env
): Promise<SendEmailResult> {
  const provider = env.EMAIL_PROVIDER || 'resend';
  const toAddress = env.CONTACT_EMAIL_TO || 'support@onlineinvoicecreator.com';
  const fromAddress = env.CONTACT_EMAIL_FROM || 'contact@onlineinvoicecreator.com';

  const subjectLine = `[Contact Form] ${contact.subject} - ${contact.name}`;
  const textBody = [
    `New contact submission via Online Invoice Creator:`,
    `--------------------------------------------------`,
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Subject: ${contact.subject}`,
    `--------------------------------------------------`,
    `Message:`,
    contact.message,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5; margin-bottom: 8px;">New Contact Message</h2>
      <p style="font-size: 14px; color: #6b7280; margin-top: 0;">Received from onlineinvoicecreator.com contact form.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
        <tr>
          <td style="padding: 10px 16px; font-weight: bold; width: 120px; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Name:</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(contact.name)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Email:</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb;">
            <a href="mailto:${escapeHtml(contact.email)}" style="color: #4f46e5; text-decoration: none;">${escapeHtml(contact.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 16px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Subject:</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(contact.subject)}</td>
        </tr>
      </table>

      <h3 style="font-size: 15px; color: #111827; margin-bottom: 6px;">Message Content:</h3>
      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; color: #1f2937;">
        ${escapeHtml(contact.message)}
      </div>

      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
        Online Invoice Creator &bull; 100% Client-Side Privacy &bull; Zero Server Storage of Invoices
      </p>
    </div>
  `;

  // Resend
  if (provider === 'resend') {
    if (!env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set. Recording contact message in mock mode.');
      return { success: true, messageId: 'mock-resend-id' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toAddress],
          reply_to: contact.email,
          subject: subjectLine,
          text: textBody,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `Resend error (${res.status}): ${errorText}` };
      }

      const resData = (await res.json()) as { id?: string };
      return { success: true, messageId: resData.id };
    } catch (e) {
      return {
        success: false,
        error: `Resend fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // Postmark
  if (provider === 'postmark') {
    if (!env.POSTMARK_SERVER_TOKEN) {
      console.warn('POSTMARK_SERVER_TOKEN not set. Recording contact message in mock mode.');
      return { success: true, messageId: 'mock-postmark-id' };
    }

    try {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: fromAddress,
          To: toAddress,
          ReplyTo: contact.email,
          Subject: subjectLine,
          TextBody: textBody,
          HtmlBody: htmlBody,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `Postmark error (${res.status}): ${errorText}` };
      }

      const resData = (await res.json()) as { MessageID?: string };
      return { success: true, messageId: resData.MessageID };
    } catch (e) {
      return {
        success: false,
        error: `Postmark fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // SendGrid
  if (provider === 'sendgrid') {
    if (!env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not set. Recording contact message in mock mode.');
      return { success: true, messageId: 'mock-sendgrid-id' };
    }

    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: toAddress }],
            },
          ],
          from: { email: fromAddress },
          reply_to: { email: contact.email, name: contact.name },
          subject: subjectLine,
          content: [
            { type: 'text/plain', value: textBody },
            { type: 'text/html', value: htmlBody },
          ],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `SendGrid error (${res.status}): ${errorText}` };
      }

      return { success: true, messageId: 'sendgrid-accepted' };
    } catch (e) {
      return {
        success: false,
        error: `SendGrid fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // Webhook
  if (provider === 'webhook') {
    if (!env.EMAIL_WEBHOOK_URL) {
      console.warn('EMAIL_WEBHOOK_URL not set. Recording contact message in mock mode.');
      return { success: true, messageId: 'mock-webhook-id' };
    }

    try {
      const res = await fetch(env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          subject: subjectLine,
          text: textBody,
          html: htmlBody,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `Webhook error (${res.status}): ${errorText}` };
      }

      return { success: true, messageId: 'webhook-delivered' };
    } catch (e) {
      return {
        success: false,
        error: `Webhook fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  return { success: false, error: `Unsupported email provider: ${provider}` };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
