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

export default function RegisterPage() {
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

  // Return to step 1 on Escape key when on step 2
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
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full rounded-[15px] bg-[#0f172a] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">CashPulse</span>
        </Link>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Start Your Free Studio Trial</h2>
        <p className="text-xs text-slate-400">
          The sovereign cash-flow co-pilot &amp; client settlement engine for photographers
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {!registrationSuccess ? (
            <>
              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between text-xs font-semibold pb-4 border-b border-slate-800">
                <div className={`flex items-center gap-2 ${step === 1 ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                    step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    1
                  </span>
                  <span>Credentials</span>
                </div>
                <div className="h-[1px] w-12 bg-slate-800" />
                <div className={`flex items-center gap-2 ${step === 2 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                    step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    2
                  </span>
                  <span>Studio &amp; Mobile</span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: Full Name, Email, Password Twice */}
              {step === 1 && (
                <form onSubmit={handleStepOne} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">Full Name</label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Aarav Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">Email Address</label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="aarav@aaravpixels.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Email verification required to activate subscription</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">Set Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
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
                    <label className="block text-xs font-medium text-slate-300">Confirm Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
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
                    <label className="block text-xs font-medium text-slate-300">Studio or Workspace Name</label>
                    <div className="relative mt-1">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aarav Pixels Wedding Studio"
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300">Mobile Number (SMS OTP)</label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="+919876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Used for 1-tap mobile logins &amp; critical cash alerts</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
                    >
                      {loading ? 'Creating Workspace...' : 'Activate Studio Trial'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* SUCCESS & COMPULSORY EMAIL VERIFICATION GATE */
            <div className="text-center space-y-4 py-2">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">Studio Workspace Created!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Welcome to CashPulse, <span className="font-semibold text-white">{registrationSuccess.user.fullName}</span>! Your studio <span className="text-indigo-400 font-semibold">{registrationSuccess.user.studioName}</span> has been provisioned.
              </p>

              {/* Compulsory Verification Card */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Mail className="h-4 w-4" />
                  <span>Email Verification Compulsory</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  We have sent a verification link to <span className="font-mono text-white">{registrationSuccess.user.email}</span>. Click the link in your email to claim your free trial subscription.
                </p>

                {/* Instant verification simulator link for testing */}
                <div className="pt-2 border-t border-amber-500/20">
                  <a
                    href={registrationSuccess.emailVerificationPreview?.verificationLink}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline"
                  >
                    <span>[Click here to simulate email verification click]</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <Link
                href="/app"
                className="block w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
              >
                Enter Studio Dashboard
              </Link>
            </div>
          )}

          <div className="text-center pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Already have a studio account? </span>
            <Link href="/login" className="text-xs font-semibold text-indigo-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
