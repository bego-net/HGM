'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { pb } from '@/lib/pocketbase';

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

export default function Register() {
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [notes, setNotes] = useState('');
  
  // File handling
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission status states
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<RegistrantRecord | null>(null);

  // Field validation helper
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setFilePreview(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Enforce file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setFileError('Invalid file type. Only JPG, PNG, WEBP, or PDF receipt files are allowed.');
        setPaymentFile(null);
        return;
      }

      // Enforce 3MB file size limit (3 * 1024 * 1024 bytes)
      const maxSizeBytes = 3 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setFileError('Receipt file size exceeds 3MB limit. Please upload a smaller file.');
        setPaymentFile(null);
        return;
      }

      setPaymentFile(file);

      // Create preview for image files
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreview(previewUrl);
      } else if (file.type === 'application/pdf') {
        // PDF fallback preview label
        setFilePreview('pdf-placeholder');
      }
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    if (!organization.trim()) errors.organization = 'Organization name is required.';
    if (!phone.trim()) errors.phone = 'Phone number is required.';
    
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      // Create FormData to send fields and files to PocketBase
      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('phone', phone.trim());
      formData.append('organization', organization.trim());
      formData.append('notes', notes.trim());
      formData.append('status', 'pending');
      
      // Generate a client-side registration QR token hash/string
      const clientQrToken = `EIDS25-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      formData.append('qrCode', clientQrToken);

      // Automatically register the timestamp
      formData.append('registeredAt', new Date().toISOString());

      // Append payment receipt file if uploaded
      if (paymentFile) {
        formData.append('paymentFile', paymentFile);
      }

      // Create record in PocketBase
      const record = await pb.collection('registrants').create(formData);
      
      // Update success state with values returned by PocketBase
      setSuccessData({
        id: record.id,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        organization: record.organization,
        qrCode: record.qrCode,
        status: record.status,
        registeredAt: record.registeredAt
      });
      
      setStatus('success');
    } catch (err: any) {
      console.error('PocketBase Create Error:', err);
      setStatus('error');
      
      // Parse PocketBase specific validation errors if present
      if (err.data?.data) {
        const errorDetails = Object.entries(err.data.data)
          .map(([field, details]: [string, any]) => `${field}: ${details.message}`)
          .join(', ');
        setErrorMessage(`Registration Failed: ${errorDetails}`);
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setOrganization('');
    setNotes('');
    setPaymentFile(null);
    setFilePreview(null);
    setFileError(null);
    setValidationErrors({});
    setStatus('idle');
  };

  // SUCCESS COMPONENT
  if (status === 'success' && successData) {
    const registrationId = `EIDS-2025-${successData.id.slice(0, 4).toUpperCase()}-${successData.id.slice(-4).toUpperCase()}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${successData.qrCode}`;

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 select-none relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all animate-fade-in">
          {/* Header Ticket Punch */}
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

          {/* Ticket Body */}
          <div className="p-8 pt-10 flex flex-col items-center">
            {/* Unique Ticket ID */}
            <div className="text-center mb-6">
              <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">Registration ID</span>
              <p className="text-2xl font-mono font-bold text-teal-400 mt-1 tracking-wider">{registrationId}</p>
            </div>

            {/* Event Info */}
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

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl shadow-xl shadow-slate-950/40 mb-6 flex flex-col items-center justify-center border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="Attendee QR Code Badge"
                className="w-48 h-48"
              />
              <span className="text-slate-900 text-xs font-mono tracking-widest font-semibold mt-3">{successData.qrCode}</span>
            </div>

            {/* Verification Instructions */}
            <div className="text-center max-w-sm">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Status: {successData.status}</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Your ticket registration is pending receipt validation. Once our accounts confirm the transfer to CBE account **1000123456789**, your QR pass will be active at summit entry checkpoints.
              </p>
            </div>
          </div>

          {/* Ticket Footer Action */}
          <div className="border-t border-slate-800/60 p-6 bg-slate-950/60 text-center flex gap-4">
            <button
              onClick={resetForm}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-300 font-semibold hover:bg-slate-900 text-sm transition-all"
            >
              Register Another
            </button>
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-95 shadow-md shadow-teal-500/10 text-center flex items-center justify-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // STANDARD FORM VIEW
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6 relative overflow-x-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-2xl mx-auto">
        {/* Navigation Breadcrumb */}
        <Link href="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-teal-400 text-sm font-semibold transition-all mb-8 group">
          <span>←</span> <span>Back to Landing Page</span>
        </Link>

        {/* Headline */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">SUMMIT REGISTRATION</h1>
          <p className="text-slate-400 text-sm mt-2">
            Fill in your details below to register for the Ethiopia Innovation & Development Summit 2025.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          
          {/* Submission Global Error Alert */}
          {status === 'error' && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grid Row 1: Names */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-950 border ${validationErrors.firstName ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'} text-white focus:outline-none focus:ring-4 transition-all`}
                  placeholder="e.g., Abraham"
                  disabled={status === 'submitting'}
                />
                {validationErrors.firstName && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-950 border ${validationErrors.lastName ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'} text-white focus:outline-none focus:ring-4 transition-all`}
                  placeholder="e.g., Tadesse"
                  disabled={status === 'submitting'}
                />
                {validationErrors.lastName && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Grid Row 2: Contact Info */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-950 border ${validationErrors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'} text-white focus:outline-none focus:ring-4 transition-all`}
                  placeholder="name@company.com"
                  disabled={status === 'submitting'}
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-950 border ${validationErrors.phone ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'} text-white focus:outline-none focus:ring-4 transition-all`}
                  placeholder="e.g., +251 912345678"
                  disabled={status === 'submitting'}
                />
                {validationErrors.phone && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Field: Organization */}
            <div>
              <label htmlFor="organization" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Organization <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-950 border ${validationErrors.organization ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500/20'} text-white focus:outline-none focus:ring-4 transition-all`}
                placeholder="Company, University, or Ministry name"
                disabled={status === 'submitting'}
              />
              {validationErrors.organization && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.organization}</p>
              )}
            </div>

            {/* Field: Notes */}
            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Additional Notes <span className="text-slate-500 text-[10px] lowercase italic">(optional)</span></label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-teal-500/20 text-white focus:outline-none focus:ring-4 transition-all resize-none"
                placeholder="Dietary requirements, accessibility details, or special requests..."
                disabled={status === 'submitting'}
              />
            </div>

            {/* Section: Bank Transfer Upload & Verification */}
            <div className="border-t border-slate-800/80 pt-6 space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-1">CBE Bank Payment Instructions</span>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  Please deposit the registration fee of **500 ETB** to the following account:
                </p>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-center flex flex-col items-center">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Commercial Bank of Ethiopia</span>
                  <span className="text-amber-400 text-xl font-black mt-1 tracking-wider">1000123456789</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Upload Payment Receipt <span className="text-slate-500 text-[10px] lowercase italic">(image or PDF, max 3MB)</span></label>
                
                {/* File Upload Drag/Drop Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed ${fileError ? 'border-red-500/40 hover:border-red-500 bg-red-500/5' : 'border-slate-800 hover:border-teal-500 bg-slate-950/30'} rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-950/60 transition-all flex flex-col items-center justify-center`}
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
                      <span>✓ Selected: {paymentFile.name}</span>
                      <span className="text-slate-500 font-normal text-xs">({(paymentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-slate-400 font-semibold text-sm block">Click to select files</span>
                      <span className="text-slate-500 text-xs block">Accepts JPG, PNG, WEBP, or PDF receipts</span>
                    </div>
                  )}
                </div>

                {/* File Upload Specific Error */}
                {fileError && (
                  <p className="text-red-500 text-xs mt-2 font-medium">⚠️ {fileError}</p>
                )}

                {/* File Upload Previews */}
                {filePreview && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col items-center">
                    <span className="text-slate-500 text-xs uppercase font-medium tracking-wider mb-2">Receipt Preview</span>
                    
                    {filePreview === 'pdf-placeholder' ? (
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
                        alt="Receipt Scan"
                        className="max-h-48 rounded-xl object-contain border border-slate-800 shadow-md"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full py-4 rounded-xl text-base font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 text-slate-950 hover:opacity-95 shadow-xl shadow-teal-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2"
            >
              {status === 'submitting' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing Registration...</span>
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
