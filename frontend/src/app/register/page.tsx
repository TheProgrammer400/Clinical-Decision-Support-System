'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Lock,
  Mail,
  User,
  Building,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const isPasswordMismatch =
    password !== '' && confirmPassword !== '' && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Password and Confirm Password are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.register({
        email,
        password,
        confirmPassword,
        fullName,
        organizationName,
        role: 'DOCTOR',
      });
      setIsSubmittedSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-[85vh] flex flex-col items-center justify-center relative overflow-hidden font-body antialiased selection:bg-primary selection:text-on-primary">
      {/* Decorative technical grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage:
            'linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)',
        }}
      ></div>

      {/* Main Form Container */}
      <main className="relative z-10 w-full max-w-md px-6 flex flex-col gap-8 my-8">
        {/* Header / Branding */}
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-headline font-semibold tracking-tight text-on-surface">
              Obsidian CDSS
            </h1>
          </div>

          <div className="px-2.5 py-0.5 border border-outline-variant rounded-full bg-surface-container-low flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            <span className="text-xs font-mono text-on-surface-variant">v2.4.0-Stable</span>
          </div>

          <p className="text-sm text-on-surface-variant mt-1 max-w-[320px]">
            Secure Clinical Decision Support System Account Registration
          </p>
        </header>

        {isSubmittedSuccess ? (
          /* Success / Pending Admin Approval State Card */
          <div className="bg-surface-container border border-amber-500/40 rounded-lg p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-headline font-bold text-on-surface">
                Registration Request Submitted
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your account request has been sent to an administrator for approval. You will be able to sign in once your request is approved.
              </p>
            </div>

            <div className="w-full bg-surface-container-low border border-outline-variant rounded-md p-3.5 text-left text-xs font-mono text-on-surface-variant space-y-1">
              <div className="flex justify-between">
                <span>Account Name:</span>
                <span className="text-on-surface font-semibold">{fullName}</span>
              </div>
              <div className="flex justify-between">
                <span>Clinical Email:</span>
                <span className="text-primary font-semibold">{email}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-amber-400 font-bold uppercase tracking-wider">PENDING APPROVAL</span>
              </div>
            </div>

            <Link
              href="/login"
              className="w-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-medium py-2.5 rounded flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          /* Registration Form Card */
          <>
            {error && (
              <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm">
                <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-surface-container border border-outline-variant rounded-lg p-8 shadow-2xl relative overflow-hidden">
              {/* Subtle top accent line */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-container"></div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Full Name Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium text-on-surface-variant uppercase tracking-wide"
                    htmlFor="fullName"
                  >
                    Full Clinical Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant h-4 w-4" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Jane Doe, MD"
                      className="w-full bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container focus:border-transparent transition-all placeholder:text-outline font-mono"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium text-on-surface-variant uppercase tracking-wide"
                    htmlFor="email"
                  >
                    Clinical Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant h-4 w-4" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@hospital.org"
                      className="w-full bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container focus:border-transparent transition-all placeholder:text-outline font-mono"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium text-on-surface-variant uppercase tracking-wide"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant h-4 w-4" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container focus:border-transparent transition-all placeholder:text-outline font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium text-on-surface-variant uppercase tracking-wide"
                    htmlFor="confirmPassword"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant h-4 w-4" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-surface-container-low border rounded text-on-surface text-sm py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container transition-all placeholder:text-outline font-mono tracking-widest ${
                        isPasswordMismatch
                          ? 'border-error text-error focus:ring-error'
                          : 'border-outline-variant'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Mismatch Inline Validation Message */}
                  {isPasswordMismatch && (
                    <span className="text-[11px] text-error font-medium flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Passwords do not match.
                    </span>
                  )}
                </div>

                {/* Healthcare Organization Field */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label
                      className="text-xs font-medium text-on-surface-variant uppercase tracking-wide"
                      htmlFor="organization"
                    >
                      Healthcare Organization
                    </label>
                    <span className="text-[10px] text-outline uppercase font-mono">Optional</span>
                  </div>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant h-4 w-4" />
                    <input
                      id="organization"
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="General Hospital"
                      className="w-full bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container focus:border-transparent transition-all placeholder:text-outline font-mono"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || isPasswordMismatch}
                  className="w-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-medium py-2.5 rounded flex items-center justify-center gap-2 transition-all mt-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <span>Submit Account Request</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 pt-4 border-t border-outline-variant text-center text-xs text-on-surface-variant">
                Already registered?{' '}
                <Link
                  href="/login"
                  className="text-primary hover:text-surface-tint font-medium hover:underline"
                >
                  Sign In Here
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Regulatory Compliance Footer */}
        <footer className="text-center">
          <p className="text-[11px] leading-relaxed text-on-surface-variant font-mono tracking-wide">
            © 2026 Obsidian Health. For clinical professional use only.
            <br />
            Regulatory compliance: HIPAA, GDPR, SaMD Class II.
          </p>
        </footer>
      </main>
    </div>
  );
}
