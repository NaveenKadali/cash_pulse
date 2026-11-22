'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Smartphone,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  Send,
} from 'lucide-react';

export default function ClientPortalPage() {
  const [claimed, setClaimed] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close UTR form on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClaimed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Client view scrubbed parameters (PRD FR-G-02)
  const studioName = 'Aarav Pixels';
  const projectName = 'Verma Wedding 2026';
  const amountDuePaise = 4500000n; // ₹45,000
  const upiId = 'aaravpixels@okhdfcbank';
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(studioName)}&am=45000.00&cu=INR&tn=${encodeURIComponent('Verma Wedding - Post-Shoot Cut')}`;

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNumber.trim()) return;
    setClaimSubmitting(true);
    try {
      const res = await fetch('/api/client-portal/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: 'ms-v2',
          amountPaise: '4500000',
          transactionRef: refNumber,
          payerName: 'Kavita Verma',
        }),
      });
      if (res.ok) {
        setClaimSuccess(true);
      }
    } finally {
      setClaimSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md px-4 sm:px-8">
        {/* Left: Preserved Logo & App Name */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img src="/logo-icon.png" alt="CashPulse" className="h-10 sm:h-11 w-auto object-contain transition group-hover:scale-105" />
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
              Cash<span className="text-emerald-400">Pulse</span>
            </span>
          </Link>
        </div>

        {/* Center: Positioned Studio Name to the Center */}
        <div className="hidden sm:flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-white">{studioName}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Studio
            </span>
          </div>
          <p className="text-[11px] text-slate-500">{projectName}</p>
        </div>

        {/* Right: Security & UPI Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">256-bit Secure UPI Rails</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-lg w-full mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/20 mb-2">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{studioName}</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">{projectName}</p>
        </div>

        {/* 7-Stage Client Progress Stepper (LLD §12 client-progress-stepper) */}
        <div data-testid="client-progress-stepper" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Production Progress</span>
            <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
              Stage 3 Completed
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 text-xs">
                ✓
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">1. Booking Confirmed</div>
                <div className="text-[10px] text-slate-500">Advance settled & dates reserved</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 text-xs">
                ✓
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">2. Pre-Shoot & Shoot Completed</div>
                <div className="text-[10px] text-slate-500">Raw capture finished in Delhi</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-500/20 border border-indigo-500 animate-pulse flex items-center justify-center text-indigo-400 text-xs">
                ●
              </div>
              <div>
                <div className="text-xs font-bold text-white">3. Digital Proofs & Color Grade (Current)</div>
                <div className="text-[10px] text-indigo-300">High-res selections in progress</div>
              </div>
            </div>

            <div className="flex items-center gap-3 opacity-40">
              <div className="h-5 w-5 rounded-full border border-slate-700 flex items-center justify-center text-slate-600 text-xs">
                4
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400">4. Album Layout & Print Release</div>
                <div className="text-[10px] text-slate-600">Pending post-shoot milestone settlement</div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Payment Box */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 shadow-2xl backdrop-blur-xl text-center space-y-5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Milestone Due for Settlement</span>
            <div className="text-3xl font-extrabold font-mono text-white mt-1 tracking-tight">₹45,000</div>
            <p className="text-xs text-slate-400 mt-1">Post-Shoot Cut (Verma Wedding 2026)</p>
          </div>

          {/* Dynamic NPCI UPI QR Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div
              data-testid="upi-qr-image"
              className="w-44 h-44 bg-white rounded-xl p-3 flex items-center justify-center shadow-lg"
            >
              <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                <rect x="5" y="5" width="30" height="30" />
                <rect x="65" y="5" width="30" height="30" />
                <rect x="5" y="65" width="30" height="30" />
                <rect x="10" y="10" width="20" height="20" fill="white" />
                <rect x="70" y="10" width="20" height="20" fill="white" />
                <rect x="10" y="70" width="20" height="20" fill="white" />
                <rect x="15" y="15" width="10" height="10" />
                <rect x="75" y="15" width="10" height="10" />
                <rect x="15" y="75" width="10" height="10" />
                <rect x="42" y="10" width="16" height="80" />
                <rect x="65" y="42" width="30" height="16" />
                <rect x="65" y="65" width="30" height="30" />
              </svg>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-3 font-semibold">
              VPA: <span className="text-indigo-400">{upiId}</span>
            </p>
          </div>

          {/* Toast Message Notification */}
          {toastMessage && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
              <span>{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-emerald-400 hover:text-white font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Direct Pay Button (LLD §12 upi-pay-button) */}
          <a
            href={upiLink}
            data-testid="upi-pay-button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(upiId);
              }
              setToastMessage(`Opening UPI App... (VPA copied: ${upiId})`);
            }}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition active:scale-98"
          >
            <Smartphone className="h-4 w-4" />
            <span>Pay with Any UPI App (GPay / PhonePe / Paytm)</span>
          </a>

          {/* Client Self-Claim Flow */}
          {!claimSuccess ? (
            !claimed ? (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setClaimed(true)}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition underline"
                >
                  I have already paid / Submit Reference UTR
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="pt-3 border-t border-slate-800/80 space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <label htmlFor="utr-input" className="block text-xs font-semibold text-slate-300">
                    12-Digit Bank UTR / Reference Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setClaimed(false)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Cancel (ESC)
                  </button>
                </div>
                <input
                  id="utr-input"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 123456789012"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClaimed(false)}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={claimSubmitting || !refNumber.trim()}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md disabled:opacity-50"
                  >
                    {claimSubmitting ? 'Submitting...' : 'Confirm Submission (Enter)'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400 font-medium">
              ✓ Payment claim submitted! Your studio owner will verify and confirm shortly.
            </div>
          )}
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-900 flex items-center justify-center gap-2">
        <img src="/logo-icon.png" alt="CashPulse" className="h-4 w-auto object-contain opacity-80" />
        <span>Secured by CashPulse • Studio Cash-Flow Co-Pilot</span>
      </footer>
    </div>
  );
}
