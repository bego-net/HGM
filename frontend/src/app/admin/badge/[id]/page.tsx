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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await pb.collection('registrants').getOne(id);
        if (mounted) setRecord(r);
      } catch (err) {
        console.error(err);
        setError('Failed to load registrant');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!record) return <div className="p-8 text-red-400">Registrant not found.</div>;

  const registrationId = record.qrCode || `EIDS-2025-${record.id.slice(0,4).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = async () => {
    setEmailing(true);
    setError(null);
    try {
      const res = await fetch('/api/confirm-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrantId: record.id })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Email failed');
      alert('Email sent');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send email');
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <style>{`@media print { body * { visibility: hidden; } .badge-printable, .badge-printable * { visibility: visible; } .badge-printable { position: absolute; left: 0; top: 0; } }`}</style>

      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex gap-3">
          <button onClick={() => router.back()} className="px-3 py-2 bg-slate-800 rounded">Back</button>
          <button onClick={handlePrint} className="px-3 py-2 bg-emerald-600 rounded">Print badge</button>
          <button onClick={handleEmail} disabled={emailing} className="px-3 py-2 bg-indigo-600 rounded">{emailing ? 'Sending…' : 'Email to attendee'}</button>
        </div>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        <div className="badge-printable inline-block">
          <Badge
            firstName={record.firstName}
            lastName={record.lastName}
            organization={record.organization}
            registrationId={registrationId}
            qrDataUrl={record.qrImage || undefined}
          />
        </div>
      </div>
    </div>
  );
}
