"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { openDB } from 'idb';
import { pb } from '@/lib/pocketbase';

type ScanRecord = {
  id?: string;
  registrantId?: string;
  qr?: string;
  when: string;
  online?: boolean;
};

const DB_NAME = 'eids-scanner-db';
const DB_VERSION = 1;

async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('registrants')) {
        db.createObjectStore('registrants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('scans')) {
        db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const [mode, setMode] = useState<'entry' | 'lunch'>('entry');
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; registrant?: any } | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'error'>('loading');

  // Sync network state
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const updateOnline = () => setIsOffline(false);
    const updateOffline = () => setIsOffline(true);

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOffline);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOffline);
    };
  }, []);

  // Register PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration failed:', err);
      });
    }
  }, []);

  // Load recent scans from IndexedDB on mount
  useEffect(() => {
    async function loadScans() {
      try {
        const db = await initDB();
        const stored = await db.getAll('scans');
        // Show last 10 scans sorted descending
        setScans(stored.reverse().slice(0, 10));
      } catch (err) {
        console.warn('Failed to load recent scans:', err);
      }
    }
    loadScans();
  }, []);

  // Scanner scanner setup and camera initialization
  useEffect(() => {
    let mounted = true;
    let html5Qrcode: Html5Qrcode | null = null;

    async function setup() {
      const db = await initDB();

      // Prefetch confirmed registrants for offline use
      try {
        if (navigator.onLine) {
          const list = await pb.collection('registrants').getFullList({ filter: 'status = "confirmed"' });
          const tx = db.transaction('registrants', 'readwrite');
          // Clear current cache first
          await tx.store.clear();
          for (const r of list) {
            await tx.store.put(r);
          }
          await tx.done;
        }
      } catch (err) {
        console.warn('Prefetch failed:', err);
      }

      if (!mounted) return;

      const elementId = 'html5qr-reader';
      try {
        // Pass verbose=false to constructor to compile without errors
        html5Qrcode = new Html5Qrcode(elementId, false);
        scannerRef.current = html5Qrcode;

        const config = { fps: 10, qrbox: 250 };

        const onScanSuccess = async (decodedText: string) => {
          // Debounce rapid double-scans of the same code
          if (lastScannedRef.current === decodedText && Date.now() - lastScanTimeRef.current < 2500) {
            return;
          }
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = Date.now();

          const when = new Date().toISOString();
          setScanResult(null);

          const validateAndProcess = (registrant: any) => {
            if (registrant.status !== 'confirmed') {
              return {
                success: false,
                message: `Access Denied: Status is "${registrant.status || 'unconfirmed'}"`
              };
            }

            if (mode === 'entry') {
              if (registrant.scannedEntry) {
                const timeStr = new Date(registrant.scannedEntry).toLocaleTimeString();
                return {
                  success: false,
                  message: `Duplicate Entry: Already scanned at ${timeStr}`
                };
              }
              registrant.scannedEntry = when;
              return { success: true, message: 'Welcome to EIDS 2025!', registrant };
            }

            if (mode === 'lunch') {
              if (!registrant.scannedEntry) {
                return {
                  success: false,
                  message: 'Access Denied: Entry scan missing (must enter first)'
                };
              }
              if (registrant.scannedLunch) {
                const timeStr = new Date(registrant.scannedLunch).toLocaleTimeString();
                return {
                  success: false,
                  message: `Duplicate Lunch: Already scanned at ${timeStr}`
                };
              }
              registrant.scannedLunch = when;
              return { success: true, message: 'Lunch validated successfully!', registrant };
            }

            return { success: false, message: 'Invalid scan mode' };
          };

          // ─── ONLINE MODE ───
          if (navigator.onLine) {
            try {
              const found = await pb.collection('registrants').getFullList({ filter: `qrCode = "${decodedText.replace(/\"/g, '\\"')}"` });
              if (!found || found.length === 0) {
                setScanResult({ success: false, message: `Invalid QR Code: "${decodedText}"` });
                return;
              }

              const registrant = found[0];
              const res = validateAndProcess(registrant);

              if (res.success) {
                const updatePayload: any = {};
                if (mode === 'entry') updatePayload.scannedEntry = when;
                else updatePayload.scannedLunch = when;

                await pb.collection('registrants').update(registrant.id, updatePayload);
                await pb.collection('scanLogs').create({
                  registrantId: registrant.id,
                  checkpoint: mode,
                  scannedAt: when
                });

                // Cache success state locally
                const localDb = await initDB();
                await localDb.put('registrants', registrant);

                const newScan: ScanRecord = { registrantId: registrant.id, qr: decodedText, when, online: true };
                setScans((prev) => [newScan, ...prev].slice(0, 10));
                await localDb.put('scans', newScan);

                setScanResult({ success: true, message: res.message, registrant });
              } else {
                setScanResult({ success: false, message: res.message });
              }
              return;
            } catch (err) {
              console.warn('Online sync failed, falling back to offline scan', err);
            }
          }

          // ─── OFFLINE MODE ───
          try {
            const localDb = await initDB();
            const allCached = await localDb.getAll('registrants');
            const registrant = allCached.find(r => r.qrCode === decodedText);

            if (!registrant) {
              setScanResult({ success: false, message: 'Offline Error: QR not in local database' });
              return;
            }

            const res = validateAndProcess(registrant);

            if (res.success) {
              await localDb.put('registrants', registrant);
              await localDb.put('queue', { qr: decodedText, when, mode });

              const newScan: ScanRecord = { registrantId: registrant.id, qr: decodedText, when, online: false };
              setScans((prev) => [newScan, ...prev].slice(0, 10));
              await localDb.put('scans', newScan);

              setScanResult({ success: true, message: `${res.message} (Cached Offline)`, registrant });
            } else {
              setScanResult({ success: false, message: res.message });
            }
          } catch (err: any) {
            setScanResult({ success: false, message: `Offline scan failed: ${err.message || err}` });
          }
        };

        // Pass 4 arguments to .start() to satisfy TS signature
        await html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          onScanSuccess,
          () => { /* ignore minor QR scanning errors */ }
        );

        setCameraStatus('active');
      } catch (err) {
        console.error('Camera initialization failed', err);
        setCameraStatus('error');
      }
    }

    setup();

    // Sync queue helper
    const syncQueue = async () => {
      if (!navigator.onLine || syncing) return;
      setSyncing(true);
      try {
        const db = await initDB();
        const queued = await db.getAll('queue');
        for (const item of queued) {
          try {
            const found = await pb.collection('registrants').getFullList({ filter: `qrCode = "${String(item.qr).replace(/\"/g, '\\"')}"` });
            if (found && found.length > 0) {
              const registrant = found[0];
              const updatePayload: any = {};
              if (item.mode === 'entry') updatePayload.scannedEntry = item.when;
              else updatePayload.scannedLunch = item.when;

              await pb.collection('registrants').update(registrant.id, updatePayload);
              await pb.collection('scanLogs').create({
                registrantId: registrant.id,
                checkpoint: item.mode,
                scannedAt: item.when
              });
            }
          } catch (err) {
            console.warn('Failed to sync offline item:', item, err);
          }
          await db.delete('queue', item.id);
        }
      } catch (err) {
        console.warn('Queue sync error:', err);
      } finally {
        setSyncing(false);
      }
    };

    window.addEventListener('online', syncQueue);
    const intervalId = setInterval(syncQueue, 20_000);

    return () => {
      mounted = false;
      window.removeEventListener('online', syncQueue);
      clearInterval(intervalId);
      if (html5Qrcode) {
        html5Qrcode.stop().catch(() => {});
      }
    };
  }, [mode, syncing]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
      {/* Offline/Online Status Banner */}
      {isOffline ? (
        <div className="w-full bg-red-600/90 text-white py-1 px-4 text-center text-xs font-bold tracking-wider animate-pulse no-print">
          ⚠️ OFFLINE MODE — SCANNING CACHED ATTENDEES
        </div>
      ) : (
        <div className="w-full bg-emerald-600/90 text-white py-1 px-4 text-center text-xs font-bold tracking-wider no-print">
          ✓ ONLINE MODE — SYNCHRONIZED
        </div>
      )}

      <div className="w-full max-w-lg p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="text-center mb-6 mt-2">
          <h1 className="text-2xl font-black text-white tracking-wide">EIDS 2025 SCANNER</h1>
          <p className="text-slate-500 text-xs mt-0.5">Event Gate and Lunch Stations</p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl mb-6">
          <button
            onClick={() => { setMode('entry'); setScanResult(null); }}
            className={`py-3 text-sm font-bold rounded-xl transition-all ${
              mode === 'entry' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gate Entry
          </button>
          <button
            onClick={() => { setMode('lunch'); setScanResult(null); }}
            className={`py-3 text-sm font-bold rounded-xl transition-all ${
              mode === 'lunch' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Lunch Station
          </button>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="relative aspect-square w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
          <div id="html5qr-reader" className="w-full h-full object-cover" />

          {cameraStatus === 'loading' && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-400 text-sm">Requesting camera access…</p>
            </div>
          )}

          {cameraStatus === 'error' && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center gap-3">
              <span className="text-3xl">📷</span>
              <p className="text-red-400 text-sm font-semibold">Camera Access Blocked</p>
              <p className="text-slate-500 text-xs">Please allow camera permissions and reload.</p>
            </div>
          )}
        </div>

        {/* Scan Result Feedback */}
        {scanResult && (
          <div
            className={`mt-6 p-5 rounded-2xl border transition-all animate-bounce ${
              scanResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{scanResult.success ? '✓' : '⚠️'}</span>
              <div>
                <p className="font-bold text-sm tracking-wide uppercase">{scanResult.success ? 'Scan Success' : 'Scan Blocked'}</p>
                <p className="text-xs mt-1 text-slate-300 leading-relaxed">{scanResult.message}</p>
                {scanResult.registrant && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                    Attendee: <strong>{scanResult.registrant.firstName} {scanResult.registrant.lastName}</strong><br />
                    Org: {scanResult.registrant.organization}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Scans (Last 10) */}
        <div className="mt-8 mb-6">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3">Recent Scan Log</h2>
          {scans.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6 text-center text-slate-500 text-xs">
              No recent scans yet.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
              {scans.map((s, i) => {
                const timeStr = new Date(s.when).toLocaleTimeString();
                return (
                  <div key={i} className="px-4 py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-white font-medium">{s.qr}</p>
                      <p className="text-slate-500 mt-0.5">{timeStr}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      s.online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {s.online ? 'Synced' : 'Cached'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
