import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import QRCode from 'qrcode';
import Resend from 'resend';

const PB_URL = process.env.PB_URL || process.env.NEXT_PUBLIC_PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registrantId } = body;
    if (!registrantId) return NextResponse.json({ success: false, message: 'registrantId is required' }, { status: 400 });

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return NextResponse.json({ success: false, message: 'Server missing PB admin credentials' }, { status: 500 });
    if (!RESEND_API_KEY) return NextResponse.json({ success: false, message: 'Server missing RESEND_API_KEY' }, { status: 500 });

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

    // fetch registrant
    const registrant = await pb.collection('registrants').getOne(registrantId);
    if (!registrant) return NextResponse.json({ success: false, message: 'Registrant not found' }, { status: 404 });

    // generate token and QR
    const token = registrant.qrCode || `EIDS-2025-${registrant.id.slice(0,4).toUpperCase()}`;
    const dataUrl = await QRCode.toDataURL(token, { type: 'image/png', margin: 1, width: 400 });

    // save qrCode (token) and optionally a derived qrImage field
    await pb.collection('registrants').update(registrantId, { qrCode: token });

    // render badge HTML with inline QR image
    const badgeHtml = `
      <div style="width:420px;padding:16px;border:1px solid #ddd;font-family:Arial,Helvetica,sans-serif;color:#071433">
        <div style="background:#071433;color:#fff;padding:8px;font-weight:700">Ethiopia Innovation & Development Summit — March 14–16, 2025</div>
        <div style="display:flex;gap:12px;padding:12px;align-items:center">
          <div style="flex:1">
            <div style="font-size:20px;font-weight:800">${registrant.firstName}</div>
            <div style="font-size:20px;font-weight:800">${registrant.lastName}</div>
            <div style="margin-top:6px;color:#374151">${registrant.organization || ''}</div>
          </div>
          <div style="text-align:center">
            <img src="${dataUrl}" width="120" height="120" />
            <div style="font-family:monospace;margin-top:6px">${token}</div>
          </div>
        </div>
        <div style="background:#071433;color:#fff;padding:8px;text-align:center">Entry · Lunch included · EIDS 2025</div>
      </div>
    `;

    // send email via Resend
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: 'EIDS 2025 <no-reply@eids2025.et>',
      to: registrant.email,
      subject: `Your EIDS 2025 badge is ready — ${registrant.firstName}`,
      html: `<p>Dear ${registrant.firstName},</p><p>Your badge is ready. See it below and attached.</p>${badgeHtml}<p>Regards,<br/>EIDS Team</p>`
    });

    // update registrant status to confirmed
    await pb.collection('registrants').update(registrantId, { status: 'confirmed' });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('confirm-registration error', err);
    return NextResponse.json({ success: false, message: err.message || String(err) }, { status: 500 });
  }
}
