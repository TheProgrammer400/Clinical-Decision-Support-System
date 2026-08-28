'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loginRes = await apiClient.login({ email, password });
      if (loginRes.user?.role === 'ORG_ADMIN' || loginRes.user?.role === 'SUPER_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 mb-2">
            <Activity className="h-8 w-8 text-sky-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Physician Sign In</h2>
          <p className="text-sm text-slate-400">Access the Clinical Decision Support System</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Clinical Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor.smith@cdss.med"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-sky-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center text-sm text-slate-400">
          Need a clinician account?{' '}
          <Link href="/register" className="text-sky-400 hover:underline font-medium">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}
