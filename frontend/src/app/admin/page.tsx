'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pocketbase';
import ReceiptModal from './components/ReceiptModal';

type Registrant = any;
type Filter = 'all' | 'pending' | 'confirmed' | 'rejected';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Registrant | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // record id being actioned
  const unsubRef = useRef<(() => void) | null>(null);

  const loadRegistrants = async () => {
    try {
      // FIX: sort by -registeredAt (our field) not -created (wasn't on collection before)
      const list = await pb.collection('registrants').getFullList({ sort: '-registeredAt' });
      setRegistrants(list as any);
    } catch (err: any) {
      console.error('Load error:', err);
      setError('Failed to load registrants: ' + (err.message || 'Unknown error'));
    }
  };

  useEffect(() => {
    // Check auth — LocalAuthStore persists across refresh
    if (!pb.authStore.isValid) {
      router.replace('/admin/login');
      return;
    }

    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        // Refresh auth token to make sure it's still valid
        await pb.collection('admins').authRefresh();
      } catch {
        // Token expired — redirect to login
        pb.authStore.clear();
        router.replace('/admin/login');
        return;
      }

      if (!mounted) return;
      await loadRegistrants();
      setLoading(false);

      // FIX: subscribe returns Promise<UnsubscribeFunc> — must await and store the func
      try {
        const unsub = await pb.collection('registrants').subscribe('*', () => {
          loadRegistrants();
        });
        unsubRef.current = unsub;
      } catch (e) {
        console.warn('Real-time subscription failed:', e);
      }
    }

    init();

    return () => {
      mounted = false;
      // FIX: call the UnsubscribeFunc directly, not pass it to unsubscribe()
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [router]);

  const counts = useMemo(() => ({
    total: registrants.length,
    pending: registrants.filter(r => r.status === 'pending').length,
    confirmed: registrants.filter(r => r.status === 'confirmed').length,
    rejected: registrants.filter(r => r.status === 'rejected').length,
  }), [registrants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrants.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase();
      return name.includes(q) || (r.email || '').toLowerCase().includes(q) || (r.organization || '').toLowerCase().includes(q);
    });
  }, [registrants, filter, query]);

  const handleAction = async (id: string, action: 'confirm' | 'reject' | 'restore') => {
    setError(null);
    setActionLoading(id);
    try {
      const status = action === 'confirm' ? 'confirmed' : action === 'reject' ? 'rejected' : 'pending';
      await pb.collection('registrants').update(id, { status });

      // FIX: Confirm triggers badge email via API route
      if (action === 'confirm') {
        try {
          const res = await fetch('/api/confirm-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registrantId: id }),
          });
          const json = await res.json();
          if (!json.success) {
            console.warn('Badge email failed (non-critical):', json.message);
          }
        } catch (emailErr) {
          console.warn('Badge email request failed (non-critical):', emailErr);
        }
      }

      await loadRegistrants();
    } catch (err: any) {
      console.error(err);
      setError('Failed to update status: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const printAllBadges = () => {
    const confirmed = registrants.filter(r => r.status === 'confirmed');
    const popup = window.open('', '_blank');
    if (!popup) { alert('Allow pop-ups to print badges'); return; }
    const badgeHtml = confirmed.map((r) => {
      const qr = encodeURIComponent(r.qrCode || r.id);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qr}`;
      return `<div class="badge">
        <div class="badge-header">EIDS 2025</div>
        <div class="badge-body">
          <div>
            <div class="badge-name">${r.firstName || ''} ${r.lastName || ''}</div>
            <div class="badge-org">${r.organization || ''}</div>
            <div class="badge-id">${r.qrCode || ''}</div>
          </div>
          <img src="${qrUrl}" class="badge-qr" />
        </div>
      </div>`;
    }).join('');
    popup.document.write(`<html><head><title>EIDS 2025 Badges</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 16px; }
        .badge { width: 320px; border: 2px solid #071433; border-radius: 8px; margin: 8px; display: inline-block; vertical-align: top; overflow: hidden; }
        .badge-header { background: #071433; color: white; padding: 6px 12px; font-weight: 700; font-size: 12px; }
        .badge-body { display: flex; justify-content: space-between; align-items: center; padding: 12px; gap: 8px; }
        .badge-name { font-size: 16px; font-weight: 800; color: #071433; }
        .badge-org { font-size: 12px; color: #374151; margin-top: 4px; }
        .badge-id { font-family: monospace; font-size: 11px; color: #6b7280; margin-top: 6px; }
        .badge-qr { width: 90px; height: 90px; flex-shrink: 0; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>${badgeHtml}</body></html>`);
    popup.document.close();
    setTimeout(() => popup.print(), 800);
  };

  const signOut = () => {
    pb.authStore.clear();
    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-teal-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400">Loading registrants…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">EIDS 2025 Registrations</p>
          </div>
          <div className="flex items-center gap-3">
            {filter === 'confirmed' && counts.confirmed > 0 && (
              <button
                id="print-all-badges"
                onClick={printAllBadges}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
              >
                🖨 Print all badges ({counts.confirmed})
              </button>
            )}
            <button
              onClick={signOut}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: counts.total, color: 'text-white' },
            { label: 'Pending', value: counts.pending, color: 'text-amber-400' },
            { label: 'Confirmed', value: counts.confirmed, color: 'text-emerald-400' },
            { label: 'Rejected', value: counts.rejected, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">{label}</div>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'confirmed', 'rejected'] as Filter[]).map((t) => (
              <button
                key={t}
                id={`filter-${t}`}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                  filter === t ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            id="search-registrants"
            placeholder="Search name, email or org…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-teal-500 focus:outline-none w-64"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900 rounded-2xl overflow-auto border border-slate-800">
          <table className="w-full table-auto text-sm">
            <thead className="text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Organization</th>
                <th className="px-4 py-3 text-left">QR Code</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No registrants found.
                  </td>
                </tr>
              ) : filtered.map((r) => {
                const isActioning = actionLoading === r.id;
                return (
                  <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-950/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-slate-400">{r.email}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{r.organization}</td>
                    <td className="px-4 py-3 font-mono text-xs text-teal-400">{r.qrCode || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' :
                        r.status === 'rejected'  ? 'bg-red-500/15 text-red-400' :
                                                   'bg-amber-500/15 text-amber-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.paymentFile && (
                          <button
                            id={`receipt-${r.id}`}
                            onClick={() => { setSelected(r); setModalOpen(true); }}
                            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            Receipt
                          </button>
                        )}
                        {r.status === 'pending' && (
                          <>
                            <button
                              id={`confirm-${r.id}`}
                              disabled={isActioning}
                              onClick={() => handleAction(r.id, 'confirm')}
                              className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
                            >
                              {isActioning ? '…' : 'Confirm'}
                            </button>
                            <button
                              id={`reject-${r.id}`}
                              disabled={isActioning}
                              onClick={() => handleAction(r.id, 'reject')}
                              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors"
                            >
                              {isActioning ? '…' : 'Reject'}
                            </button>
                          </>
                        )}
                        {r.status === 'confirmed' && (
                          <a
                            href={`/admin/badge/${r.id}`}
                            className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                          >
                            Badge
                          </a>
                        )}
                        {r.status === 'rejected' && (
                          <button
                            id={`restore-${r.id}`}
                            disabled={isActioning}
                            onClick={() => handleAction(r.id, 'restore')}
                            className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg transition-colors"
                          >
                            {isActioning ? '…' : 'Restore'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal open={modalOpen} onClose={() => setModalOpen(false)} record={selected || undefined} />
    </div>
  );
}
