'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  Cpu,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  ShieldAlert,
  UserCheck,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await apiClient.getProfile().catch(() => null);
      if (!profileData) {
        router.push('/login');
        return;
      }
      setUser(profileData);
      const casesResponse = await apiClient.listCases(1, 50).catch(() => ({ data: [], meta: { total: 0 } }));
      setCases(casesResponse.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute Stats
  const totalQueries = cases.length;
  const pendingQueries = cases.filter((c) => c.status === 'PENDING').length;
  const completedAnalyses = cases.filter((c) => c.status === 'COMPLETED').length;
  const mriAssistedCases = cases.filter(
    (c) => c.mriAnalyses && c.mriAnalyses.length > 0,
  ).length;

  // Priority Filter Groups
  const highRiskCases = cases.filter((c) => {
    const analysis = c.analyses?.[0]?.responseJson;
    return analysis?.red_flags && analysis.red_flags.length > 0;
  });

  const pendingReviewCases = cases.filter((c) => c.status === 'PENDING');
  const failedCases = cases.filter((c) => c.status === 'FAILED');

  // Relative Date Formatter
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return 'Today';
    }
    if (diffDays === 1 || (diffHours < 48 && date.getDate() === now.getDate() - 1)) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Recent Activity Feed Generator
  const generateActivityFeed = () => {
    const feed: Array<{ id: string; type: string; title: string; time: string; caseId: string; color: string }> = [];

    cases.forEach((c) => {
      // 1. Query Submitted
      feed.push({
        id: `submit_${c.id}`,
        type: 'Query submitted',
        title: `Clinical query submitted: "${c.caseText.slice(0, 45)}..."`,
        time: formatRelativeDate(c.createdAt),
        caseId: c.id,
        color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
      });

      // 2. MRI Analysis Completed
      if (c.mriAnalyses && c.mriAnalyses.length > 0) {
        c.mriAnalyses.forEach((mri: any) => {
          if (mri.status === 'COMPLETED') {
            feed.push({
              id: `mri_${mri.id}`,
              type: 'MRI analysis completed',
              title: `PyTorch U-Net GPU segmentation generated for "${mri.originalFilename}"`,
              time: formatRelativeDate(mri.createdAt || c.createdAt),
              caseId: c.id,
              color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
            });
          }
        });
      }

      // 3. Clinical Analysis Generated
      if (c.analyses && c.analyses.length > 0) {
        const analysis = c.analyses[0];
        if (analysis.status === 'SUCCESS') {
          feed.push({
            id: `analysis_${analysis.id}`,
            type: 'Clinical analysis generated',
            title: `Groq LLM probabilistic differential reasoning completed (${analysis.modelName})`,
            time: formatRelativeDate(analysis.createdAt || c.createdAt),
            caseId: c.id,
            color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
          });
        }
      }
    });

    return feed.slice(0, 5);
  };

  const activityFeed = generateActivityFeed();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="h-10 w-10 text-sky-400 animate-spin" />
        <div className="text-slate-400 text-sm font-medium">Loading Doctor Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8 pb-12">
      {/* Top Welcome Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/20">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              Doctor Dashboard
            </h1>
            <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-semibold rounded-full flex items-center space-x-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              <span>{user?.fullName || 'Physician'}</span>
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Welcome back, {user?.fullName || 'Doctor'}. Here is your clinical decision support overview.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          <Link
            href="/cases/new"
            className="flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/25 transition-all text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ New Clinical Query</span>
          </Link>
          <Link
            href="/cases"
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 transition-colors text-sm"
          >
            <FileText className="h-4 w-4" />
            <span>View All Queries</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            title="Refresh Metrics"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* TOP STATS GRID (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Queries */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden group hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Queries</span>
            <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
            {totalQueries}
          </div>
          <p className="text-xs text-slate-500">Submitted clinical presentation records</p>
        </div>

        {/* Stat 2: Pending Queries */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Queries</span>
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
            {pendingQueries}
          </div>
          <p className="text-xs text-slate-500">Awaiting LLM clinical evaluation</p>
        </div>

        {/* Stat 3: Completed Analyses */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Analyses</span>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {completedAnalyses}
          </div>
          <p className="text-xs text-slate-500">Evaluated with differential reasoning</p>
        </div>

        {/* Stat 4: MRI-Assisted Cases */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 space-y-3 relative overflow-hidden group hover:border-purple-500/50 bg-purple-950/10 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">MRI-Assisted Cases</span>
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/30 text-purple-400">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-300 font-mono tracking-tight">
            {mriAssistedCases}
          </div>
          <p className="text-xs text-slate-400">Quantitative PyTorch U-Net GPU segmentation</p>
        </div>
      </div>

      {/* MAIN SECTION: RECENT QUERIES TABLE */}
      <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Activity className="h-5 w-5 text-sky-400" />
              <span>Recent Queries</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest clinical cases and decision support status overview.
            </p>
          </div>
          <Link
            href="/cases"
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <FileText className="h-12 w-12 text-slate-600 mx-auto" />
            <div className="text-slate-400 text-sm">No clinical queries found.</div>
            <Link
              href="/cases/new"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white font-medium rounded-xl text-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Submit First Clinical Query</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="py-3.5 px-4">Query</th>
                  <th scope="col" className="py-3.5 px-4">Created</th>
                  <th scope="col" className="py-3.5 px-4">MRI</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {cases.slice(0, 7).map((c) => {
                  const hasMri = c.mriAnalyses && c.mriAnalyses.length > 0;
                  const relativeCreated = formatRelativeDate(c.createdAt);

                  return (
                    <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                      {/* Query Narrative */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-100 max-w-md truncate">
                          {c.caseText}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          ID: #{c.id.slice(0, 8)}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-4 px-4 text-xs text-slate-400 font-medium">
                        {relativeCreated}
                      </td>

                      {/* MRI Badge */}
                      <td className="py-4 px-4">
                        {hasMri ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            <Cpu className="h-3 w-3 text-purple-400" />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            No
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            c.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : c.status === 'FAILED'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {c.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
                          {c.status === 'PENDING' && <Clock className="h-3 w-3" />}
                          {c.status === 'FAILED' && <AlertTriangle className="h-3 w-3" />}
                          <span>{c.status}</span>
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={c.status === 'PENDING' ? `/cases/${c.id}` : `/cases/${c.id}`}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            c.status === 'PENDING'
                              ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30'
                              : 'bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{c.status === 'PENDING' ? 'Continue' : 'View'}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TWO COLUMN GRID: PRIORITY / ATTENTION & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: PRIORITY / ATTENTION */}
        <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">Priority / Attention</h2>
          </div>

          <div className="space-y-4">
            {/* 1. High-risk analyses */}
            <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-red-400">
                <span className="flex items-center space-x-1.5 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>High-Risk Analyses (Red Flags Identified)</span>
                </span>
                <span className="px-2 py-0.5 bg-red-500/20 rounded font-mono text-red-300">
                  {highRiskCases.length}
                </span>
              </div>
              {highRiskCases.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-red-200">
                  {highRiskCases.slice(0, 3).map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span className="truncate max-w-[280px]">• {c.caseText}</span>
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-red-400 underline font-semibold flex items-center space-x-1 ml-2"
                      >
                        <span>Review</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No urgent high-risk red flags detected in active cases.</p>
              )}
            </div>

            {/* 2. Queries requiring physician review */}
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center space-x-1.5 uppercase tracking-wider">
                  <Clock className="h-4 w-4" />
                  <span>Queries Requiring Physician Review</span>
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 rounded font-mono text-amber-300">
                  {pendingReviewCases.length}
                </span>
              </div>
              {pendingReviewCases.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-amber-200">
                  {pendingReviewCases.slice(0, 3).map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span className="truncate max-w-[280px]">• {c.caseText}</span>
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-amber-400 underline font-semibold ml-2"
                      >
                        <span>Evaluate</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">All submitted clinical queries have completed initial AI analysis.</p>
              )}
            </div>

            {/* 3. Failed/incomplete analyses */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center space-x-1.5 uppercase tracking-wider">
                  <Zap className="h-4 w-4 text-slate-400" />
                  <span>Failed / Incomplete Analyses</span>
                </span>
                <span className="px-2 py-0.5 bg-slate-800 rounded font-mono text-slate-300">
                  {failedCases.length}
                </span>
              </div>
              {failedCases.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-300">
                  {failedCases.slice(0, 3).map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span className="truncate max-w-[280px]">• #{c.id.slice(0, 8)}</span>
                      <Link href={`/cases/${c.id}`} className="text-sky-400 underline">
                        Retry
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">Zero processing failures recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* PANEL 2: RECENT ACTIVITY FEED */}
        <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-sky-400" />
              <h2 className="text-base font-bold text-slate-100">Recent Activity</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Live Timeline</span>
          </div>

          {activityFeed.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No recent system activity recorded.</div>
          ) : (
            <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {activityFeed.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 relative z-10">
                  <div className={`p-1.5 rounded-full border text-[10px] ${item.color}`}>
                    <Activity className="h-3 w-3" />
                  </div>
                  <div className="flex-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{item.type}</span>
                      <span className="text-[11px] text-slate-500">{item.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">{item.title}</p>
                    <Link
                      href={`/cases/${item.caseId}`}
                      className="text-[11px] text-sky-400 hover:underline font-medium inline-block pt-1"
                    >
                      View Case Record →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
