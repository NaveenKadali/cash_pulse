'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import RegistrationForm from '@/components/RegistrationForm';

export default function Home() {
  const [activeTone, setActiveTone] = useState<'friendly' | 'formal' | 'firm'>('formal');
  const [calculatorWeddings, setCalculatorWeddings] = useState(18);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Dynamic calculations for the interactive studio cash-flow simulator
  const avgWeddingTicket = 120000; // ₹1,20,000 per wedding
  const totalRevenue = calculatorWeddings * avgWeddingTicket;
  const delayedReceivables = Math.round(totalRevenue * 0.3); // 30% typically delayed post-shoot
  const acceleratedCash = Math.round(delayedReceivables * 0.85); // 85% recovered faster with CashPulse

  const toneMessages = {
    friendly: {
      title: 'Friendly & Warm',
      badge: 'Best for post-shoot & early selection',
      text: 'Hey Verma Family! Hope you loved previewing your wedding highlights! Just a gentle note that your ₹45,000 milestone invoice for album selection is ready. You can review and settle seamlessly via UPI here: cashpulse.studio/p/demo-verma-link',
    },
    formal: {
      title: 'Formal & Professional',
      badge: 'Default standard follow-up (Day 7)',
      text: 'Dear Verma Family, Greetings from Aarav Pixels. Your high-resolution album spread is ready for print dispatch. Please find the pending milestone invoice of ₹45,000. Kindly settle via the secure UPI link to avoid print lab production delays: cashpulse.studio/p/demo-verma-link',
    },
    firm: {
      title: 'Firm & Production-Locked',
      badge: 'Day 14+ overdue (delivery pending)',
      text: 'URGENT: Outstanding payment of ₹45,000 for Verma Wedding Project is currently 14 days overdue. High-resolution gallery release and print lab dispatch are on hold until settlement. Pay instantly via UPI: cashpulse.studio/p/demo-verma-link',
    },
  };

  const faqs = [
    {
      q: 'How does CashPulse help my photography studio get paid faster?',
      a: 'CashPulse breaks every wedding or shoot into milestones (Booking, Shoot Day, Selection, Final Delivery). Clients receive a private, mobile-optimized link with instant UPI QR settlement (PhonePe, Google Pay, Paytm). No more awkward bank account details over WhatsApp.',
    },
    {
      q: 'Do my clients need to install an app?',
      a: 'Not at all. Clients open a sleek web portal on any mobile phone or browser where they can track their shoot progress, review invoice milestones, and tap once to pay directly through any installed UPI application.',
    },
    {
      q: 'How does the 90-day cash runway forecast work?',
      a: 'CashPulse matches your upcoming client milestone receivables against fixed overheads (rent, software, equipment EMIs) and variable vendor bills (freelance second shooters, drone cinematographers, Canvera album print labs). If a cash deficit is projected next month, it alerts you weeks ahead.',
    },
    {
      q: 'Can I test CashPulse before migrating my studio?',
      a: 'Yes! You can explore the fully functional Aarav Pixels pre-seeded demo workspace in one click without signing up or entering credit card details.',
    },
    {
      q: 'Is our client and payment information secure?',
      a: 'CashPulse uses bank-grade 256-bit encryption. UPI settlements route directly through Indian banking infrastructure, ensuring instant verification and zero intermediary funds holding.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-indigo-600/40 to-slate-900 border-b border-indigo-500/20 px-4 py-2 text-center text-xs font-medium text-indigo-200 flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span>⚡ Built specifically for Indian wedding &amp; event photography studios</span>
        <span className="hidden sm:inline text-indigo-400">•</span>
        <Link href="/app" className="underline font-semibold hover:text-white transition hidden sm:inline">
          Explore Live Demo Workspace →
        </Link>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group shrink-0">
            <img src="/logo-icon.png" alt="CashPulse" className="h-10 sm:h-11 w-auto object-contain group-hover:scale-105 transition-transform" />
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
              Cash<span className="text-emerald-400">Pulse</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
            <a href="#problem" className="hover:text-white transition">The Cash Trap</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#nudges" className="hover:text-white transition">WhatsApp Nudges</a>
            <a href="#simulator" className="hover:text-white transition">Cash Simulator</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <a
              href="#register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition active:scale-95"
            >
              <span>Register for Free</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
        {/* Semi-transparent background watermark logo layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-0 select-none">
          <img
            src="/logo-icon.png"
            alt=""
            aria-hidden="true"
            className="w-[720px] max-w-[90vw] object-contain opacity-[0.035] sm:opacity-[0.05] transform -rotate-12 translate-y-[-10%] blur-[0.5px]"
          />
        </div>

        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-sky-500/10 to-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-6 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Stop Chasing Milestone Balances • Indian UPI Rails</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Never Run Out of Cash <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
              Between Photography Shoots.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The autonomous back-office and cash-flow co-pilot for solo photographers and boutique studios.
            Forecast your 90-day runway, schedule milestone payments, and automate polite WhatsApp payment follow-ups.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span>Start Your Free Trial →</span>
            </a>
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 px-6 py-3.5 text-sm font-semibold text-slate-200 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" fillOpacity="0.2" />
              </svg>
              <span>Launch Aarav Pixels Demo</span>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <svg className="text-emerald-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="text-emerald-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Instant UPI (GPay, PhonePe, Paytm)
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="text-emerald-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified across 450+ wedding milestones
            </span>
          </div>

          {/* Interactive Hero Cockpit Mockup */}
          <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-5 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl text-left">
            {/* Window Topbar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="ml-2 text-xs font-mono text-slate-400">cashpulse.studio/app — Aarav Pixels Cockpit</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ● Live Studio Reserve: ₹8,40,000
              </span>
            </div>

            {/* Cockpit Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Liquidity Runway Tile */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-slate-400">Cash Runway Horizon</span>
                  <span className="text-xs font-bold text-emerald-400">4.2 Months</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">₹8,40,000</div>
                <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  <span>Healthy: Overheads covered through March</span>
                </div>
              </div>

              {/* Trapped Receivables Radar */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-slate-400">Trapped Receivables</span>
                  <span className="text-xs font-bold text-amber-400">₹1,85,000 Due</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">3 Shoots</div>
                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Verma Wedding (10d overdue)</span>
                  <span className="text-amber-400 font-semibold font-mono">₹45k</span>
                </div>
              </div>

              {/* Vendor Payables Radar */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-slate-400">Crew &amp; Print Lab Payables</span>
                  <span className="text-xs font-bold text-sky-400">₹32,000</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">4 Subcontractors</div>
                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Canvera Album Lab (Net-7)</span>
                  <span className="text-sky-400 font-semibold font-mono">₹18,500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section: The Timing Mismatch Trap */}
      <section id="problem" className="py-20 bg-slate-900/60 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              The Digital-First Photographer Paradox
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why Creative Studios Run Out of Money
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Photographers rarely fail from lack of bookings. They fail from the brutal timing mismatch between client delays and immediate subcontractor bills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Cash Trap Box */}
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                  ✕
                </div>
                <h3 className="text-lg font-bold text-white">The Typical Studio Reality</h3>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">⏳</span>
                  <span><strong>The Procrastination Gap:</strong> Clients take 45–90 days to pick photos for albums, delaying the final 30–40% payment milestone.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">💸</span>
                  <span><strong>Immediate Crew Obligations:</strong> Second shooters, drone operators, and print labs expect payment in 48 hours.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">😬</span>
                  <span><strong>Awkward WhatsApp Chasing:</strong> Fear of feeling like an aggressive debt collector harms valuable referral goodwill.</span>
                </li>
              </ul>
            </div>

            {/* The CashPulse Fix Box */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-white">The CashPulse Co-Pilot Fix</h3>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">⚡</span>
                  <span><strong>Milestone-Gated Delivery:</strong> High-res photo downloads and album dispatches unlock automatically upon UPI milestone settlement.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">📊</span>
                  <span><strong>90-Day Liquidity Radar:</strong> Visual runway forecast guarantees you never book crew without matching incoming cash.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">🎯</span>
                  <span><strong>Respectful Automated Nudges:</strong> 1-click tone-calibrated WhatsApp reminders with zero awkwardness.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Built for Creative Operators
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything Your Studio Needs to Stay Cash Positive
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              No complex corporate accounting jargon. Just the four vital financial pillars designed for wedding &amp; event photographers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-indigo-500/50 hover:bg-slate-900/90 transition group">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">90-Day Runway Forecast</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Visualizes exactly how many months of operational survival your bank account holds, accounting for upcoming lab fees and shoot wages.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-indigo-500/50 hover:bg-slate-900/90 transition group">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 12h.01" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Milestone UPI Settlement</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate clean, branded client portals with instant UPI QR links. Clients settle on their phones in under 10 seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-indigo-500/50 hover:bg-slate-900/90 transition group">
              <div className="h-10 w-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Tone-Calibrated Nudges</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automate follow-up messages across 3 distinct tones: Friendly, Formal, or Firm. Preserve word-of-mouth client relationships.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-indigo-500/50 hover:bg-slate-900/90 transition group">
              <div className="h-10 w-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <polyline points="16 11 18 13 22 9" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Vendor &amp; Crew Directory</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manage freelance cinematographers, drone pilots, editors, and album print labs. Track who has been paid and what is due.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive WhatsApp Nudge Demo Section */}
      <section id="nudges" className="py-20 bg-slate-900/40 border-y border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Interactive WhatsApp Simulator
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-white tracking-tight">
              Test Our Tone-Aware Follow-Up Engine
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Select a tone below to see how CashPulse generates respectful, effective messages that get unpaid milestones settled without awkwardness.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            {/* Tone Selector Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-6">
              {(['friendly', 'formal', 'firm'] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setActiveTone(tone)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition ${
                    activeTone === tone
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tone} Tone
                </button>
              ))}
            </div>

            {/* Simulated Chat Bubble */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-indigo-300">{toneMessages[activeTone].title}</span>
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {toneMessages[activeTone].badge}
                </span>
              </div>
              <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs font-mono text-emerald-200 leading-relaxed">
                {toneMessages[activeTone].text}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <span>Includes 1-click UPI deep-link &amp; milestone breakdown</span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://wa.me/919494899378?text=${encodeURIComponent(toneMessages[activeTone].text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition shadow-md shadow-emerald-600/30 active:scale-95 cursor-pointer"
                  >
                    <span>Open in WhatsApp (9494899378)</span>
                  </a>
                  <a
                    href={`whatsapp://send?phone=919494899378&text=${encodeURIComponent(toneMessages[activeTone].text)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 px-2.5 py-1.5 text-xs font-semibold transition"
                    title="Direct mobile app scheme (whatsapp://)"
                  >
                    <span>App Intent</span>
                  </a>
                  <Link
                    href="/app"
                    className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 ml-1"
                  >
                    Try in Live Studio →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Studio Cashflow Simulator */}
      <section id="simulator" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
              Interactive Studio ROI Calculator
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-white tracking-tight">
              See How Much Cash You Can Accelerate
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Slide your studio&apos;s annual wedding volume to calculate trapped receivables recovered with CashPulse.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-md">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="weddings-range" className="text-sm font-semibold text-slate-200">
                  Annual Weddings &amp; Events Handled:
                </label>
                <span className="text-xl font-bold font-mono text-indigo-400">{calculatorWeddings} Projects / Year</span>
              </div>
              <input
                id="weddings-range"
                type="range"
                min="5"
                max="50"
                step="1"
                value={calculatorWeddings}
                onChange={(e) => setCalculatorWeddings(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>5 shoots (Solo)</span>
                <span>25 shoots (Boutique)</span>
                <span>50+ shoots (High Volume)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                <p className="text-xs text-slate-400">Estimated Annual Billing</p>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  ₹{(totalRevenue / 100000).toFixed(1)} Lakhs
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                <p className="text-xs text-slate-400">Trapped Receivables (Avg)</p>
                <p className="text-xl font-bold font-mono text-amber-400 mt-1">
                  ₹{(delayedReceivables / 100000).toFixed(1)} Lakhs
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-emerald-500/40 bg-emerald-950/20">
                <p className="text-xs text-emerald-400 font-semibold">Cash Accelerated Fast</p>
                <p className="text-xl font-bold font-mono text-emerald-300 mt-1">
                  ₹{(acceleratedCash / 100000).toFixed(1)} Lakhs
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
              >
                <span>Test Runway With Aarav Pixels Data →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-20 bg-slate-900/40 border-y border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              Loved by Creative Directors
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-white tracking-tight">
              Trusted by 450+ Studios Across India
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;We used to wait 2 months for couples to pick 150 photos before we could collect our final ₹50,000. CashPulse’s milestone link with UPI solved this in week one.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-800/80 pt-4">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  AM
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Aarav Mehta</p>
                  <p className="text-[11px] text-slate-400">Aarav Pixels (Mumbai)</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;The runway indicator is a lifesaver. I now know months in advance if monsoon downtime will be tight, so I can take on more pre-wedding corporate gigs.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-800/80 pt-4">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  PS
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Priya Sen</p>
                  <p className="text-[11px] text-slate-400">Priya Sen Visuals (Bengaluru)</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;Our second shooters and drone pilots love working with us because our subcontractor bills are paid systematically, without missing a beat.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-800/80 pt-4">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  RK
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Rohan Kulkarni</p>
                  <p className="text-[11px] text-slate-400">Studio Lumière (Pune)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Transparent Pricing
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Invest in Financial Peace of Mind
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Start free today. Upgrade only as your wedding season volume expands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Starter Tier */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Free Starter</h3>
                <p className="text-xs text-slate-400 mt-1">For solo photographers launching</p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-extrabold font-mono text-white">₹0</span>
                  <span className="text-xs text-slate-400"> / forever</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Up to 3 active projects</li>
                  <li className="flex items-center gap-2">✓ 30-Day Cash Runway Forecast</li>
                  <li className="flex items-center gap-2">✓ UPI Milestone QR links</li>
                  <li className="flex items-center gap-2">✓ Manual WhatsApp drafts</li>
                </ul>
              </div>
              <a
                href="#register"
                className="mt-8 w-full block text-center rounded-xl border border-slate-700 hover:bg-slate-800 py-2.5 text-xs font-semibold text-white transition"
              >
                Get Started Free
              </a>
            </div>

            {/* Pro Studio Tier (Highlighted) */}
            <div className="rounded-2xl border-2 border-indigo-500 bg-gradient-to-b from-indigo-950/60 to-slate-900/90 p-6 flex flex-col justify-between relative shadow-xl shadow-indigo-950/50">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Studio Pro</h3>
                <p className="text-xs text-indigo-300 mt-1">For active wedding &amp; event studios</p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-extrabold font-mono text-white">₹1,499</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">✓ Unlimited projects &amp; shoots</li>
                  <li className="flex items-center gap-2">✓ Full 90-Day Cash Runway Engine</li>
                  <li className="flex items-center gap-2">✓ Automated WhatsApp tone nudges</li>
                  <li className="flex items-center gap-2">✓ Subcontractor bill tracking</li>
                  <li className="flex items-center gap-2">✓ What-If scenario simulator</li>
                </ul>
              </div>
              <a
                href="#register"
                className="mt-8 w-full block text-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition"
              >
                Start 14-Day Free Trial
              </a>
            </div>

            {/* Agency Tier */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Agency / Multi-Crew</h3>
                <p className="text-xs text-slate-400 mt-1">For production houses with multiple leads</p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-extrabold font-mono text-white">₹3,999</span>
                  <span className="text-xs text-slate-400"> / month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Multi-lead role permissions</li>
                  <li className="flex items-center gap-2">✓ Multi-workspace support</li>
                  <li className="flex items-center gap-2">✓ Advance tax &amp; GST reserve radar</li>
                  <li className="flex items-center gap-2">✓ Dedicated phone support</li>
                </ul>
              </div>
              <a
                href="#register"
                className="mt-8 w-full block text-center rounded-xl border border-slate-700 hover:bg-slate-800 py-2.5 text-xs font-semibold text-white transition"
              >
                Register for Free
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Registration Section: Register for Free / Start Your Free Trial */}
      <section id="register" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 border-t border-slate-800/80">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Proposition & Trial Benefits */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                14-Day Full-Featured Access • Zero Obligation
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Start your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">free trial</span> today.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Take control of your studio&apos;s cashflow. Get instant access to automated milestone nudges, 90-day cash runway forecasts, and 0% fee UPI settlements.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  'Instant Indian UPI payment links with 0% gateway deductions',
                  'Automated polite WhatsApp & SMS milestone payment nudges',
                  'Visual 90-day cash runway telemetry & deficit warning radar',
                  'Isolated multi-tenant workspace with role-based team permissions',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs">
                      ✓
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm text-xs text-slate-400 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  ⚡
                </div>
                <div>
                  <span className="text-white font-semibold">Immediate Studio Activation:</span> No credit card required. Setup your studio workspace in less than 60 seconds.
                </div>
              </div>
            </div>

            {/* Right Column: Embedded Interactive Registration Form */}
            <div className="lg:col-span-6">
              <RegistrationForm
                title="Register for Free"
                subtitle="Start your 14-day trial & claim your studio workspace"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-slate-900/40 border-t border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Everything you need to know about setting up CashPulse for your photography business.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenFaq(isOpen ? null : idx);
                      }
                    }}
                    aria-expanded={isOpen}
                    className="w-full text-left px-5 py-4 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <span>{faq.q}</span>
                    <span className="text-indigo-400 text-base font-bold ml-2">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-900 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* High-Impact CTA Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-indigo-500/30 bg-gradient-to-tr from-indigo-950/80 via-slate-900 to-indigo-900/40 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Ready to take control of your studio cash flow?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              Join hundreds of wedding and commercial photography studios running predictably with CashPulse.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-950 hover:bg-slate-100 px-6 py-3.5 text-sm font-bold shadow-xl transition active:scale-95"
              >
                <span>Explore Live Demo Cockpit</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition"
              >
                Sign In to Studio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-12 sm:px-8 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12h4l3-7 4 14 3-7h4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-bold text-slate-300">CashPulse</span>
            <span>— The Back Office &amp; Cash-Flow Co-Pilot</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#features" className="hover:text-slate-300 transition">Features</a>
            <a href="#simulator" className="hover:text-slate-300 transition">Simulator</a>
            <a href="#pricing" className="hover:text-slate-300 transition">Pricing</a>
            <Link href="/login" className="hover:text-slate-300 transition">Sign In</Link>
            <Link href="/app" className="text-indigo-400 hover:text-indigo-300 font-semibold">Demo Cockpit</Link>
          </div>

          <div>
            © {new Date().getFullYear()} CashPulse Studio Tech. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
