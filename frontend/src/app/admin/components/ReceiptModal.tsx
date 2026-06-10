'use client';

import { pb } from '@/lib/pocketbase';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  fileRef?: any;
  fileName?: string;
  fileType?: string;
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
    // support string or array
    if (Array.isArray(fileField) && fileField.length > 0) {
      fileName = fileField[0];
      fileUrl = pb.getFileUrl(record, fileField[0]);
    } else if (typeof fileField === 'string') {
      fileName = fileField;
      fileUrl = pb.getFileUrl(record, fileField);
    }
  }

  const isImage = fileUrl && (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp'));
  const isPdf = fileUrl && fileName.endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-3xl w-full mx-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 z-10">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-white">Payment Receipt</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {fileUrl ? (
          <div>
            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt={fileName} className="w-full rounded-md object-contain" />
            )}
            {isPdf && (
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded">
                <div>
                  <p className="text-sm text-amber-400 font-semibold">PDF Document</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">{fileName}</p>
                </div>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm bg-emerald-600 text-white px-3 py-2 rounded">Download</a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No receipt on file for this registrant.</p>
        )}
      </div>
    </div>
  );
}
