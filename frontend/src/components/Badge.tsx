import React from 'react';

interface BadgeProps {
  firstName: string;
  lastName: string;
  organization: string;
  registrationId: string;   // the qrCode token e.g. EIDS-2025-ABCDEF
  qrDataUrl?: string;       // base64 PNG data URL (optional — fallback to external API)
}

export default function Badge({ firstName, lastName, organization, registrationId, qrDataUrl }: BadgeProps) {
  const qrSrc = qrDataUrl
    ? qrDataUrl
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registrationId)}`;

  return (
    <div
      style={{
        width: 420,
        border: '2px solid #071433',
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
        background: '#ffffff',
        color: '#071433',
      }}
    >
      {/* Header */}
      <div style={{ background: '#071433', color: '#fff', padding: '10px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 }}>
          Ethiopia Innovation &amp; Development Summit
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>EIDS 2025 · March 14–16, 2025</div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{firstName}</div>
          <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{lastName}</div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{organization}</div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', marginTop: 8, letterSpacing: 1 }}>
            {registrationId}
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR Code" width={120} height={120} style={{ display: 'block' }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#071433', color: '#fff', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, opacity: 0.8 }}>Entry · Lunch included</span>
        <span style={{ fontSize: 11, fontWeight: 700 }}>EIDS 2025</span>
      </div>
    </div>
  );
}
