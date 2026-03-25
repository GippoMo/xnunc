import { NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL    = process.env.RESEND_FROM_EMAIL || 'xNunc <noreply@xnunc.ai>';
// Variabile privata server-side — non esposta al browser
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL || 'adm-web@xnunc.ai';

export async function POST(req) {
  if (!RESEND_API_KEY) {
    // Resend non configurato — log silenzioso, non bloccare l'app
    console.warn('[send-email] RESEND_API_KEY mancante — email non inviata');
    return NextResponse.json({ ok: false, reason: 'not_configured' });
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 }); }

  const { to, subject, text, html } = body;
  if (!to || !subject) {
    return NextResponse.json({ ok: false, reason: 'missing_fields' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        text: text || subject,
        ...(html ? { html } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[send-email] Resend error:', err);
      return NextResponse.json({ ok: false, reason: err }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[send-email] fetch error:', e.message);
    return NextResponse.json({ ok: false, reason: e.message }, { status: 500 });
  }
}
