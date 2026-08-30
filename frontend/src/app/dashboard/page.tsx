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
  Eye,
  Database,
  ArrowUp,
  Stethoscope,
  TrendingUp,
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
        title: `New clinical case data recorded for "${c.caseText.slice(0, 45)}..."`,
        time: formatRelativeDate(c.createdAt),
        caseId: c.id,
        color: 'text-primary border-primary/30 bg-primary/10',
      });

      // 2. MRI Analysis Completed
      if (c.mriAnalyses && c.mriAnalyses.length > 0) {
        c.mriAnalyses.forEach((mri: any) => {
          if (mri.status === 'COMPLETED') {
            feed.push({
              id: `mri_${mri.id}`,
              type: 'MRI analysis completed',
              title: `PyTorch U-Net GPU segmentation generated for "${mri.originalFilename || 'MRI Scan'}"`,
              time: formatRelativeDate(mri.createdAt || c.createdAt),
              caseId: c.id,
              color: 'text-primary border-primary/30 bg-primary/10',
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
            title: `Analysis completed for "${c.caseText.slice(0, 40)}..."`,
            time: formatRelativeDate(analysis.createdAt || c.createdAt),
            caseId: c.id,
            color: 'text-tertiary border-tertiary/30 bg-tertiary/10',
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
        <Activity className="h-10 w-10 text-primary animate-spin" />
        <div className="text-on-surface-variant text-sm font-medium">Loading Doctor Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex-grow p-6 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-8 font-body">
      {/* 1. HEADER SECTION */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Overview</h1>
          <p className="text-on-surface-variant text-sm mt-1">System status and clinical query summary.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/cases/new"
            className="bg-primary text-on-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-tint transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Query</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            title="Refresh Dashboard"
            className="p-2 bg-surface-container border border-outline-variant hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-md transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="text-sm text-on-surface-variant hidden sm:block">
            Last updated: <span className="text-on-surface font-medium">Just now</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm">
          <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. DASHBOARD OVERVIEW GRID (Bento Style 4 Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1: Total Queries */}
        <div className="bg-surface-container border border-outline-variant rounded-lg p-5 flex flex-col justify-between hover:bg-surface-container-highest transition-colors cursor-pointer group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-on-secondary-container font-medium">Total Queries</span>
            <Database className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
          </div>
          <div>
            <div className="text-4xl font-headline font-semibold text-on-surface tracking-tighter">
              {totalQueries}
            </div>
            <div className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-tertiary" />
              <span className="text-tertiary font-medium">100%</span> from last week
            </div>
          </div>
        </div>

        {/* Metric Card 2: Pending Queries */}
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
              {pendingQueries === 0 ? 'All clear.' : `${pendingQueries} awaiting clinical analysis.`}
            </div>
          </div>
        </div>

        {/* Metric Card 3: Completed Analyses */}
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

        {/* Metric Card 4: MRI-Assisted Cases */}
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

      {/* 3. RECENT QUERIES TABLE SECTION */}
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

        {cases.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <FileText className="h-10 w-10 text-on-surface-variant mx-auto opacity-50" />
            <div className="text-on-surface-variant text-sm">No clinical queries recorded yet.</div>
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
                {cases.slice(0, 5).map((c) => {
                  const hasMri = c.mriAnalyses && c.mriAnalyses.length > 0;
                  const relativeCreated = formatRelativeDate(c.createdAt);

                  return (
                    <tr key={c.id} className="hover:bg-surface-container-highest transition-colors group">
                      {/* Query snippet */}
                      <td className="px-5 py-4">
                        <div className="text-on-surface max-w-md truncate font-medium">
                          {c.caseText}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-on-surface-variant">
                        {relativeCreated}
                      </td>

                      {/* MRI Status Badge */}
                      <td className="px-5 py-4">
                        {hasMri ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-primary-fixed/10 text-primary border border-primary/20">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-surface-variant text-on-surface-variant border border-outline-variant">
                            No
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        {c.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-tertiary-fixed/10 text-tertiary border border-tertiary/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                            Completed
                          </span>
                        ) : c.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-error-container/40 text-error border border-error/30">
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

      {/* 4. TWO COLUMN LAYOUT: ATTENTION REQUIRED & RECENT ACTIVITY */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Attention Required */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h2 className="text-lg font-headline font-semibold text-on-surface">Attention Required</h2>
          
          {/* Card 1: High Severity */}
          <div className="bg-surface-container border border-error/20 rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="h-4 w-4" />
              <h3 className="font-medium text-sm">Recent High Severity Cases</h3>
            </div>
            <div className="text-3xl font-headline font-semibold text-on-surface">
              {criticalCases.length}
            </div>
            <p className="text-xs text-on-surface-variant">Review recommended immediately.</p>
          </div>

          {/* Card 2: Moderate Severity */}
          <div className="bg-surface-container border border-orange-500/20 rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
            <div className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-4 w-4" />
              <h3 className="font-medium text-sm">Recent Moderate Severity Cases</h3>
            </div>
            <div className="text-3xl font-headline font-semibold text-on-surface">
              {moderateCases.length}
            </div>
            <p className="text-xs text-on-surface-variant">Monitor progression.</p>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-headline font-semibold text-on-surface">Recent Activity</h2>
          <div className="bg-surface-container border border-outline-variant rounded-lg p-6">
            {activityFeed.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic">No recent system activity recorded.</p>
            ) : (
              <ol className="relative border-l border-outline-variant ml-3 space-y-6">
                {activityFeed.map((item) => (
                  <li key={item.id} className="pl-6 relative">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-surface-container rounded-full -left-3 ring-4 ring-surface-container-highest border border-primary">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                    </span>
                    <h3 className="flex items-center mb-1 text-sm font-medium text-on-surface">
                      {item.type}
                    </h3>
                    <time className="block mb-2 text-xs font-normal leading-none text-on-surface-variant">
                      {item.time}
                    </time>
                    <p className="mb-2 text-sm font-normal text-on-secondary-container">
                      {item.title}
                    </p>
                    <Link
                      href={`/cases/${item.caseId}`}
                      className="inline-flex items-center text-xs font-medium text-primary hover:text-surface-tint transition-colors"
                    >
                      <span>View Case Record</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
