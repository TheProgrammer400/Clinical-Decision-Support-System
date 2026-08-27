'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, PlusCircle, FileText, Clock, ChevronRight, AlertCircle, Stethoscope } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <FileText className="h-7 w-7 text-sky-400" />
            <span>Clinical Case History</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and review previous decision support evaluations.
          </p>
        </div>

        <Link
          href="/cases/new"
          className="flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-sky-600/20 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Case Evaluation</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Activity className="h-8 w-8 text-sky-400 animate-spin" />
          <div className="text-slate-400 text-sm">Loading case history...</div>
        </div>
      ) : cases.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
          <Stethoscope className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">No Clinical Cases Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            You haven't submitted any clinical case evaluations yet. Click below to evaluate your first case.
          </p>
          <Link
            href="/cases/new"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-xl font-medium text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Evaluate First Case</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const latestAnalysis = c.analyses?.[0];
            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="glass-card block p-5 rounded-2xl border border-slate-800/80 hover:border-sky-500/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1 pr-4 flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        #{c.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                          c.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : c.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 line-clamp-2 font-medium">
                      {c.caseText}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </span>
                      {latestAnalysis && (
                        <span>Model: {latestAnalysis.modelName}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-500" />
                </div>
              </Link>
            );
          })}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-400">
              <div>
                Page {meta.page} of {meta.totalPages} ({meta.total} cases)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
