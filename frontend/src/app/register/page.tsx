'use client';

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { pb } from '@/lib/pocketbase';

// ─── Types ────────────────────────────────────────────────────────────────────
type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface RegistrantRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  qrCode: string;
  status: string;
  registeredAt: string;
}

// ─── Allowed file types (must match PocketBase paymentFile mimeTypes) ─────────
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_LABEL = 'JPG, PNG, WEBP, or PDF';
const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

// ─── Generate a collision-resistant QR token ──────────────────────────────────
function generateQrToken(): string {
  const arr = new Uint8Array(3);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `EIDS-2025-${hex}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [notes, setNotes] = useState('');

  // File handling
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);   // blob URL | 'pdf' | null
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);   // track for cleanup

  // Submission state
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<RegistrantRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ── Cleanup blob URL on unmount or when replaced ───────────────────────────
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // ── Generate QR locally when success record is ready ─────────────────────
  useEffect(() => {
    if (!successData?.qrCode) return;
    let cancelled = false;
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(successData.qrCode, { margin: 1, width: 256 }).then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });
    return () => { cancelled = true; };
  }, [successData?.qrCode]);

  // ── File change handler ───────────────────────────────────────────────────
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);

    // Revoke previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setFilePreview(null);

    const file = e.target.files?.[0];
    if (!file) { setPaymentFile(null); return; }

    if (!ALLOWED_MIME.includes(file.type)) {
      setFileError(`Invalid file type. Only ${ALLOWED_LABEL} receipts are allowed.`);
      setPaymentFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File size exceeds the 3 MB limit. Please upload a smaller file.');
      setPaymentFile(null);
      return;
    }

    setPaymentFile(file);

    if (file.type === 'application/pdf') {
      setFilePreview('pdf');
    } else {
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setFilePreview(url);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    if (!organization.trim()) errors.organization = 'Organization is required.';
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const qrToken = generateQrToken();

      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('phone', phone.trim());
      formData.append('organization', organization.trim());
      formData.append('notes', notes.trim());
      formData.append('status', 'pending');
      formData.append('qrCode', qrToken);
      formData.append('registeredAt', new Date().toISOString());

      if (paymentFile) formData.append('paymentFile', paymentFile);

      const record = await pb.collection('registrants').create(formData);

      setSuccessData({
        id: record.id,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        organization: record.organization,
        // FIX: use the qrCode field that was stored — this IS the canonical ID
        qrCode: record.qrCode || qrToken,
        status: record.status,
        registeredAt: record.registeredAt,
      });

      setStatus('success');
    } catch (err: any) {
      console.error('Registration error:', err);
      setStatus('error');
      if (err?.data?.data) {
        const details = Object.entries(err.data.data)
          .map(([field, d]: [string, any]) => `${field}: ${d.message}`)
          .join(' · ');
        setErrorMessage(`Validation failed — ${details}`);
      } else if (err?.status === 0 || err?.message?.includes('fetch')) {
        setErrorMessage('Could not reach the server. Check your connection and try again.');
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
      }
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('');
    setOrganization(''); setNotes('');
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setPaymentFile(null); setFilePreview(null); setFileError(null);
    setValidationErrors({}); setSuccessData(null); setQrDataUrl(null);
    setStatus('idle'); setErrorMessage('');
  };

  // ── Input class helper ────────────────────────────────────────────────────
  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl bg-slate-950 border ${
      validationErrors[field]
        ? 'border-red-500 focus:ring-red-500/20'
        : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'
    } text-white focus:outline-none focus:ring-4 transition-all`;

  // ══════════════════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (status === 'success' && successData) {
    // FIX: display the actual qrCode stored in PB — not id.slice(0,4)
    const displayId = successData.qrCode;

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 select-none relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-center relative">
            <div className="absolute -bottom-3 left-0 right-0 flex justify-between px-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-6 w-6 bg-slate-900 rounded-full transform translate-y-1/2" />
              ))}
            </div>
            <div className="inline-flex h-12 w-12 rounded-full bg-white/20 items-center justify-center text-white text-2xl mb-3">
              ✓
            </div>
            <h2 className="text-2xl font-black text-white tracking-wide">REGISTRATION SECURED</h2>
            <p className="text-teal-100 text-sm mt-1">EIDS 2025 Summit Pass</p>
          </div>

          {/* Body */}
          <div className="p-8 pt-10 flex flex-col items-center">
            {/* Registration ID — matches QR code */}
            <div className="text-center mb-6">
              <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">Registration ID</span>
              <p className="text-2xl font-mono font-bold text-teal-400 mt-1 tracking-wider">{displayId}</p>
            </div>

            {/* Attendee info */}
            <div className="w-full border-t border-b border-slate-800/80 py-4 mb-6 grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-slate-500 text-xs uppercase font-medium">Attendee</span>
                <p className="text-white font-semibold text-sm truncate mt-0.5">
                  {successData.firstName} {successData.lastName}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase font-medium">Organization</span>
                <p className="text-white font-semibold text-sm truncate mt-0.5">{successData.organization}</p>
              </div>
            </div>

            {/* QR code — generated locally, no external API */}
            <div className="bg-white p-4 rounded-2xl shadow-xl shadow-slate-950/40 mb-6 flex flex-col items-center border border-slate-200">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              <span className="text-slate-900 text-xs font-mono tracking-widest font-semibold mt-3">{displayId}</span>
            </div>

            {/* Status badge */}
            <div className="text-center max-w-sm">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Status: {successData.status}</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Your ticket is pending receipt validation. Once our accounts confirm the transfer to CBE account{' '}
                <strong className="text-slate-300">1000123456789</strong>, your QR pass will be active at entry checkpoints.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800/60 p-6 bg-slate-950/60 flex gap-4">
            <button
              onClick={resetForm}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-300 font-semibold hover:bg-slate-900 text-sm transition-all"
            >
              Register Another
            </button>
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-95 text-center flex items-center justify-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6 relative overflow-x-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-teal-400 text-sm font-semibold transition-all mb-8">
          <span>←</span><span>Back to Landing Page</span>
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">SUMMIT REGISTRATION</h1>
          <p className="text-slate-400 text-sm mt-2">
            Fill in your details to register for the Ethiopia Innovation &amp; Development Summit 2025.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">

          {/* Global error banner */}
          {status === 'error' && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <div>
                <p className="font-semibold mb-0.5">Submission failed</p>
                <p className="font-normal opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>

            {/* Row 1: Name */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName" type="text" value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={inputClass('firstName')}
                  placeholder="e.g., Abraham"
                  disabled={status === 'submitting'}
                  autoComplete="given-name"
                />
                {validationErrors.firstName && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName" type="text" value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={inputClass('lastName')}
                  placeholder="e.g., Tadesse"
                  disabled={status === 'submitting'}
                  autoComplete="family-name"
                />
                {validationErrors.lastName && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Row 2: Email + Phone */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass('email')}
                  placeholder="name@company.com"
                  disabled={status === 'submitting'}
                  autoComplete="email"
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.email}</p>
                )}
              </div>

              <div>
                {/* FIX: phone is optional in PB — removed misleading * indicator */}
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Phone Number <span className="text-slate-600 text-[10px] italic normal-case">(optional)</span>
                </label>
                <input
                  id="phone" type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={inputClass('phone')}
                  placeholder="e.g., +251 912 345 678"
                  disabled={status === 'submitting'}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organization" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Organization <span className="text-red-500">*</span>
              </label>
              <input
                id="organization" type="text" value={organization}
                onChange={e => setOrganization(e.target.value)}
                className={inputClass('organization')}
                placeholder="Company, University, or Ministry name"
                disabled={status === 'submitting'}
                autoComplete="organization"
              />
              {validationErrors.organization && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.organization}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Additional Notes <span className="text-slate-600 text-[10px] italic normal-case">(optional)</span>
              </label>
              <textarea
                id="notes" value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-teal-500/20 text-white focus:outline-none focus:ring-4 transition-all resize-none"
                placeholder="Dietary requirements, accessibility needs, or special requests…"
                disabled={status === 'submitting'}
              />
            </div>

            {/* Payment section */}
            <div className="border-t border-slate-800/80 pt-6 space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">
                  CBE Bank Payment Instructions
                </span>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  Please deposit the registration fee of <strong>500 ETB</strong> to the following account:
                </p>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-center">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Commercial Bank of Ethiopia</span>
                  <p className="text-amber-400 text-xl font-black mt-1 tracking-wider">1000123456789</p>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Upload Payment Receipt{' '}
                  <span className="text-slate-600 text-[10px] italic normal-case">(JPG, PNG, WEBP or PDF, max 3 MB)</span>
                </label>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed ${
                    fileError
                      ? 'border-red-500/40 hover:border-red-500 bg-red-500/5'
                      : 'border-slate-800 hover:border-teal-500 bg-slate-950/30'
                  } rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-950/60 transition-all flex flex-col items-center justify-center`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={status === 'submitting'}
                  />
                  {paymentFile ? (
                    <div className="flex items-center space-x-2 text-teal-400 font-semibold text-sm">
                      <span>✓ {paymentFile.name}</span>
                      <span className="text-slate-500 font-normal text-xs">
                        ({(paymentFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-slate-400 font-semibold text-sm block">Click to select file</span>
                      <span className="text-slate-500 text-xs block">Accepts {ALLOWED_LABEL} receipts</span>
                    </div>
                  )}
                </div>

                {fileError && (
                  <p className="text-red-500 text-xs mt-2 font-medium">⚠️ {fileError}</p>
                )}

                {/* Preview */}
                {filePreview && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col items-center">
                    <span className="text-slate-500 text-xs uppercase font-medium tracking-wider mb-2">Receipt Preview</span>
                    {filePreview === 'pdf' ? (
                      <div className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/25 rounded-xl">
                        <span className="text-3xl">📄</span>
                        <div className="text-left">
                          <p className="text-red-400 font-bold text-sm">PDF DOCUMENT</p>
                          <p className="text-slate-500 text-xs font-mono">{paymentFile?.name}</p>
                        </div>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={filePreview}
                        alt="Receipt preview"
                        className="max-h-48 rounded-xl object-contain border border-slate-800 shadow-md"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              id="submit-registration"
              type="submit"
              disabled={status === 'submitting'}
              className="w-full py-4 rounded-xl text-base font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 text-slate-950 hover:opacity-95 shadow-xl shadow-teal-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2"
            >
              {status === 'submitting' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Processing Registration…</span>
                </>
              ) : (
                <span>Submit Pass Request</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
