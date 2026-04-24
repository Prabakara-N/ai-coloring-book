import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

interface Body {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  honeypot?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.honeypot && body.honeypot.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!message || message.length < 5) {
    return NextResponse.json(
      { error: "Please write a message (at least 5 characters)." },
      { status: 400 }
    );
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message too long (max 5000 characters)." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "ColorBook AI <onboarding@resend.dev>";
  const to = process.env.CONTACT_TO ?? "hello@colorbook.ai";
  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set — accepting but not sending.");
    return NextResponse.json({
      ok: true,
      queued: false,
      note: "Received but email is not configured on the server.",
    });
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#05050a;color:#fafafa;padding:24px;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table width="560" cellspacing="0" cellpadding="0" style="background:#0a0a15;border:1px solid rgba(139,92,246,.2);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,.08);">
                <h1 style="margin:0;font-size:20px;color:#fff;">📬 New message from ColorBook AI</h1>
                <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Submitted via /contact</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.65;">
                  <tr><td style="color:#a1a1aa;padding:4px 0;width:90px;">From</td><td style="color:#fff;"><strong>${esc(name)}</strong> &lt;${esc(email)}&gt;</td></tr>
                  ${subject ? `<tr><td style="color:#a1a1aa;padding:4px 0;">Subject</td><td style="color:#fff;">${esc(subject)}</td></tr>` : ""}
                </table>
                <div style="margin-top:18px;padding:16px;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.25);border-radius:12px;color:#e4e4e7;font-size:14px;line-height:1.7;white-space:pre-wrap;">${esc(message)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: subject
        ? `[ColorBook AI] ${subject}`
        : `[ColorBook AI] New message from ${name}`,
      html,
    });
    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed.";
    console.error("[contact]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
