import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

export interface MailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

/** Brand accent, used across the templates. */
const ACCENT = "#4f6ef7";
const DARK = "#0f172a";
const MUTED = "#64748b";
const BG = "#f4f6fb";

let _transporter: Transporter | null = null;
let _transportFailed = false;

/**
 * Builds (lazily) a nodemailer transporter for Gmail SMTP using an app
 * password (Google → Security → "App passwords"). Opt-in: when `SMTP_USER` or
 * `SMTP_PASS` is missing the mailer silently no-ops and returns `false`.
 */
function getTransporter(): Transporter | null {
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (!user || !pass) {
    if (!_transportFailed) {
      logger.warn("MAIL: disabled (SMTP_USER / SMTP_PASS not configured)");
      _transportFailed = true;
    }
    return null;
  }
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user, pass },
  });
  return _transporter;
}

function siteName(): string {
  return env.SITE_NAME ?? "Portfolio";
}

/** Escape HTML so user-provided copy can be embedded safely. */
export function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Preserve line breaks in injected text (already escaped). */
function toLines(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br/>");
}

/**
 * Modern, responsive email shell (inline styles + table layout for maximum
 * client compatibility). `bodyHtml` is the inner, fully-styled content.
 */
function layout(opts: { title: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }): string {
  const { title, bodyHtml } = opts;
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `
      <tr>
        <td align="center" style="padding: 8px 0 4px;">
          <a href="${escapeHtml(opts.ctaUrl)}"
             style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
            ${escapeHtml(opts.ctaLabel)}
          </a>
        </td>
      </tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr><td align="center" style="padding: 40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6eaf6;box-shadow:0 12px 40px rgba(15,23,42,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${ACCENT} 0%,#7c5cff 100%);padding:32px 36px;">
            <table role="presentation" width="100%"><tr>
              <td>
                <div style="font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:600;">${escapeHtml(siteName())}</div>
                <div style="font-size:22px;color:#ffffff;font-weight:700;margin-top:6px;line-height:1.3;">${escapeHtml(title)}</div>
              </td>
              <td align="right" valign="middle">
                <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.18);display:inline-block;text-align:center;line-height:44px;font-size:20px;">✦</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding: 32px 36px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${bodyHtml}
            ${cta}
          </table>
        </td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 20px 36px 26px;border-top:1px solid #eef1f8;background:#fafbfe;">
            <div style="font-size:12px;color:${MUTED};line-height:1.6;">
              © ${new Date().getFullYear()} ${escapeHtml(siteName())} · Sent automatically from the portfolio contact system.<br/>
              This is an automated message — replies to this email reach the site owner directly.
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Text label pair used inside cards (Last name, email, etc.). */
function p(label: string, value: string, isHtmlValue = false): string {
  const rendered = isHtmlValue ? value : escapeHtml(value);
  return `
    <tr>
      <td style="padding:10px 0;vertical-align:top;">
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};font-weight:600;margin-bottom:3px;">${escapeHtml(label)}</div>
        ${rendered}
      </td>
    </tr>`;
}

interface ContactNotification {
  name: string;
  email: string;
  message: string;
  subject?: string | null;
}

/** Branded new-message notification sent to the site owner. */
export async function notifyNewContact(input: ContactNotification): Promise<boolean> {
  const recipient = env.CONTACT_NOTIFY_EMAIL;
  if (!recipient) return false;

  const { name, email, message, subject } = input;
  const body = `
    <tr>
      <td style="padding:14px 18px;background:${BG};border-radius:14px;border:1px solid #e6eaf6;">
        <table role="presentation" width="100%">
          ${p("From", name)}
          ${p("Email", `<a href="mailto:${escapeHtml(email)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(email)}</a>`, true)}
          ${subject ? p("Subject", subject) : ""}
          <tr><td style="padding:10px 0;"><div style="height:1px;background:#e6eaf6;"></div></td></tr>
          ${p("Message", `<div style="font-size:14px;color:${DARK};line-height:1.6;">${toLines(message)}</div>`, true)}
        </table>
      </td>
    </tr>`;

  const html = layout({
    title: "You have a new message",
    bodyHtml: body,
    ctaLabel: "Open inbox",
    ctaUrl: env.ADMIN_URL ?? undefined,
  });

  return sendEmail({
    to: recipient,
    subject: subject ? `New message: ${subject}` : `New portfolio message from ${name}`,
    html,
    text: `New message from ${name} <${email}>\n\n${message}`,
  });
}

interface ReplyInput {
  to: string;
  recipientName: string;
  reply: string;
  originalSubject?: string | null;
  quoted?: string;
}

/** Branded reply sent back to the original message sender. */
export async function sendMessageReply(input: ReplyInput): Promise<boolean> {
  const { to, recipientName, reply, originalSubject, quoted } = input;

  const body = `
    <tr><td style="font-size:14px;color:${DARK};line-height:1.75;">Hi ${escapeHtml(recipientName)},</td></tr>
    <tr><td style="font-size:14px;color:${DARK};line-height:1.75;padding-top:6px;">${toLines(reply)}</td></tr>
    <tr><td style="padding:18px 0;"/></tr>
    ${quoted
      ? `<tr><td>
          <div style="border-left:3px solid #cbd5e1;padding:10px 16px;color:${MUTED};font-size:13px;line-height:1.6;background:${BG};border-radius:0 12px 12px 0;">
            ${toLines(quoted)}
          </div>
        </td></tr>`
      : ""}
    <tr><td style="padding-top:18px;font-size:13px;color:${MUTED};">Best regards,<br/><span style="color:${DARK};font-weight:600;">${escapeHtml(siteName())}</span></td></tr>`;

  const html = layout({
    title: "Thanks for reaching out",
    bodyHtml: body,
  });

  return sendEmail({
    to,
    subject: originalSubject ? `Re: ${originalSubject}` : `Re: Your message to ${siteName()}`,
    html,
    text: `Hi ${recipientName},\n\n${reply}`,
  });
}

/**
 * Sends an email through the configured Gmail SMTP account.
 * Returns `false` (and logs) when SMTP is not configured or delivery fails.
 */
export async function sendEmail(message: MailMessage): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM ?? env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      ...(message.text ? { text: message.text } : {}),
      ...(message.html ? { html: message.html } : {}),
    });
    logger.info({ to: message.to, subject: message.subject }, "MAIL: sent");
    return true;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "MAIL: exception");
    return false;
  }
}
