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
  Stethoscope,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [role, setRole] = useState('DOCTOR');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.register({
        email,
        password,
        fullName,
        organizationName,
        role,
      });
      router.push('/cases');
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

        {error && (
          <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Card */}
        <div className="bg-surface-container border border-outline-variant rounded-lg p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-container"></div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Full Name Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide" htmlFor="fullName">
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
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide" htmlFor="email">
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

            {/* Password Field with Eye Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide" htmlFor="password">
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

            {/* Healthcare Organization Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide" htmlFor="organization">
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

            {/* Role Type Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide" htmlFor="role">
                Role Type
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant h-4 w-4" />
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container focus:border-transparent transition-all cursor-pointer font-mono"
                >
                  <option value="DOCTOR">Attending Physician / Clinician</option>
                  <option value="ORG_ADMIN">Organization Administrator</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-medium py-2.5 rounded flex items-center justify-center gap-2 transition-all mt-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-container active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-4 border-t border-outline-variant text-center text-xs text-on-surface-variant">
            Already registered?{' '}
            <Link href="/login" className="text-primary hover:text-surface-tint font-medium hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>

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
