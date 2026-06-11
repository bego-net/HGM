'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pocketbase';
import Badge from '@/components/Badge';

export default function BadgePage({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await pb.collection('registrants').getOne(id);
        if (mounted) {
          setRecord(r);
          // Generate QR locally
          import('qrcode').then(QRCode => {
            const code = r.qrCode || r.id;
            QRCode.toDataURL(code, { margin: 1, width: 256 }).then((url: string) => {
              if (mounted) setQrDataUrl(url);
            });
          });
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load registrant record.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  const handleEmail = async () => {
    setEmailing(true);
    setEmailResult(null);
    try {
      const res = await fetch('/api/confirm-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrantId: record.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Email failed');
      setEmailResult({ ok: true, msg: 'Badge email sent successfully!' });
    } catch (err: any) {
      console.error(err);
      setEmailResult({ ok: false, msg: err.message || 'Failed to send email' });
    } finally {
      setEmailing(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;
  if (!record) return <div className="p-8 text-red-400">Registrant not found.</div>;

  const registrationId = record.qrCode || `EIDS-2025-${record.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <style>{`@media print { body * { visibility: hidden; } .badge-printable, .badge-printable * { visibility: visible; } .badge-printable { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; background: white; } .no-print { display: none !important; } }`}</style>

      <div className="max-w-2xl mx-auto">
        {/* Controls */}
        <div className="no-print mb-6 flex flex-wrap gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition-colors">
            ← Back
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors">
            🖨 Print Badge
          </button>
          <button
            onClick={handleEmail}
            disabled={emailing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors"
          >
            {emailing ? 'Sending…' : '✉ Email to Attendee'}
          </button>
        </div>

        {emailResult && (
          <div className={`no-print mb-4 p-3 rounded-xl text-sm border ${emailResult.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {emailResult.ok ? '✓' : '⚠'} {emailResult.msg}
          </div>
        )}

        {/* Badge preview */}
        <div className="badge-printable">
          <Badge
            firstName={record.firstName}
            lastName={record.lastName}
            organization={record.organization}
            registrationId={registrationId}
            qrDataUrl={qrDataUrl || undefined}
          />
        </div>

        {/* Record info for admin reference */}
        <div className="no-print mt-8 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-slate-400">
          <p><strong className="text-slate-200">Email:</strong> {record.email}</p>
          <p><strong className="text-slate-200">Phone:</strong> {record.phone || '—'}</p>
          <p><strong className="text-slate-200">Status:</strong> {record.status}</p>
          <p><strong className="text-slate-200">Registered:</strong> {record.registeredAt || '—'}</p>
        </div>
      </div>
    </div>
  );
}
