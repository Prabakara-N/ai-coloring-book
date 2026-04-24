import { NextResponse } from "next/server";
import { Resend } from "resend";
import { findCategory } from "@/lib/prompts";

export const runtime = "nodejs";

interface Body {
  email?: string;
  categorySlug?: string;
  source?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const slug = (body.categorySlug ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  const category = slug ? findCategory(slug) : null;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "ColorBook AI <onboarding@resend.dev>";
  if (!apiKey) {
    console.warn("[leads/subscribe] RESEND_API_KEY not set — skipping email send.");
    return NextResponse.json({
      ok: true,
      queued: false,
      note: "Received but email is not configured on the server.",
    });
  }

  try {
    const resend = new Resend(apiKey);
    const categoryName = category?.name ?? "coloring pages";
    const categoryIcon = category?.icon ?? "🎨";
    const subject = category
      ? `${categoryIcon} Your free ${categoryName} coloring pages`
      : `${categoryIcon} Your free coloring pages from ColorBook AI`;

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#05050a;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background:#05050a;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#1a0d2e 0%,#0a0a15 100%);border:1px solid rgba(168,85,247,.2);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:40px 32px 24px;text-align:center;">
                <div style="font-size:48px;margin-bottom:8px;">${categoryIcon}</div>
                <h1 style="margin:0 0 8px;font-size:28px;color:#fff;letter-spacing:-0.5px;">Your pages are on the way</h1>
                <p style="margin:0;color:#a1a1aa;font-size:15px;">
                  Thanks for subscribing — we've set aside 5 free ${categoryName} pages for you.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:20px;">
                  <p style="margin:0 0 12px;color:#e4e4e7;font-size:14px;line-height:1.6;">
                    We're prepping the PDF now. It'll land in your inbox in the next few minutes.
                    In the meantime:
                  </p>
                  <ul style="margin:0;padding-left:20px;color:#a1a1aa;font-size:14px;line-height:1.8;">
                    <li>Try our AI generator — make your own book in minutes</li>
                    <li>Browse the full gallery of 280 curated prompts</li>
                    <li>Reply to this email if anything breaks</li>
                  </ul>
                </div>
                <div style="text-align:center;margin-top:28px;">
                  <a href="https://colorbook.ai/generate" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#a855f7,#ec4899,#f59e0b);color:#fff;text-decoration:none;font-weight:600;font-size:14px;">
                    Open the generator →
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid rgba(255,255,255,.08);text-align:center;color:#71717a;font-size:12px;">
                You're getting this because you requested free coloring pages at colorbook.ai.<br/>
                <a href="#" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a> · Made with ♥ in Tiruppur
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    await resend.emails.send({ from, to: email, subject, html });
    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed.";
    console.error("[leads/subscribe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
