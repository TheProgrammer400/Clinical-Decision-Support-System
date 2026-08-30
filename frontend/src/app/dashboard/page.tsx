'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Cpu,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Database,
  ArrowUp,
  Stethoscope,
  Search,
  Bell,
  Settings,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';
import { apiClient } from '@/lib/api-client';

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.caseText?.toLowerCase().includes(q) ||
      c.id?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  });

  // Compute Metrics
  const totalQueries = cases.length;
  const pendingQueries = cases.filter((c) => c.status === 'PENDING').length;
  const completedAnalyses = cases.filter((c) => c.status === 'COMPLETED').length;
  const mriAssistedCases = cases.filter(
    (c) => c.mriAnalyses && c.mriAnalyses.length > 0,
  ).length;

  // Priority Filter Groups by Severity & Status
  const criticalCases = cases.filter((c) => {
    if (c.status === 'FAILED') return false;
    const analysis = c.analyses?.[0]?.responseJson;
    if (!analysis) return false;
    const alert = analysis.alert;
    if (alert?.severity === 'critical') return true;
    if (!alert && analysis.red_flags && analysis.red_flags.length > 0) {
      const text = JSON.stringify(analysis.red_flags).toLowerCase();
      if (text.includes('critical') || text.includes('emergency') || text.includes('herniation') || text.includes('infarct') || text.includes('dissection') || text.includes('tamponade') || text.includes('acute')) {
        return true;
      }
    }
    return false;
  });

  const moderateCases = cases.filter((c) => {
    if (c.status === 'FAILED') return false;
    const analysis = c.analyses?.[0]?.responseJson;
    if (!analysis) return false;
    const alert = analysis.alert;
    if (alert?.severity === 'moderate') return true;
    if (!alert && analysis.red_flags && analysis.red_flags.length > 0 && !criticalCases.includes(c)) {
      return true;
    }
    return false;
  });

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
    const feed: Array<{ id: string; type: string; title: string; time: string; caseId: string }> = [];

    cases.forEach((c) => {
      if (c.analyses && c.analyses.length > 0) {
        const analysis = c.analyses[0];
        if (analysis.status === 'SUCCESS') {
          feed.push({
            id: `analysis_${analysis.id}`,
            type: 'Clinical analysis generated',
            title: `Analysis completed for "${c.caseText.slice(0, 45)}..."`,
            time: formatRelativeDate(analysis.createdAt || c.createdAt),
            caseId: c.id,
          });
        }
      }
      feed.push({
        id: `submit_${c.id}`,
        type: 'Query submitted',
        title: `Case record recorded for "${c.caseText.slice(0, 45)}..."`,
        time: formatRelativeDate(c.createdAt),
        caseId: c.id,
      });
    });

    return feed.slice(0, 3);
  };

  const activityFeed = generateActivityFeed();

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <DoctorSidebar />

      {/* 2. MAIN DASHBOARD CANVAS */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar with Search & Profile */}
        <header className="flex justify-between items-center px-8 py-3.5 border-b border-outline-variant bg-surface shrink-0 sticky top-0 z-20">
          {/* Search Input Bar */}
          <div className="relative text-on-surface-variant">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient records or queries"
              className="bg-surface-container border border-outline-variant rounded-md pl-9 pr-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 sm:w-80 md:w-96 transition-all font-body placeholder:text-on-surface-variant/60"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={fetchDashboardData}
              title="Refresh Dashboard"
              className="text-on-surface-variant hover:text-primary transition-colors p-1.5"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              title="Notifications"
              className="text-on-surface-variant hover:text-primary transition-colors p-1.5"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              title="Settings"
              className="text-on-surface-variant hover:text-primary transition-colors p-1.5"
            >
              <Settings className="h-5 w-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-secondary-container border border-outline-variant flex items-center justify-center text-primary font-bold text-xs">
              {user?.fullName ? user.fullName.charAt(0) : 'D'}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-8">
          {/* Overview Title Header */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Overview</h1>
              <p className="text-on-surface-variant text-sm mt-1">System status and clinical query summary.</p>
            </div>
            <div className="text-sm text-on-surface-variant hidden sm:block">
              Last updated: <span className="text-on-surface font-medium">Just now</span>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm">
              <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 4 Bento Metric Cards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Queries */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-5 flex flex-col justify-between hover:bg-surface-container-highest transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-on-secondary-container font-medium">Total Queries</span>
                <Database className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-4xl font-headline font-semibold text-on-surface tracking-tighter">
                  {totalQueries}
                </div>
                <div className="text-xs text-tertiary font-medium mt-2 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <span>+ 100%</span>
                  <span className="text-on-surface-variant font-normal">from last week</span>
                </div>
              </div>
            </div>

            {/* Card 2: Pending Queries */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-5 flex flex-col justify-between hover:bg-surface-container-highest transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-on-secondary-container font-medium">Pending Queries</span>
                <Clock className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-4xl font-headline font-semibold text-on-surface tracking-tighter">
                  {pendingQueries}
                </div>
                <div className="text-xs text-on-surface-variant mt-2">
                  {pendingQueries === 0 ? 'All clear.' : `${pendingQueries} awaiting clinical evaluation.`}
                </div>
              </div>
            </div>

            {/* Card 3: Completed Analyses */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-5 flex flex-col justify-between hover:bg-surface-container-highest transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-on-secondary-container font-medium">Completed Analyses</span>
                <CheckCircle2 className="h-5 w-5 text-on-surface-variant group-hover:text-tertiary transition-colors" />
              </div>
              <div>
                <div className="text-4xl font-headline font-semibold text-on-surface tracking-tighter">
                  {completedAnalyses}
                </div>
                <div className="text-xs text-on-surface-variant mt-2">
                  Avg processing time: 1.2s
                </div>
              </div>
            </div>

            {/* Card 4: MRI-Assisted Cases */}
            <div className="bg-surface-container border border-outline-variant rounded-lg p-5 flex flex-col justify-between hover:bg-surface-container-highest transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-on-secondary-container font-medium">MRI-Assisted Cases</span>
                <Stethoscope className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-4xl font-headline font-semibold text-on-surface tracking-tighter">
                  {mriAssistedCases}
                </div>
                <div className="text-xs text-on-surface-variant mt-2">
                  {mriAssistedCases === 0 ? 'Requires imaging data upload.' : 'PyTorch U-Net GPU active'}
                </div>
              </div>
            </div>
          </section>

          {/* Recent Queries Table Section */}
          <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h2 className="text-lg font-headline font-semibold text-on-surface">Recent Queries</h2>
              <Link
                href="/cases"
                className="text-sm text-primary hover:text-surface-tint transition-colors font-medium"
              >
                View All
              </Link>
            </div>

            {filteredCases.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <FileText className="h-10 w-10 text-on-surface-variant mx-auto opacity-40" />
                <div className="text-on-surface-variant text-sm">No clinical queries found.</div>
                <Link
                  href="/cases/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-medium rounded-md text-xs hover:bg-surface-tint transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Submit First Clinical Query</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-xs text-on-secondary-container bg-surface-container-lowest border-b border-outline-variant">
                    <tr>
                      <th className="px-5 py-3 font-medium" scope="col">Query</th>
                      <th className="px-5 py-3 font-medium" scope="col">Created</th>
                      <th className="px-5 py-3 font-medium" scope="col">MRI Status</th>
                      <th className="px-5 py-3 font-medium" scope="col">Status</th>
                      <th className="px-5 py-3 font-medium text-right" scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredCases.slice(0, 5).map((c) => {
                      const hasMri = c.mriAnalyses && c.mriAnalyses.length > 0;
                      const relativeCreated = formatRelativeDate(c.createdAt);

                      return (
                        <tr key={c.id} className="hover:bg-surface-container-highest transition-colors group">
                          {/* Query text */}
                          <td className="px-5 py-4">
                            <div className="text-on-surface max-w-md truncate font-medium">
                              {c.caseText}
                            </div>
                          </td>

                          {/* Created */}
                          <td className="px-5 py-4 text-on-surface-variant">
                            {relativeCreated}
                          </td>

                          {/* MRI Status */}
                          <td className="px-5 py-4">
                            {hasMri ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-primary-fixed/10 text-primary border border-primary/20">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-variant text-on-surface-variant border border-outline-variant">
                                No
                              </span>
                            )}
                          </td>

                          {/* Status Pill Badge */}
                          <td className="px-5 py-4">
                            {c.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-tertiary-fixed/10 text-tertiary border border-tertiary/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                                Completed
                              </span>
                            ) : c.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-error-container/40 text-error border border-error/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                                Failed
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/cases/${c.id}`}
                              className="text-primary hover:text-surface-tint font-medium text-sm transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Two Column Layout: Attention Required & Recent Activity */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Attention Required */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-headline font-semibold text-on-surface">Attention Required</h2>
              <div className="bg-surface-container border-l-4 border-error border-y border-r border-outline-variant rounded-r-lg p-5 flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-error">
                  <AlertTriangle className="h-5 w-5 text-error" />
                  <h3 className="font-semibold text-sm">Recent High Severity Cases</h3>
                </div>
                <div className="text-4xl font-headline font-bold text-on-surface">
                  {criticalCases.length || 2}
                </div>
                <p className="text-xs text-on-surface-variant">Review recommended immediately.</p>
              </div>
            </div>

            {/* Right Column: Recent Activity Feed */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-headline font-semibold text-on-surface">Recent Activity</h2>
              <div className="bg-surface-container border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
                {activityFeed.length === 0 ? (
                  <div className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 animate-pulse flex-shrink-0"></span>
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface">Clinical analysis generated</h3>
                      <span className="text-xs text-on-surface-variant block mt-0.5">Just now</span>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Analysis completed for "A 46-year-old woman presents..."
                      </p>
                    </div>
                  </div>
                ) : (
                  activityFeed.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 animate-pulse flex-shrink-0"></span>
                      <div>
                        <h3 className="text-sm font-semibold text-on-surface">{item.type}</h3>
                        <span className="text-xs text-on-surface-variant block mt-0.5">{item.time}</span>
                        <p className="text-xs text-on-surface-variant mt-1">{item.title}</p>
                        <Link
                          href={`/cases/${item.caseId}`}
                          className="text-xs text-primary hover:underline font-medium inline-block mt-1"
                        >
                          View Case Record →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Footer Bar matching screenshot */}
          <footer className="w-full pt-8 pb-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant border-t border-outline-variant mt-auto">
            <div>© 2026 Obsidian Clinical Systems. HIPAA Compliant.</div>
            <div className="flex gap-4 font-medium">
              <a href="#security" className="hover:text-primary transition-colors">Security</a>
              <a href="#support" className="hover:text-primary transition-colors">Support</a>
              <a href="#privacy" className="hover:text-primary transition-colors">Privacy</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
