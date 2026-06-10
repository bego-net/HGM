"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { openDB } from 'idb';
import pb from '../../../lib/pocketbase';

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
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('registrants')) db.createObjectStore('registrants', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('scans')) db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true });
    },
  });
}

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState('ready');
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [mode, setMode] = useState<'entry'|'lunch'>('entry');

  useEffect(() => {
    let mounted = true;
    let html5Qrcode: Html5Qrcode | null = null;

    (async () => {
      const db = await initDB();

      // prefetch confirmed registrants into idb for offline lookup
      try {
        if (navigator.onLine) {
          const list = await pb.collection('registrants').getFullList({ filter: 'status = "confirmed"' });
          const tx = db.transaction('registrants', 'readwrite');
          for (const r of list) tx.store.put(r);
          await tx.done;
        }
      } catch (err) {
        // ignore
      }

      const elementId = 'html5qr-reader';
      html5Qrcode = new Html5Qrcode(elementId, { experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
      scannerRef.current = html5Qrcode;

      const config = { fps: 10, qrbox: 250 };

      const onScanSuccess = async (decodedText: string) => {
        const when = new Date().toISOString();
        setStatus(`scanned: ${decodedText}`);

        // try online lookup first
        if (navigator.onLine) {
          try {
            const found = await pb.collection('registrants').getFullList({ filter: `qrCode = "${decodedText.replace(/\"/g, '\\"')}"` });
            if (found && found.length > 0) {
              const registrant = found[0];
              // create scan log
              await pb.collection('scanLogs').create({ registrant: registrant.id, mode });
              // update registrant scanned timestamp
              const updatePayload: any = {};
              if (mode === 'entry') updatePayload.scannedEntry = when;
              else updatePayload.scannedLunch = when;
              await pb.collection('registrants').update(registrant.id, updatePayload);
              const rec: ScanRecord = { registrantId: registrant.id, qr: decodedText, when, online: true };
              setScans((s) => [rec, ...s].slice(0, 50));
              const db = await initDB();
              await db.put('scans', rec);
              return;
            }
          } catch (err) {
            // fallback to offline
          }
        }

        // offline handling: save to queue
        try {
          const db = await initDB();
          const tx = db.transaction('queue', 'readwrite');
          await tx.store.add({ qr: decodedText, when, mode });
          await tx.done;
          const rec: ScanRecord = { qr: decodedText, when, online: false };
          setScans((s) => [rec, ...s].slice(0, 50));
        } catch (err) {
          console.error('queue err', err);
        }
      };

      try {
        await html5Qrcode.start({ facingMode: 'environment' }, config, onScanSuccess);
      } catch (e) {
        setStatus('camera-error');
      }

      // sync queue when back online
      const syncQueue = async () => {
        if (!navigator.onLine) return;
        try {
          const db = await initDB();
          const all = await db.getAll('queue');
          for (const q of all) {
            try {
              // try to find registrant by qr
              const found = await pb.collection('registrants').getFullList({ filter: `qrCode = "${String(q.qr).replace(/\"/g, '\\"')}"` });
              if (found && found.length > 0) {
                const registrant = found[0];
                await pb.collection('scanLogs').create({ registrant: registrant.id, mode: q.mode });
                const updatePayload: any = {};
                if (q.mode === 'entry') updatePayload.scannedEntry = q.when;
                else updatePayload.scannedLunch = q.when;
                await pb.collection('registrants').update(registrant.id, updatePayload);
              }
            } catch (err) {
              // noop
            }
            await db.delete('queue', q.id);
          }
        } catch (err) {
          // noop
        }
      };

      window.addEventListener('online', syncQueue);

      // periodic sync attempt
      const t = setInterval(syncQueue, 30_000);

      return () => {
        mounted = false;
        window.removeEventListener('online', syncQueue);
        clearInterval(t);
        if (html5Qrcode) html5Qrcode.stop().catch(()=>{});
      };
    })();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(()=>{});
        scannerRef.current = null;
      }
    };
  }, [mode]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">EIDS Scanner</h1>
      <div className="my-3">
        <button className={`px-3 py-1 mr-2 ${mode==='entry'?'bg-sky-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('entry')}>Entry</button>
        <button className={`px-3 py-1 ${mode==='lunch'?'bg-sky-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('lunch')}>Lunch</button>
      </div>

      <div id="html5qr-reader" style={{ width: '100%', maxWidth: 640 }} />

      <div className="mt-4">
        <h2 className="font-semibold">Recent scans</h2>
        <ul>
          {scans.map((s, i) => (
            <li key={i} className="border-b py-2">{s.when} — {s.qr || s.registrantId} {s.online? '(online)':'(queued)'}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
