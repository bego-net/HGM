import React from 'react';

type Props = {
  firstName: string;
  lastName: string;
  organization?: string;
  registrationId: string;
  qrDataUrl?: string; // base64 data URL
};

export default function Badge({ firstName, lastName, organization, registrationId, qrDataUrl }: Props) {
  return (
    <div style={{ width: '105mm', height: '148mm', boxSizing: 'border-box', background: '#fff', color: '#0f172a', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ height: 48, background: '#071433', color: '#fff', display: 'flex', alignItems: 'center', padding: '6px 10px', fontSize: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Ethiopia Innovation & Development Summit</div>
          <div style={{ fontSize: 10, opacity: 0.9 }}>March 14–16, 2025 — Addis Ababa</div>
        </div>
        <div style={{ marginLeft: 8 }}>
          <div style={{ padding: '4px 8px', background: '#e6f6ef', color: '#044e2b', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>Participant</div>
        </div>
      </div>

      <div style={{ display: 'flex', padding: 16, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: '1.02' }}>{firstName}</div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: '1.02' }}>{lastName}</div>
          {organization && <div style={{ marginTop: 8, fontSize: 14, color: '#374151' }}>{organization}</div>}
        </div>

        <div style={{ width: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR Code" width={110} height={110} style={{ borderRadius: 6, border: '1px solid #e6e6e6' }} />
          ) : (
            <div style={{ width: 110, height: 110, background: '#f3f4f6', borderRadius: 6 }} />
          )}
          <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>{registrationId}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, background: '#071433', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
        Entry · Lunch included · EIDS 2025
      </div>
    </div>
  );
}
