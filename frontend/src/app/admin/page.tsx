'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pocketbase';
import ReceiptModal from './components/ReceiptModal';

type Registrant = any;

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [filter, setFilter] = useState<'all'|'pending'|'confirmed'|'rejected'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Registrant|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push('/admin/login');
      return;
    }

    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const list = await pb.collection('registrants').getFullList({ sort: '-created' });
        if (!mounted) return;
        setRegistrants(list as any);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load registrants');
      } finally {
        setLoading(false);
      }
    }

    load();

    // subscribe to real-time changes
    const unsubscribe = pb.collection('registrants').subscribe('*', (e) => {
      // reload quickly; for simplicity refetch list
      pb.collection('registrants').getFullList({ sort: '-created' }).then((list) => setRegistrants(list as any)).catch(console.error);
    });

    return () => {
      mounted = false;
      try { pb.collection('registrants').unsubscribe(unsubscribe); } catch (e) {}
    };
  }, [router]);

  const counts = useMemo(() => {
    const total = registrants.length;
    const pending = registrants.filter(r => r.status === 'pending').length;
    const confirmed = registrants.filter(r => r.status === 'confirmed').length;
    const rejected = registrants.filter(r => r.status === 'rejected').length;
    return { total, pending, confirmed, rejected };
  }, [registrants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrants.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase();
      return name.includes(q) || (r.email || '').toLowerCase().includes(q) || (r.organization || '').toLowerCase().includes(q);
    });
  }, [registrants, filter, query]);

  const handleAction = async (id: string, action: 'confirm'|'reject'|'restore') => {
    setError(null);
    try {
      const status = action === 'confirm' ? 'confirmed' : action === 'reject' ? 'rejected' : 'pending';
      await pb.collection('registrants').update(id, { status });
      const list = await pb.collection('registrants').getFullList({ sort: '-created' });
      setRegistrants(list as any);
    } catch (err: any) {
      console.error(err);
      setError('Failed to update status');
    }
  };

  const openReceipt = (record: Registrant) => {
    setSelected(record);
    setModalOpen(true);
  };

  const printAllBadges = () => {
    const confirmed = registrants.filter(r => r.status === 'confirmed');
    const popup = window.open('', '_blank');
    if (!popup) return;
    const html = [`<html><head><title>Print Badges</title><style>body{font-family:Arial} .badge{width:280px;height:180px;border:1px solid #222;padding:12px;margin:8px;display:inline-block;vertical-align:top}</style></head><body>`];
    confirmed.forEach((r) => {
      const qr = encodeURIComponent(r.qrCode || '');
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qr}`;
      html.push(`<div class="badge"><h3 style="margin:0">${r.firstName || ''} ${r.lastName || ''}</h3><p style="margin:4px 0">${r.organization || ''}</p><img src="${qrUrl}" style="width:120px;height:120px;"/></div>`);
    });
    html.push('</body></html>');
    popup.document.write(html.join(''));
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 500);
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading registrants…</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            {filter === 'confirmed' && (
              <button onClick={printAllBadges} className="bg-emerald-600 px-3 py-2 rounded font-semibold">Print all badges</button>
            )}
            <button className="px-3 py-2 rounded bg-slate-800" onClick={() => { pb.authStore.clear(); router.push('/admin/login'); }}>Sign out</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-900 rounded"> <div className="text-sm text-slate-400">Total</div> <div className="text-xl font-bold">{counts.total}</div></div>
          <div className="p-4 bg-slate-900 rounded"> <div className="text-sm text-slate-400">Pending</div> <div className="text-xl font-bold">{counts.pending}</div></div>
          <div className="p-4 bg-slate-900 rounded"> <div className="text-sm text-slate-400">Confirmed</div> <div className="text-xl font-bold">{counts.confirmed}</div></div>
          <div className="p-4 bg-slate-900 rounded"> <div className="text-sm text-slate-400">Rejected</div> <div className="text-xl font-bold">{counts.rejected}</div></div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            {['all','pending','confirmed','rejected'].map((t) => (
              <button key={t} onClick={() => setFilter(t as any)} className={`px-3 py-2 rounded ${filter===t? 'bg-teal-500 text-slate-950':'bg-slate-800 text-slate-300'}`}>{t.toUpperCase()}</button>
            ))}
          </div>

          <div>
            <input placeholder="Search name, email or org" value={query} onChange={(e) => setQuery(e.target.value)} className="px-3 py-2 rounded bg-slate-900 border border-slate-800" />
          </div>
        </div>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        <div className="bg-slate-900 rounded overflow-auto border border-slate-800">
          <table className="w-full table-auto">
            <thead className="text-slate-400 text-sm">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Organization</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-950/40">
                  <td className="px-4 py-3">{r.firstName} {r.lastName}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.organization}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3 space-x-2">
                    {r.paymentFile && <button onClick={() => openReceipt(r)} className="px-2 py-1 bg-slate-800 rounded">Receipt</button>}
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => handleAction(r.id, 'confirm')} className="px-2 py-1 bg-emerald-600 rounded">Confirm</button>
                        <button onClick={() => handleAction(r.id, 'reject')} className="px-2 py-1 bg-red-600 rounded">Reject</button>
                      </>
                    )}
                    {r.status === 'confirmed' && (
                      <a href={`/admin/badge/${r.id}`} className="px-2 py-1 bg-indigo-600 rounded">Badge</a>
                    )}
                    {r.status === 'rejected' && (
                      <button onClick={() => handleAction(r.id, 'restore')} className="px-2 py-1 bg-yellow-600 rounded">Restore</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal open={modalOpen} onClose={() => setModalOpen(false)} record={selected || undefined} />
    </div>
  );
}
