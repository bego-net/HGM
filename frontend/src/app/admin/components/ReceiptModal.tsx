'use client';

import { pb } from '@/lib/pocketbase';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  record?: any;
};

export default function ReceiptModal({ open, onClose, record }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !record) return null;

  const fileField = record.paymentFile;
  let fileUrl = '';
  let fileName = '';

  if (fileField) {
    // PB v0.27: use pb.files.getURL() — pb.getFileUrl() is deprecated/removed
    const name = Array.isArray(fileField) ? fileField[0] : fileField;
    if (name) {
      fileName = name;
      fileUrl = pb.files.getURL(record, name);
    }
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  const isPdf = ext === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 z-10 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Payment Receipt</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.firstName} {record.lastName} · {record.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none p-1 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {fileUrl ? (
          <div>
            {isImage && (
              <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt="Payment receipt"
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>
            )}
            {isPdf && (
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📄</span>
                  <div>
                    <p className="text-amber-400 font-semibold text-sm">PDF Document</p>
                    <p className="text-slate-500 text-xs font-mono mt-0.5">{fileName}</p>
                  </div>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl transition-colors"
                >
                  Download
                </a>
              </div>
            )}
            {!isImage && !isPdf && (
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl">
                <p className="text-slate-400 text-sm font-mono">{fileName}</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-700 text-white text-sm rounded-xl"
                >
                  Download
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">
            No receipt on file for this registrant.
          </p>
        )}
      </div>
    </div>
  );
}
