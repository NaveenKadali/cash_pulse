'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Building2,
  Mail,
  Lock,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface RegistrationFormProps {
  title?: string;
  subtitle?: string;
  onSwitchToLogin?: () => void;
  className?: string;
  compact?: boolean;
}

export default function RegistrationForm({
  title = 'Register for Free & Claim Your Trial',
  subtitle = '14-Day Full-Featured Access • No Credit Card Required',
  onSwitchToLogin,
  className = '',
  compact = false,
}: RegistrationFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('+91');
  const [studioName, setStudioName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<any>(null);

  // Keyboard Escape navigation to return to step 1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step === 2 && !loading) {
        setStep(1);
        setError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, loading]);

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studioName.trim()) {
      setError('Please provide your studio or workspace name');
      return;
    }
    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid Indian mobile number (+91 followed by 10 digits)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone,
          studioName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Registration failed');
        return;
      }

      setRegistrationSuccess(data);
    } catch {
      setError('Network error during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-indigo-950/40 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden ${className}`}>
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-24 -left-24 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative mb-6 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>14-Day Free Trial • Instant Setup</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>

      {!registrationSuccess ? (
        <>
          {/* Stepper Progress Indicator */}
          <div className="flex items-center justify-between text-xs font-semibold pb-4 mb-4 border-b border-slate-800">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
              }`}>
                1
              </span>
              <span>Credentials</span>
            </div>
            <div className="h-[1px] w-12 bg-slate-800" />
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 2 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-500'
              }`}>
                2
              </span>
              <span>Studio &amp; Mobile</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Full Name, Email, Password */}
          {step === 1 && (
            <form onSubmit={handleStepOne} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Work Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="aarav@aaravpixels.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Used for studio ownership and milestone alerts</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all duration-150 cursor-pointer active:scale-98"
              >
                <span>Continue to Studio Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          )}

          {/* STEP 2: Studio Name & Phone Number */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Studio / Brand Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Pixels Wedding Studio"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number (SMS OTP)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Used for 1-tap mobile logins &amp; critical cash alerts</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all duration-150 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Provisioning Workspace...' : 'Claim 14-Day Free Trial'}
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        /* SUCCESS & VERIFICATION SCREEN */
        <div className="text-center space-y-4 py-2">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-white">Studio Workspace Provisioned!</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome to CashPulse, <span className="font-semibold text-white">{registrationSuccess.user.fullName}</span>! Your studio <span className="text-emerald-400 font-semibold">{registrationSuccess.user.studioName}</span> is ready with full trial features.
          </p>

          {/* Email Verification Box */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Mail className="h-4 w-4" />
              <span>Email Verification Link Sent</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              We sent a verification link to <span className="font-mono text-white">{registrationSuccess.user.email}</span>. Click the link to claim your full subscription.
            </p>

            {/* Instant verification simulator link for testing */}
            {registrationSuccess.emailVerificationPreview?.verificationLink && (
              <div className="pt-2 border-t border-emerald-500/20">
                <a
                  href={registrationSuccess.emailVerificationPreview.verificationLink}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline"
                >
                  <span>[Click here to simulate email verification]</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <Link
            href="/app"
            className="block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition"
          >
            Enter Studio Dashboard →
          </Link>
        </div>
      )}

      {/* Switch to login footer */}
      <div className="text-center pt-4 mt-4 border-t border-slate-800/80">
        <span className="text-xs text-slate-400">Already registered? </span>
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
          >
            Sign In to your studio
          </button>
        ) : (
          <Link href="/login" className="text-xs font-semibold text-emerald-400 hover:underline">
            Sign In to your studio
          </Link>
        )}
      </div>
    </div>
  );
}
