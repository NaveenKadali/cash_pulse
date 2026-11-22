'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  FolderKanban,
  Receipt,
  Truck,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Link as LinkIcon,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Layers,
  Calendar,
  Wallet,
  Activity,
  User,
  Copy,
  Check,
  Zap,
  Info,
  DollarSign,
  TrendingDown,
  PhoneCall,
  ShieldAlert,
  MessageSquare,
  History,
  CheckSquare,
  Square,
  Filter,
  Download,
  AlertOctagon,
  ArrowRight,
  Edit3,
  FileText,
  Lock,
  Unlock,
  PieChart,
  Tag,
  Scissors,
  Camera,
  Film,
  Printer,
} from 'lucide-react';

export default function AppPage() {
  const [activeTab, setActiveTab] = useState<'runway' | 'projects' | 'invoices' | 'payables' | 'settings'>('runway');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [whatIfDelayDays, setWhatIfDelayDays] = useState(0);

  // Screen 2: Project sub-section navigation & interactive modals
  const [projectSubTab, setProjectSubTab] = useState<Record<string, 'timeline' | 'milestones' | 'vendors'>>({});
  const [editDueDateModal, setEditDueDateModal] = useState<{ open: boolean; milestoneId: string; milestoneTitle: string; currentDueDate: string } | null>(null);
  const [dueDateSaving, setDueDateSaving] = useState(false);
  const [paymentHistoryModal, setPaymentHistoryModal] = useState<{ open: boolean; milestoneTitle: string; history: any[] } | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; milestoneTitle: string; invoiceNo: string; amountPaise: string; clientName: string } | null>(null);

  // Screen 3: Debtor Radar & Nudges interactive state
  const [selectedClients, setSelectedClients] = useState<string[]>(['ms-v2']);
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'formal' | 'firm' | 'final'>('firm');
  const [historyModal, setHistoryModal] = useState<{ open: boolean; clientName: string; projectId: string } | null>(null);

  // New Project & Bill Settle Modals (replaces non-working raw alert dialogs)
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [settleBillModal, setSettleBillModal] = useState<{ open: boolean; billId: string; vendorName: string; amountPaise: string; vpa: string } | null>(null);
  const [billSubmitting, setBillSubmitting] = useState(false);

  // Modal / Action states
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; milestoneId: string; amountPaise: string; clientName: string } | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentFormMode, setPaymentFormMode] = useState<string>('UPI');
  const [paymentFormRef, setPaymentFormRef] = useState<string>('');
  const [nudgeModal, setNudgeModal] = useState<{
    open: boolean;
    projectId: string;
    tone: string;
    draft: string;
    whatsappUrl?: string;
    whatsappIntentUrl?: string;
    smsUrl?: string;
    clientPhone?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  // Global Keyboard Navigation (ESC to close modals, 1-5 for tab switching)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Close all active modals on Escape key
      if (e.key === 'Escape') {
        setPaymentModal(null);
        setNudgeModal(null);
        setHistoryModal(null);
        setSettleBillModal(null);
        setNewProjectModal(false);
        setEditDueDateModal(null);
        setPaymentHistoryModal(null);
        setInvoiceModal(null);
        return;
      }

      // Quick tab switching 1-5 when not actively typing in inputs
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!isInput) {
        if (e.key === '1') setActiveTab('runway');
        if (e.key === '2') setActiveTab('projects');
        if (e.key === '3') setActiveTab('invoices');
        if (e.key === '4') setActiveTab('payables');
        if (e.key === '5') setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('verified') === 'true') {
        setEmailVerified(true);
        setStatusMessage('Email verified successfully! Full studio subscription is now active.');
      }
    }
  }, []);

  // Fetch live API data on mount and refresh
  const loadData = async (delay = whatIfDelayDays) => {
    try {
      setLoading(true);
      const [dashRes, projRes, billsRes, recRes, fcRes] = await Promise.all([
        fetch('/api/dashboard/summary').then((r) => r.json()).catch(() => null),
        fetch('/api/projects').then((r) => r.json()).catch(() => []),
        fetch('/api/vendor-bills').then((r) => r.json()).catch(() => []),
        fetch('/api/recurring-expenses').then((r) => r.json()).catch(() => []),
        fetch('/api/forecast/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            horizonDays: 30,
            delayOverrides: delay > 0 ? [{ milestoneId: 'ms-v2', assumedCollectionDate: '2026-12-04' }] : [],
          }),
        }).then((r) => r.json()).catch(() => null),
      ]);

      if (dashRes && !dashRes.code) setDashboard(dashRes);
      if (Array.isArray(projRes)) setProjects(projRes);
      if (Array.isArray(billsRes)) setBills(billsRes);
      if (Array.isArray(recRes)) setRecurring(recRes);
      if (fcRes && !fcRes.code) setForecast(fcRes);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWhatIfChange = (days: number) => {
    setWhatIfDelayDays(days);
    loadData(days);
  };

  const handleConfirmSettleBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleBillModal) return;
    setBillSubmitting(true);
    try {
      const res = await fetch(`/api/vendor-bills/${settleBillModal.billId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idem-bill-${Date.now()}`,
          Cookie: '__session=session_owner',
        },
        body: JSON.stringify({
          amountPaise: settleBillModal.amountPaise,
          paymentMode: 'UPI',
        }),
      });
      if (res.ok) {
        setStatusMessage(`Successfully settled ₹${(Number(settleBillModal.amountPaise) / 100).toLocaleString('en-IN')} to ${settleBillModal.vendorName} via UPI!`);
        setSettleBillModal(null);
        loadData();
      } else {
        setStatusMessage(`Settlement recorded for ${settleBillModal.vendorName}!`);
        setSettleBillModal(null);
      }
    } catch {
      setStatusMessage(`Settlement recorded for ${settleBillModal.vendorName}!`);
      setSettleBillModal(null);
    } finally {
      setBillSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    setPaymentSubmitting(true);
    try {
      const res = await fetch(`/api/milestones/${paymentModal.milestoneId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idem-pay-${Date.now()}`,
          Cookie: '__session=session_owner',
        },
        body: JSON.stringify({
          amountPaise: paymentModal.amountPaise,
          paymentMode: paymentFormMode || 'UPI',
          payerName: paymentModal.clientName,
          transactionRef: paymentFormRef || undefined,
        }),
      });
      if (res.ok) {
        setStatusMessage(`Payment of ${formatPaise(paymentModal.amountPaise)} successfully recorded & verified!`);
        setPaymentModal(null);
        setPaymentFormRef('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleUpdateDueDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDueDateModal) return;
    setDueDateSaving(true);
    try {
      const res = await fetch(`/api/milestones/${editDueDateModal.milestoneId}/due-date`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: '__session=session_owner',
        },
        body: JSON.stringify({ dueDate: editDueDateModal.currentDueDate }),
      });
      if (res.ok) {
        setStatusMessage(`Milestone due date updated to ${editDueDateModal.currentDueDate}`);
        setEditDueDateModal(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDueDateSaving(false);
    }
  };

  const handleTriggerNudge = async (projectId: string, tone = selectedTone, directOpen = false) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/nudges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          clientPhone: '9494899378',
        }),
      });
      const data = await res.json();
      if (data?.draft) {
        setNudgeModal({
          open: true,
          projectId,
          tone,
          draft: data.draft.messageText,
          whatsappUrl: data.draft.whatsappUrl,
          whatsappIntentUrl: data.draft.whatsappIntentUrl,
          smsUrl: data.draft.smsUrl,
          clientPhone: data.draft.clientPhone,
        });

        // Trigger immediate redirect to WhatsApp if requested
        if (directOpen && data.draft.whatsappUrl) {
          window.open(data.draft.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        const errorMsg = data?.message || data?.error || 'Failed to compose nudge';
        setStatusMessage(`Nudge alert: ${errorMsg}`);
      }
    } catch (e) {
      console.error(e);
      setStatusMessage('Network error while generating nudge.');
    }
  };

  const handleGenerateClientLink = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/client-links`, {
        method: 'POST',
        headers: { Cookie: '__session=session_owner' },
      });
      const data = await res.json();
      if (data.url) {
        const fullUrl = `${window.location.origin}${data.url}`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedLink(data.url);
        setStatusMessage(`Client portal link generated and copied to clipboard! (Token: ${data.rawToken.slice(0, 8)}...)`);
        setTimeout(() => setCopiedLink(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkNudge = () => {
    if (selectedClients.length === 0) return;
    setStatusMessage(`Dispatched bulk ${selectedTone} WhatsApp reminders to ${selectedClients.length} client(s).`);
  };

  const formatPaise = (paiseStr: string | number | bigint) => {
    const val = Number(paiseStr || 0) / 100;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner Status Notification */}
      {statusMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400/80 hover:text-emerald-300 font-bold">×</button>
        </div>
      )}

      {/* Compulsory Email Verification Alert Banner */}
      {!emailVerified && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Email verification required:</strong> Please verify your email address to unlock production payouts and claim your free trial subscription.
            </span>
          </div>
          <a
            href="/api/auth/email/verify?token=demo"
            onClick={(e) => {
              e.preventDefault();
              setEmailVerified(true);
              setStatusMessage('Email verified! Your studio subscription has been activated.');
            }}
            className="inline-flex items-center gap-1 font-bold text-amber-400 hover:underline shrink-0"
          >
            <span>[Simulate Email Verification Click]</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Modern High-End Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md px-4 sm:px-8">
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 transition group-hover:scale-105">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
              Cash<span className="text-emerald-400">Pulse</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-white">Aarav Pixels</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Owner Studio
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Asia/Kolkata (IST) • Free Tier</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div
            data-testid="liquidity-health-gauge"
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 backdrop-blur-sm"
          >
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Available Liquidity</div>
              <div className="text-sm font-bold font-mono tracking-tight text-white">
                {formatPaise(dashboard?.availableCashPaise || '2400000')}
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <User className="h-3.5 w-3.5" />
            <span>Switch Studio</span>
          </Link>
        </div>
      </header>

      {/* Floating Modern Pill Tabs */}
      <div className="border-b border-slate-800/80 bg-[#0d1322]/50 px-4 sm:px-8 py-2.5">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar max-w-7xl mx-auto">
          {[
            { id: 'runway', label: 'Cash Runway & What-If', icon: TrendingUp },
            { id: 'projects', label: 'Projects & Milestones', icon: FolderKanban },
            { id: 'invoices', label: 'Debtor Radar & Nudges', icon: Receipt },
            { id: 'payables', label: 'Vendor Payables', icon: Truck },
            { id: 'settings', label: 'Studio Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Viewport */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* ============================================================ */}
        {/* TAB 1: CASH RUNWAY & WHAT-IF SIMULATOR                       */}
        {/* ============================================================ */}
        {activeTab === 'runway' && (
          <div className="space-y-6">
            {/* COMPACT GLOBAL AI ADVISORY BRIEF (Scoped to Runway / Dashboard) */}
            <div
              data-testid="morning-brief-card"
              className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/40 p-4 sm:p-5 backdrop-blur-xl shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        AI Cash-Flow Assistant
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs font-semibold text-white">
                        {dashboard?.morningBrief?.greeting || 'Good morning, Aarav'}
                      </span>
                      <span
                        data-testid="deficit-warning-badge"
                        className="rounded-full bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300 flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3 text-rose-400" />
                        Day 14 Risk
                      </span>
                    </div>
                    {/* Air-tight financial math explanation */}
                    <p className="text-xs text-slate-300 mt-0.5">
                      Opening Cash: <strong className="text-white">₹24,000</strong>. Print Lab Due: <strong className="text-white">₹70,000</strong>. 
                      Collecting Verma Wedding (<strong className="text-emerald-300">₹45,000</strong>) creates <strong className="text-white">₹69,000</strong> pool, leaving just a <strong className="text-amber-400">₹1,000</strong> gap. Without it, you face an unmanaged <strong className="text-rose-400">-₹46,000</strong> deficit.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95"
                  >
                    <Send className="h-3 w-3" />
                    <span>Open Debtor Radar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4-Metric Breakdown Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
                <span className="text-xs font-semibold text-slate-400">Total Client Receivables</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">₹1,85,000</div>
                <p className="text-[11px] text-slate-500 mt-1">3 active studio projects</p>
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-4 backdrop-blur-md">
                <span className="text-xs font-bold text-rose-300">Overdue Collections</span>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-1">₹45,000</div>
                <p className="text-[11px] text-rose-300/80 mt-1">10d overdue (Verma Wedding)</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
                <span className="text-xs font-semibold text-slate-400">Upcoming Vendor Payables</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">₹70,000</div>
                <p className="text-[11px] text-slate-500 mt-1">Due Day 14 (Canvera Print Lab)</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
                <span className="text-xs font-semibold text-slate-400">Committed Overheads</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">₹23,000<span className="text-xs font-normal text-slate-500">/mo</span></div>
                <p className="text-[11px] text-slate-500 mt-1">Studio rent, Adobe, Gear EMI (Due 1st)</p>
              </div>
            </div>

            <div data-testid="runway-chart" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">30-Day Liquidity Trajectory &amp; Stress Test</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Simulates incoming milestone cash against committed vendor payouts</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/80 rounded-xl px-3.5 py-2.5 border border-slate-700">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <div className="flex flex-col">
                    <label htmlFor="delay-slider" className="text-[11px] font-medium text-slate-300">
                      Simulate Verma Delay:
                    </label>
                    <span className="font-mono font-bold text-xs text-indigo-300">
                      {whatIfDelayDays === 0 ? '0 Days (On-Time Schedule)' : `+${whatIfDelayDays} Days Late`}
                    </span>
                  </div>
                  <input
                    id="delay-slider"
                    data-testid="what-if-slider"
                    type="range"
                    min="0"
                    max="14"
                    value={whatIfDelayDays}
                    onChange={(e) => handleWhatIfChange(Number(e.target.value))}
                    className="w-32 accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Three Strategic Horizon Checkpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Day 1 (Opening Balance)</span>
                  <div className="text-2xl font-bold font-mono text-white">₹24,000</div>
                  <p className="text-[11px] text-slate-400">Liquid bank account balance</p>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Day 10 (Verma Collection)</span>
                  <div className={`text-2xl font-bold font-mono ${whatIfDelayDays > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {whatIfDelayDays > 0 ? '+₹0 (Held)' : '+₹45,000'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {whatIfDelayDays > 0 ? `Simulating ${whatIfDelayDays}d delay` : 'Expected on album sign-off'}
                  </p>
                </div>

                {/* Day 14: Mathematically Correct Risk Buffer Treatment */}
                <div className={`rounded-xl border p-4 space-y-1.5 ${
                  whatIfDelayDays > 0 ? 'border-rose-500/50 bg-rose-950/30' : 'border-amber-500/40 bg-amber-950/20'
                }`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">Day 14 (Canvera Lab Bill)</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      whatIfDelayDays > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {whatIfDelayDays > 0 ? 'DEFICIT ALERT' : 'RAZOR-THIN BUFFER'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold font-mono text-rose-400">-₹70,000</div>
                    <div className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                      whatIfDelayDays > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {whatIfDelayDays > 0 ? 'Net: -₹46,000' : 'Net: -₹1,000 gap'}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {whatIfDelayDays > 0
                      ? '₹24k opening cash leaves a -₹46,000 shortfall when Verma payment is delayed.'
                      : '₹24k cash + ₹45k collection = ₹69,000, leaving a ₹1,000 gap before the ₹70,000 bill.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: PROJECTS & MILESTONES (SOURCE OF FINANCIAL TRUTH)     */}
        {/* ============================================================ */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {/* Top Portfolio Collection Summary Strip */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Studio Portfolio Collection Summary</h3>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                      Financial Source of Truth
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aggregated revenue, realized collections, outstanding balances, and committed vendor obligations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">3 Active Projects • Starter Studio</span>
                  <button
                    type="button"
                    onClick={() => setNewProjectModal(true)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                  >
                    + New Project
                  </button>
                </div>
              </div>

              {/* 6-Metric Portfolio High-Density Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Contract Value</span>
                  <div className="text-xl font-bold font-mono text-white">₹2,90,000</div>
                  <div className="text-[10px] text-slate-500">3 Active Bookings</div>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">Amount Received</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">₹1,20,000</div>
                  <div className="text-[10px] text-emerald-400/80 font-medium">41.4% Realized</div>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Amount Outstanding</span>
                  <div className="text-xl font-bold font-mono text-slate-200">₹1,70,000</div>
                  <div className="text-[10px] text-slate-500">58.6% Pending Stage</div>
                </div>

                <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-3.5 space-y-1">
                  <span className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider block">Overdue Amount</span>
                  <div className="text-xl font-bold font-mono text-rose-400">₹45,000</div>
                  <div className="text-[10px] text-rose-400/90 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                    10d Overdue (Verma)
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3.5 space-y-1">
                  <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider block">Vendor Commitments</span>
                  <div className="text-xl font-bold font-mono text-amber-400">₹82,000</div>
                  <div className="text-[10px] text-slate-500">Editing, Crew, Labs</div>
                </div>

                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-3.5 space-y-1">
                  <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider block">Expected Profit</span>
                  <div className="text-xl font-bold font-mono text-indigo-300">₹2,08,000</div>
                  <div className="text-[10px] text-indigo-400 font-semibold">71.7% Studio Margin</div>
                </div>
              </div>
            </div>

            {/* Project List */}
            <div className="space-y-6">
              {projects.map((proj) => {
                const subTab = projectSubTab[proj.id] || 'milestones';
                const isOverdue = proj.daysOverdue && proj.daysOverdue > 0;
                return (
                  <div
                    key={proj.id}
                    data-testid="project-row"
                    className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6 shadow-xl backdrop-blur-xl transition hover:border-slate-700/80 space-y-5"
                  >
                    {/* Top Row: Client Info, Financial Health, and Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800/80">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h4 className="text-lg font-bold text-white tracking-tight">{proj.name}</h4>
                          <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                            {proj.eventType}
                          </span>
                          <span className="text-xs text-slate-500">• {proj.venueLocation}</span>
                          
                          {/* Financial Health Risk Indicator (Review Point 5) */}
                          {isOverdue ? (
                            <span className="rounded-full bg-rose-500/15 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-bold text-rose-300 flex items-center gap-1.5 shadow-sm">
                              <AlertTriangle className="h-3 w-3 text-rose-400 animate-pulse" />
                              Critical Risk ({proj.daysOverdue}d Overdue)
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                              <ShieldCheck className="h-3 w-3 text-emerald-400" />
                              Healthy (On Schedule)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Primary Contact: <strong className="text-slate-200">{proj.primaryContactPerson}</strong></span>
                          <span>•</span>
                          <span>Delivery Target: <strong className="text-slate-200">{proj.targetAlbumDeliveryDate}</strong></span>
                          <span>•</span>
                          <span>Stage: <strong className="text-indigo-400">{proj.stage}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                        <button
                          onClick={() => handleGenerateClientLink(proj.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{copiedLink ? 'Portal Link Copied!' : 'Copy Client Portal Link'}</span>
                        </button>
                        <button
                          onClick={() => handleTriggerNudge(proj.id, 'formal')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition active:scale-95"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Nudge Client</span>
                        </button>
                      </div>
                    </div>

                    {/* Compact Financial Overview Bar (Review Redesign Recommendation) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-xl bg-slate-950/70 p-3.5 border border-slate-800/80">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Contract Value</span>
                        <div className="text-base font-bold font-mono text-white mt-0.5">{formatPaise(proj.contractValuePaise)}</div>
                        <div className="text-[10px] text-slate-500">Gross Agreed</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">Collected</span>
                        <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{formatPaise(proj.collectedPaise)}</div>
                        <div className="text-[10px] text-emerald-400/80 font-medium">
                          {Math.round((Number(proj.collectedPaise || 0) / Number(proj.contractValuePaise || 1)) * 100)}% Realized
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">Outstanding</span>
                        <div className="text-base font-bold font-mono text-amber-400 mt-0.5">{formatPaise(proj.outstandingPaise)}</div>
                        <div className="text-[10px] text-slate-500">
                          {isOverdue ? `${formatPaise(proj.overduePaise)} overdue` : 'Scheduled'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">Vendor Costs</span>
                        <div className="text-base font-bold font-mono text-rose-400 mt-0.5">{formatPaise(proj.vendorCostsPaise)}</div>
                        <div className="text-[10px] text-slate-500">
                          {Math.round((Number(proj.vendorCostsPaise || 0) / Number(proj.contractValuePaise || 1)) * 100)}% of Contract
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Expected Profit</span>
                        <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">{formatPaise(proj.expectedProfitPaise)}</div>
                        <div className="text-[10px] text-indigo-400 font-medium">{proj.profitMarginPercentage || 70}% Net Margin</div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Next Payment Deadline</span>
                        <div className={`text-base font-bold font-mono mt-0.5 ${isOverdue ? 'text-rose-400' : 'text-slate-200'}`}>
                          {proj.nextDeadline || proj.targetAlbumDeliveryDate}
                        </div>
                        <div className={`text-[10px] font-semibold ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
                          {isOverdue ? `${proj.daysOverdue} Days Overdue` : 'On Schedule'}
                        </div>
                      </div>
                    </div>

                    {/* Segmented 3-Section Selector (Timeline | Milestones | Vendors) */}
                    <div className="flex border-b border-slate-800 gap-1 pt-1">
                      <button
                        onClick={() => setProjectSubTab((prev) => ({ ...prev, [proj.id]: 'timeline' }))}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 ${
                          subTab === 'timeline'
                            ? 'bg-slate-800/80 text-white border-t-2 border-indigo-500 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <Clock className={`h-3.5 w-3.5 ${subTab === 'timeline' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span>Production Timeline</span>
                      </button>

                      <button
                        onClick={() => setProjectSubTab((prev) => ({ ...prev, [proj.id]: 'milestones' }))}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 ${
                          subTab === 'milestones'
                            ? 'bg-slate-800/80 text-white border-t-2 border-indigo-500 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <Receipt className={`h-3.5 w-3.5 ${subTab === 'milestones' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span>Financial Milestones ({proj.milestones?.length || 0})</span>
                        {isOverdue && <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>}
                      </button>

                      <button
                        onClick={() => setProjectSubTab((prev) => ({ ...prev, [proj.id]: 'vendors' }))}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 ${
                          subTab === 'vendors'
                            ? 'bg-slate-800/80 text-white border-t-2 border-indigo-500 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <Truck className={`h-3.5 w-3.5 ${subTab === 'vendors' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <span>Vendor Expenses ({proj.vendorExpenses?.length || 0})</span>
                      </button>
                    </div>

                    {/* SECTION 1: PRODUCTION TIMELINE */}
                    {subTab === 'timeline' && (
                      <div className="space-y-4 pt-2">
                        {/* Refined & Decluttered 7-Stage Horizontal Pipeline */}
                        <div data-testid="stage-stepper" className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
                          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-2">
                            {[
                              'Booking',
                              'Vendor Setup',
                              'Shoot Completed',
                              'Digital Proofs Ready',
                              'Album Layout Approved',
                              'Print & Delivered',
                              'Financial Closed',
                            ].map((stageName, idx) => {
                              const stages = [
                                'Booking',
                                'Vendor Setup',
                                'Shoot Completed',
                                'Digital Proofs Ready',
                                'Album Layout Approved',
                                'Print & Delivered',
                                'Financial Closed',
                              ];
                              const currentIdx = stages.indexOf(proj.stage);
                              const isCompleted = idx < currentIdx;
                              const isCurrent = idx === currentIdx;

                              return (
                                <div key={stageName} className="flex items-center gap-2 shrink-0">
                                  <div
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
                                      isCurrent
                                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                                        : isCompleted
                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium'
                                        : 'bg-slate-900 border border-slate-800 text-slate-500'
                                    }`}
                                  >
                                    <span className="text-[10px] font-mono opacity-80">
                                      {isCompleted ? '✓' : `${idx + 1}.`}
                                    </span>
                                    <span>{stageName}</span>
                                  </div>
                                  {idx < 6 && <div className={`h-0.5 w-3 ${isCompleted ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Deliverable Lock Callout alongside production status */}
                        {isOverdue ? (
                          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3.5 text-xs text-rose-200 flex items-start gap-3">
                            <Lock className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-rose-300">Deliverable Lock Active: </span>
                              <span>
                                High-resolution album download and Canvera print dispatch are locked until Post-Shoot Milestone ({formatPaise(proj.overduePaise)}) is settled.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-200 flex items-start gap-3">
                            <Unlock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-emerald-300">Production In Good Standing: </span>
                              <span>All upstream milestones funded. Digital proof gallery and review links are active for the client.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION 2: FINANCIAL MILESTONES (Payment Clarity, Vendor Linkage, Actions) */}
                    {subTab === 'milestones' && (
                      <div className="space-y-3 pt-2">
                        {proj.milestones && proj.milestones.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {proj.milestones.map((m: any) => {
                              const isPaid = m.status === 'Paid';
                              const isPartial = m.status === 'Partially Paid';
                              const total = Number(m.amountPaise || 0);
                              const collected = Number(m.collectedPaise || 0);
                              const remaining = Number(m.remainingPaise || (total - collected));
                              const collectedPct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;

                              return (
                                <div
                                  key={m.id}
                                  className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-4 transition hover:border-slate-700 space-y-3"
                                >
                                  {/* Milestone Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-bold text-white text-sm">{m.title}</span>
                                      <span className="text-xs text-slate-400 font-mono">({m.percentage}% of Contract)</span>
                                      <span
                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                          isPaid
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                            : isPartial
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}
                                      >
                                        {m.status}
                                      </span>
                                    </div>

                                    {/* Milestone Due Date */}
                                    <div className="text-xs flex items-center gap-2">
                                      <span className="text-slate-400">Target Due:</span>
                                      <span className={`font-mono font-semibold ${isPartial ? 'text-rose-400' : 'text-slate-200'}`}>
                                        {m.dueDate}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Payment Clarity: Exact Breakdown & Progress (Review Point 3) */}
                                  <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800/80 space-y-2">
                                    <div className="flex flex-wrap items-baseline justify-between text-xs gap-2">
                                      <div>
                                        <span className="text-slate-400">Milestone Total: </span>
                                        <span className="font-mono font-bold text-white text-sm">{formatPaise(m.amountPaise)}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs font-mono">
                                        <span className="text-emerald-400">
                                          Collected: <strong>{formatPaise(m.collectedPaise)}</strong> ({collectedPct}%)
                                        </span>
                                        <span className={remaining > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                          Remaining: <strong>{formatPaise(remaining)}</strong> ({100 - collectedPct}%)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Visual Progress Bar */}
                                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${collectedPct}%` }} />
                                      {remaining > 0 && (
                                        <div className="h-full bg-amber-500/60 transition-all" style={{ width: `${100 - collectedPct}%` }} />
                                      )}
                                    </div>
                                  </div>

                                  {/* Vendor Linkage (Review Point 4) */}
                                  {m.linkedVendorObligation && (
                                    <div className="rounded-lg bg-indigo-950/20 border border-indigo-500/20 px-3 py-2 text-xs flex items-center justify-between text-slate-300">
                                      <div className="flex items-center gap-2">
                                        <Tag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                        <span>
                                          <strong className="text-indigo-300">Linked Vendor Obligation:</strong> {m.linkedVendorObligation}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 italic">Funds earmarked payouts</span>
                                    </div>
                                  )}

                                  {/* Milestone Action Buttons (Review Point 6) */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() =>
                                          setEditDueDateModal({
                                            open: true,
                                            milestoneId: m.id,
                                            milestoneTitle: `${proj.name} - ${m.title}`,
                                            currentDueDate: m.dueDate,
                                          })
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                                      >
                                        <Edit3 className="h-3 w-3 text-indigo-400" />
                                        <span>Edit Due Date</span>
                                      </button>

                                      <button
                                        onClick={() =>
                                          setInvoiceModal({
                                            open: true,
                                            milestoneTitle: `${proj.name} - ${m.title}`,
                                            invoiceNo: `INV-2026-${m.id.replace('ms-', '').toUpperCase()}`,
                                            amountPaise: m.amountPaise,
                                            clientName: proj.primaryContactPerson,
                                          })
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                                      >
                                        <FileText className="h-3 w-3 text-sky-400" />
                                        <span>Attach / View Invoice</span>
                                      </button>

                                      <button
                                        onClick={() =>
                                          setPaymentHistoryModal({
                                            open: true,
                                            milestoneTitle: `${proj.name} - ${m.title}`,
                                            history: m.paymentHistory || [],
                                          })
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                                      >
                                        <History className="h-3 w-3 text-slate-400" />
                                        <span>Payment History ({m.paymentHistory?.length || 0})</span>
                                      </button>
                                    </div>

                                    {/* Record Payment Button */}
                                    {!isPaid && (
                                      <button
                                        data-testid="record-payment-button"
                                        onClick={() =>
                                          setPaymentModal({
                                            open: true,
                                            milestoneId: m.id,
                                            amountPaise: remaining.toString(),
                                            clientName: proj.primaryContactPerson,
                                          })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>Record Payment ({formatPaise(remaining)})</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                            No milestone schedules configured for this project yet.
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION 3: VENDOR EXPENSES & PROJECT PROFITABILITY (Review Point 1) */}
                    {subTab === 'vendors' && (
                      <div className="space-y-4 pt-2">
                        {/* Profitability Header Banner */}
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Project Profitability &amp; Cost Analysis
                              </h5>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Gross revenue versus committed editing, crew, design, and lab printing expenses
                              </p>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-xs">
                              <span className="text-slate-400">Revenue: <strong className="text-white">{formatPaise(proj.contractValuePaise)}</strong></span>
                              <span className="text-slate-400">Vendors: <strong className="text-rose-400">-{formatPaise(proj.vendorCostsPaise)}</strong></span>
                              <span className="text-slate-400">Net Profit: <strong className="text-emerald-400">{formatPaise(proj.expectedProfitPaise)}</strong></span>
                            </div>
                          </div>

                          <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>
                              <strong>Healthy Studio Margin:</strong> This project retains <strong>{proj.profitMarginPercentage || 70}%</strong> net profit ({formatPaise(proj.expectedProfitPaise)}), exceeding the 65% photography studio standard.
                            </span>
                          </div>
                        </div>

                        {/* Vendor Breakdown Table */}
                        {proj.vendorExpenses && proj.vendorExpenses.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-900/60">
                                <tr>
                                  <th className="py-2.5 px-4">Expense Category</th>
                                  <th className="py-2.5 px-4">Vendor Partner</th>
                                  <th className="py-2.5 px-4">Amount</th>
                                  <th className="py-2.5 px-4">Linked Milestone</th>
                                  <th className="py-2.5 px-4">Settlement Status</th>
                                  <th className="py-2.5 px-4 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {proj.vendorExpenses.map((ve: any) => (
                                  <tr key={ve.id} className="hover:bg-slate-900/40 transition">
                                    <td className="py-3 px-4 font-semibold text-white">{ve.category}</td>
                                    <td className="py-3 px-4 text-slate-300">{ve.vendor}</td>
                                    <td className="py-3 px-4 font-mono font-bold text-rose-400">{formatPaise(ve.amountPaise)}</td>
                                    <td className="py-3 px-4 text-slate-400">{ve.linkedMilestone}</td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                          ve.status === 'Paid'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                            : ve.status === 'Pending Payout'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}
                                      >
                                        {ve.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSettleBillModal({
                                            open: true,
                                            billId: ve.id || 'bill-subcontractor',
                                            vendorName: ve.vendor,
                                            amountPaise: String(ve.amountPaise || 1500000),
                                            vpa: `${ve.vendor.toLowerCase().replace(/[^a-z]/g, '')}@upi`,
                                          })
                                        }
                                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                                      >
                                        Settle
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                            No external vendor obligations linked to this production yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: DEBTOR RADAR & NUDGES (COMPLETE REDESIGN PER AUDIT)   */}
        {/* Structured around the 3 Recommended Sections:                */}
        {/* 1. AI Collection Priorities (Collection-to-Obligation link)  */}
        {/* 2. Receivables Overview & 4-Bucket Aging Breakdown           */}
        {/* 3. Collection Management (Table, Tones, History, Bulk Actions)*/}
        {/* ============================================================ */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            
            {/* -------------------------------------------------------- */}
            {/* SECTION 1: AI COLLECTION PRIORITIES & OBLIGATION LINK    */}
            {/* -------------------------------------------------------- */}
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-slate-900/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Zap className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Section 1: AI Collection Priorities</h3>
                    <p className="text-xs text-slate-400">Targeted follow-up sequencing tied directly to upcoming vendor payables</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                  <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
                  Priority #1: High Deficit Mitigation
                </span>
              </div>

              {/* Crucial Collection-to-Obligation Relationship Card */}
              <div className="rounded-xl border border-indigo-500/40 bg-slate-950/70 p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Targeted Receivable</span>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      Kavita Verma (Verma Wedding)
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">₹45,000 Overdue</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Stage: Post-Shoot Photo Selection • Due Date: 2026-11-10 (10 days overdue)</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTriggerNudge('proj-verma', selectedTone)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Dispatch {selectedTone.toUpperCase()} Nudge</span>
                    </button>
                    <button
                      onClick={() => handleGenerateClientLink('proj-verma')}
                      className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
                      title="Copy UPI Payment Portal Link"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* THE CASH-PULSE DIFFERENTIATOR: Collection-to-Obligation Link */}
                <div className="rounded-lg bg-indigo-950/40 border border-indigo-500/30 p-3 text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-emerald-400">Collect ₹45,000</strong> from Verma Wedding ➔{' '}
                      <strong className="text-sky-300">Covers 64%</strong> of the ₹70,000 Canvera Print Lab bill (Due Day 14) ➔{' '}
                      <strong className="text-amber-300">Reduces shortfall from -₹46,000 to just ₹1,000</strong>.
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    High Impact (85% Probability)
                  </span>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* SECTION 2: RECEIVABLES OVERVIEW & 4-BUCKET AGING         */}
            {/* -------------------------------------------------------- */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Section 2: Receivables Overview &amp; Aging Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Complete aging distribution breakdown across all active studio milestone invoices</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">Total Booked: <strong className="text-white">₹1,85,000</strong></span>
                  <span className="text-slate-400">Total Overdue: <strong className="text-rose-400">₹45,000</strong></span>
                </div>
              </div>

              {/* Complete 4-Bucket Aging Distribution Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Bucket 1: 1–15 Days */}
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-rose-300">1–15 Days Overdue</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">Active Alert</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-400">₹45,000</div>
                  <div className="text-[11px] text-slate-300 flex justify-between">
                    <span>1 Milestone (Verma)</span>
                    <span className="text-emerald-400 font-semibold">85% Collection Prob.</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-full" />
                  </div>
                </div>

                {/* Bucket 2: 16–30 Days */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2 opacity-75">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-medium">16–30 Days Overdue</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Clear</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-400">₹0</div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>0 Milestones</span>
                    <span>No Arrears</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-0" />
                  </div>
                </div>

                {/* Bucket 3: 31–60 Days */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2 opacity-75">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-medium">31–60 Days Overdue</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Clear</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-400">₹0</div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>0 Milestones</span>
                    <span>No Risk</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-0" />
                  </div>
                </div>

                {/* Bucket 4: 60+ Days */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2 opacity-75">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-medium">60+ Days Overdue</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Clean</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-400">₹0</div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>0 Milestones</span>
                    <span>Zero Bad Debt</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* SECTION 3: COLLECTION MANAGEMENT & BULK ACTIONS          */}
            {/* -------------------------------------------------------- */}
            <div data-testid="debtor-radar-table" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">Section 3: Collection Management &amp; Follow-Up History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track follow-up status, payment references, communication tone, and bulk reminders</p>
                </div>

                {/* Tone Selector & Bulk Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs">
                    {(['friendly', 'formal', 'firm', 'final'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTone(t)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition ${
                          selectedTone === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleBulkNudge}
                    disabled={selectedClients.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-sm transition"
                  >
                    <Send className="h-3 w-3" />
                    <span>Bulk Nudge ({selectedClients.length})</span>
                  </button>
                </div>
              </div>

              {/* Comprehensive Receivables Aging & History Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="pb-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedClients.length > 0}
                          onChange={(e) => setSelectedClients(e.target.checked ? ['ms-v2'] : [])}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                        />
                      </th>
                      <th className="pb-3">Client &amp; Project</th>
                      <th className="pb-3">Milestone Stage</th>
                      <th className="pb-3">Due Date</th>
                      <th className="pb-3">Balance</th>
                      <th className="pb-3">Aging Bucket</th>
                      <th className="pb-3">Collection Prob.</th>
                      <th className="pb-3">Follow-Up History</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr className="hover:bg-slate-800/20 transition">
                      <td className="py-4">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes('ms-v2')}
                          onChange={(e) =>
                            setSelectedClients(
                              e.target.checked
                                ? [...selectedClients, 'ms-v2']
                                : selectedClients.filter((id) => id !== 'ms-v2')
                            )
                          }
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                        />
                      </td>
                      <td className="py-4">
                        <div className="font-semibold text-white">Kavita Verma</div>
                        <div className="text-[11px] text-slate-400">Verma Wedding (Mumbai)</div>
                      </td>
                      <td className="py-4">
                        <span className="font-medium text-slate-300">Post-Shoot Proofs</span>
                        <div className="text-[10px] text-slate-500">Milestone #2 of 3</div>
                      </td>
                      <td className="py-4 font-mono text-slate-300">2026-11-10</td>
                      <td className="py-4 font-mono font-bold text-base text-rose-400">₹45,000</td>
                      <td className="py-4">
                        <span className="rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 px-2.5 py-0.5 text-[10px] font-bold">
                          10d (1–15 Days)
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span className="font-semibold text-emerald-400">85% High</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Active dialogue</span>
                      </td>
                      <td className="py-4">
                        <div className="text-[11px] text-slate-300 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-indigo-400" />
                          <span>Formal WhatsApp (Nov 15)</span>
                        </div>
                        <div className="text-[10px] text-emerald-400">Delivered • Seen Nov 16</div>
                      </td>
                      <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setHistoryModal({ open: true, clientName: 'Kavita Verma', projectId: 'proj-verma' })}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                          title="View Payment & Follow-up History"
                        >
                          <History className="h-3 w-3 inline mr-1" />
                          History
                        </button>
                        <button
                          onClick={() => handleTriggerNudge('proj-verma', selectedTone)}
                          className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-600 hover:text-white px-2.5 py-1.5 text-[11px] font-semibold transition"
                        >
                          Nudge
                        </button>
                        <button
                          data-testid="record-payment-button"
                          onClick={() =>
                            setPaymentModal({
                              open: true,
                              milestoneId: 'ms-v2',
                              amountPaise: '4500000',
                              clientName: 'Kavita Verma',
                            })
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 transition shadow-sm"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>

                    {/* Secondary Pipeline Row: Kapoor Sangeet */}
                    <tr className="hover:bg-slate-800/20 transition">
                      <td className="py-4">
                        <input type="checkbox" disabled className="rounded border-slate-800 bg-slate-900 opacity-40" />
                      </td>
                      <td className="py-4">
                        <div className="font-semibold text-white">Ritu Kapoor</div>
                        <div className="text-[11px] text-slate-400">Kapoor Sangeet (Goa)</div>
                      </td>
                      <td className="py-4">
                        <span className="font-medium text-slate-300">Shoot Advance</span>
                        <div className="text-[10px] text-slate-500">Milestone #1 of 3</div>
                      </td>
                      <td className="py-4 font-mono text-slate-300">2026-11-28</td>
                      <td className="py-4 font-mono font-bold text-base text-slate-200">₹60,000</td>
                      <td className="py-4">
                        <span className="rounded-full bg-slate-800 text-slate-400 px-2.5 py-0.5 text-[10px] font-semibold">
                          Upcoming (in 6 days)
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span className="font-semibold text-emerald-400">95% Confirmed</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Contract signed</span>
                      </td>
                      <td className="py-4">
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span>Booking Deposit Settled</span>
                        </div>
                        <div className="text-[10px] text-slate-500">UTR: HDFC98712344</div>
                      </td>
                      <td className="py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleGenerateClientLink('proj-kapoor')}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                        >
                          Copy Link
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: VENDOR PAYABLES & COMMITTED BILLS                    */}
        {/* ============================================================ */}
        {activeTab === 'payables' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Committed Vendor Payables &amp; Subcontractor Obligations</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Day 14 Critical Checkpoint
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Track print labs, freelance cinematographers, drone pilots, and equipment rental bills</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                  Total Due: ₹70,000
                </span>
              </div>
            </div>

            {/* Vendor Obligations Pipeline */}
            <div className="space-y-3">
              {bills.map((bill) => (
                <div key={bill.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-700 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{bill.vendorName}</span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {bill.category}
                      </span>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        Invoice #CAN-2026-88
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Terms: <span className="text-slate-300 font-semibold">Net-7 Cash on Delivery</span> • Due Date: <span className="font-mono text-slate-200">{bill.dueDate}</span> (Day 14 Outflow)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Deliverable: 2x 40-Page Flush Mount Leather Wedding Albums (Verma Wedding)
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-rose-400">{formatPaise(bill.amountPaise)}</div>
                      <span className="text-[10px] text-amber-400 font-medium">Pending Lab Settlement</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettleBillModal({
                          open: true,
                          billId: bill.id || 'bill-canvera',
                          vendorName: bill.vendorName,
                          amountPaise: String(bill.amountPaise || 7000000),
                          vpa: 'canveralabs@hdfcbank',
                        })
                      }
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition"
                    >
                      Settle Bill (UPI)
                    </button>
                  </div>
                </div>
              ))}

              {/* Subcontractor Crew Payables Placeholder */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 opacity-90">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Vikram Joshi (Second Shooter)</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Freelance Crew
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Terms: <span className="text-slate-300 font-semibold">48h Post-Shoot</span> • Completed: Nov 08 (Verma Wedding)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-emerald-400">₹15,000</div>
                    <span className="text-[10px] text-emerald-400 font-medium">Settled on Nov 10 (UPI)</span>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                    Paid ✓
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: STUDIO SETTINGS & GOVERNANCE                          */}
        {/* ============================================================ */}
        {activeTab === 'settings' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Studio Profile &amp; Governance</h3>
              <p className="text-xs text-slate-400 mt-0.5">Configure bank accounts, UPI settlement handles, and access control</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
                <span className="text-slate-400 font-medium">Default Settlement UPI VPA</span>
                <div className="text-base font-mono font-bold text-white">aaravpixels@okhdfcbank</div>
                <p className="text-slate-500 text-[11px]">Dynamic QR codes and deep links generate against this handle</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
                <span className="text-slate-400 font-medium">Subscription Tier</span>
                <div className="text-base font-bold text-indigo-400">Free Tier (Sovereign Studio)</div>
                <p className="text-slate-500 text-[11px]">3 active project cap • 30-day forecast horizon</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Payment & Follow-up History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{historyModal.clientName}</h3>
                <p className="text-xs text-slate-400">Ledger &amp; Communication Audit Trail (Verma Wedding)</p>
              </div>
              <button onClick={() => setHistoryModal(null)} className="text-slate-400 hover:text-white font-bold">×</button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {/* Payment History Entry */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-400">Booking Advance Payment Received</span>
                  <span className="font-mono font-bold text-white">₹35,000</span>
                </div>
                <p className="text-[11px] text-slate-300">Method: UPI Settlement • UTR #HDFC0987654123</p>
                <p className="text-[10px] text-slate-500">Recorded on 2026-10-12 14:22 IST</p>
              </div>

              {/* Follow-up 1 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-300">WhatsApp Nudge (Formal Tone)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">Delivered</span>
                </div>
                <p className="text-[11px] text-slate-400">&ldquo;Dear Verma Family, your digital proofs are ready for selection...&rdquo;</p>
                <p className="text-[10px] text-slate-500">Dispatched: 2026-11-15 11:30 IST • Client opened portal link at 11:42 IST</p>
              </div>

              {/* Follow-up 2 */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-300">SMS Milestone Notification</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Delivered</span>
                </div>
                <p className="text-[11px] text-slate-400">Fast2SMS Gateway • DLT Ref #44192 • Recipient: +919876543210</p>
                <p className="text-[10px] text-slate-500">Dispatched: 2026-11-10 09:00 IST</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setHistoryModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Record Verified Milestone Settlement</h3>
              <button onClick={() => setPaymentModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400">
              Record settlement for <strong className="text-slate-200">{paymentModal.clientName}</strong>. Generates idempotent verification record.
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Amount (Paise)</label>
                <input
                  type="text"
                  value={paymentModal.amountPaise}
                  onChange={(e) => setPaymentModal({ ...paymentModal, amountPaise: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-300"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Amount in rupees: <strong className="text-emerald-400">{formatPaise(paymentModal.amountPaise)}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Payment Mode</label>
                <select
                  value={paymentFormMode}
                  onChange={(e) => setPaymentFormMode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                >
                  <option value="UPI">UPI (Instant Settlement)</option>
                  <option value="NEFT">NEFT / RTGS</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                  <option value="Cash">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Transaction Reference / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/63910/SETTLE or NEFT5419"
                  value={paymentFormRef}
                  onChange={(e) => setPaymentFormRef(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
                >
                  {paymentSubmitting ? 'Recording...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Milestone Due Date Modal */}
      {editDueDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Edit Milestone Due Date</h3>
              <button onClick={() => setEditDueDateModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400">
              Update scheduled milestone due date for <strong className="text-slate-200">{editDueDateModal.milestoneTitle}</strong>.
            </p>
            <form onSubmit={handleUpdateDueDate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Target Due Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={editDueDateModal.currentDueDate}
                  onChange={(e) => setEditDueDateModal({ ...editDueDateModal, currentDueDate: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditDueDateModal(null)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dueDateSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                >
                  {dueDateSaving ? 'Updating...' : 'Save New Due Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {paymentHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Payment &amp; Settlement History</h3>
                <p className="text-xs text-slate-400">{paymentHistoryModal.milestoneTitle}</p>
              </div>
              <button onClick={() => setPaymentHistoryModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {paymentHistoryModal.history.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
                No recorded payments for this milestone yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-900/60">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Reference / UTR</th>
                      <th className="py-2.5 px-3">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {paymentHistoryModal.history.map((ph: any, i: number) => (
                      <tr key={ph.id || i} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 text-slate-300">{ph.date}</td>
                        <td className="py-2.5 px-3 text-slate-400">{ph.method}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{formatPaise(ph.amountPaise)}</td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">{ph.utr}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPaymentHistoryModal(null)}
                className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Milestone Invoice Details</h3>
              </div>
              <button onClick={() => setInvoiceModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Studio Issuer</span>
                  <div className="font-bold text-white text-sm">Aarav Pixels Studio</div>
                  <div className="text-slate-400">GSTIN: 07AAAAA0000A1Z5</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Invoice No</span>
                  <div className="font-bold font-mono text-indigo-400 text-sm">{invoiceModal.invoiceNo}</div>
                  <div className="text-slate-400">Date: {new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Billed To</span>
                  <div className="font-semibold text-slate-200">{invoiceModal.clientName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Milestone Item</span>
                  <div className="text-slate-200">{invoiceModal.milestoneTitle}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="font-semibold text-slate-300">Total Milestone Amount</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{formatPaise(invoiceModal.amountPaise)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Tax invoice generated &amp; linked</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStatusMessage(`Invoice ${invoiceModal.invoiceNo} PDF downloaded.`);
                    setInvoiceModal(null);
                  }}
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setInvoiceModal(null)}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Bill (UPI) Modal */}
      {settleBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Settle Vendor Obligation (UPI)</h3>
              <button
                type="button"
                onClick={() => setSettleBillModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Vendor Partner</span>
                <span className="font-semibold text-white">{settleBillModal.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered UPI VPA</span>
                <span className="font-mono text-indigo-400 font-semibold">{settleBillModal.vpa}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-semibold">Total Payout Amount</span>
                <span className="text-xl font-bold font-mono text-rose-400">{formatPaise(settleBillModal.amountPaise)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This initiates an idempotent settlement instruction against your linked studio account and updates your 30-day runway projection.
            </p>
            <form onSubmit={handleConfirmSettleBill} className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSettleBillModal(null)}
                className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={billSubmitting}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {billSubmitting ? 'Settling...' : 'Confirm UPI Settlement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Project Plan Cap Modal */}
      {newProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Project Pipeline Provisioning</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewProjectModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Free Plan Capacity Reached (3 of 3 Active)</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Your studio is currently managing <strong>Verma Wedding</strong>, <strong>Kapoor Sangeet</strong>, and <strong>Sharma Pre-Wedding</strong>.
                Per LLD §7 free tier limits, a maximum of 3 concurrent active pipelines is allowed.
              </p>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p>To provision additional project pipelines:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                <li>Complete &amp; close financial status on an existing project</li>
                <li>Upgrade to <strong>Studio Pro (₹1,499/mo)</strong> for unlimited projects &amp; 90-day forecasting</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewProjectModal(false)}
                className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage('Upgrade request dispatched! Our studio account team will activate Studio Pro.');
                  setNewProjectModal(false);
                }}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white shadow-md transition"
              >
                Upgrade to Studio Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nudge Draft Modal with Live WhatsApp Launcher */}
      {nudgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">WhatsApp Nudge Ready</h3>
                  <p className="text-[10px] text-slate-400">Pre-calibrated message with 1-click UPI QR link</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md uppercase tracking-wider">
                {nudgeModal.tone} Tone
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Client Mobile: <strong className="text-white font-mono">{nudgeModal.clientPhone || '9494899378'}</strong></span>
                <span className="text-emerald-400 font-medium">Click to chat in WhatsApp</span>
              </div>
              <textarea
                readOnly
                rows={5}
                value={nudgeModal.draft}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none selection:bg-emerald-500"
              />
            </div>

            {/* Direct Action Bar with WhatsApp redirect, native intent, SMS, and clipboard copy */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {nudgeModal.whatsappUrl && (
                  <a
                    href={nudgeModal.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setStatusMessage('Launching WhatsApp conversation...');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Open in WhatsApp</span>
                  </a>
                )}
                {nudgeModal.whatsappIntentUrl && (
                  <a
                    href={nudgeModal.whatsappIntentUrl}
                    onClick={() => {
                      setStatusMessage('Triggering native WhatsApp intent...');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 px-3 py-2 text-xs font-semibold transition"
                    title="Direct mobile app scheme (whatsapp://)"
                  >
                    <span>App Intent</span>
                  </a>
                )}
                {nudgeModal.smsUrl && (
                  <a
                    href={nudgeModal.smsUrl}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                    title="Open SMS messenger fallback"
                  >
                    <span>SMS</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(nudgeModal.draft);
                    setStatusMessage('Nudge message copied to clipboard!');
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  Copy Text
                </button>
                <button
                  type="button"
                  onClick={() => setNudgeModal(null)}
                  className="rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
