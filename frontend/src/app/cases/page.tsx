'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Plus, FileText, Clock, ChevronRight, AlertCircle, Stethoscope, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import DoctorSidebar from '@/components/DoctorSidebar';

export default function CasesHistoryPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchCases = async (currentPage = 1) => {
    try {
      setLoading(true);
      const data = await apiClient.listCases(currentPage, 15);
      setCases(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to load case history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(page);
  }, [page]);

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      <DoctorSidebar />
      <div className="flex-1 p-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 font-body text-on-surface min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <span>Clinical Case History</span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Browse and review previous decision support evaluations.
          </p>
        </div>

        <Link
          href="/cases/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-medium text-sm rounded-md transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Case Evaluation</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container text-sm">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Activity className="h-8 w-8 text-primary animate-spin" />
          <div className="text-on-surface-variant text-sm">Loading case history...</div>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-surface-container p-12 rounded-xl border border-outline-variant text-center space-y-4">
          <Stethoscope className="h-12 w-12 text-on-surface-variant opacity-40 mx-auto" />
          <h3 className="text-lg font-bold text-on-surface">No Clinical Cases Found</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
            You haven't submitted any clinical case evaluations yet. Click below to evaluate your first case.
          </p>
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-md font-medium text-sm hover:bg-surface-tint transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Evaluate First Case</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const latestAnalysis = c.analyses?.[0];
            const hasMri = c.mriAnalyses && c.mriAnalyses.length > 0;

            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="bg-surface-container block p-5 rounded-lg border border-outline-variant hover:bg-surface-container-highest transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant">
                        #{c.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          c.status === 'COMPLETED'
                            ? 'bg-tertiary-fixed/10 text-tertiary border border-tertiary/20'
                            : c.status === 'FAILED'
                            ? 'bg-error-container/40 text-error border border-error/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                      {hasMri && (
                        <span className="text-xs px-2 py-0.5 rounded font-mono bg-primary-fixed/10 text-primary border border-primary/20">
                          MRI GPU
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface truncate font-medium">
                      {c.caseText}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-on-surface-variant pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </span>
                      {latestAnalysis && (
                        <span className="font-mono text-primary/80">Model: {latestAnalysis.modelName}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-on-surface-variant">
              <div>
                Page {meta.page} of {meta.totalPages} ({meta.total} cases)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded disabled:opacity-40 hover:bg-surface-container-highest transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded disabled:opacity-40 hover:bg-surface-container-highest transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
