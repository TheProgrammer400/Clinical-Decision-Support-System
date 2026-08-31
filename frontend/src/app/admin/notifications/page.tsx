'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  UserCheck,
  Building,
  Mail,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface RegistrationRequest {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  organizationName: string;
}

export default function AdminNotificationsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State for Confirmation Dialogs
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT';
    request: RegistrationRequest | null;
  }>({
    isOpen: false,
    type: 'APPROVE',
    request: null,
  });

  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getRegistrationRequests();
      setRequests(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch registration requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenConfirm = (type: 'APPROVE' | 'REJECT', req: RegistrationRequest) => {
    setConfirmModal({
      isOpen: true,
      type,
      request: req,
    });
  };

  const handleCloseConfirm = () => {
    setConfirmModal({
      isOpen: false,
      type: 'APPROVE',
      request: null,
    });
  };

  const handleExecuteAction = async () => {
    const { type, request } = confirmModal;
    if (!request) return;

    try {
      setProcessingId(request.id);
      setError(null);

      if (type === 'APPROVE') {
        const res = await apiClient.approveRegistrationRequest(request.id);
        setSuccessMessage(res.message || 'Registration request approved. Account is now active.');
      } else {
        const res = await apiClient.rejectRegistrationRequest(request.id);
        setSuccessMessage(res.message || 'Registration request rejected.');
      }

      handleCloseConfirm();
      await fetchRequests();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || `Failed to ${type.toLowerCase()} request.`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesTab = activeTab === 'ALL' || req.status === activeTab;
    const matchesSearch =
      req.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.organizationName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  if (loading && requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-24 w-full">
        <Bell className="h-8 w-8 text-primary animate-spin" />
        <div className="text-on-surface-variant text-xs font-medium">Loading Registration Approval Notifications...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-outline-variant bg-surface-container-low w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded border border-outline-variant bg-surface-container flex items-center justify-center text-primary shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-headline font-bold text-on-surface tracking-tight">
                Notifications
              </h1>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {pendingCount} Pending Approval{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Review and approve clinician account registration requests
            </p>
          </div>
        </div>

        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-medium text-on-surface shrink-0"
        >
          <RefreshCw className={`h-4 w-4 text-primary ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Requests</span>
        </button>
      </div>

      {/* Success Alert Banner */}
      {successMessage && (
        <div className="p-4 bg-tertiary/10 border border-tertiary/30 rounded-lg flex items-center justify-between text-tertiary text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-tertiary shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-center gap-3 text-on-error-container text-sm">
          <AlertCircle className="h-5 w-5 text-error shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Bar: Tabs & Search Input */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container p-4 rounded-lg border border-outline-variant">
        {/* Filter Tabs */}
        <div className="flex rounded-md border border-outline-variant overflow-hidden bg-surface-container-low text-xs font-medium w-full sm:w-auto">
          {[
            { id: 'PENDING', label: 'Pending Approval', count: pendingCount },
            { id: 'APPROVED', label: 'Approved', count: approvedCount },
            { id: 'REJECTED', label: 'Rejected', count: rejectedCount },
            { id: 'ALL', label: 'All Requests', count: requests.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 transition-colors border-r border-outline-variant last:border-r-0 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary/20 text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant h-4 w-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or hospital..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-md text-on-surface text-xs py-2 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-outline"
          />
        </div>
      </div>

      {/* Request List Cards */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="p-12 rounded-lg border border-outline-variant bg-surface-container flex flex-col items-center justify-center text-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-tertiary/60" />
            <h3 className="text-base font-bold text-on-surface">No Registration Requests Found</h3>
            <p className="text-xs text-on-surface-variant max-w-md">
              {activeTab === 'PENDING'
                ? 'All registration requests have been reviewed. No pending approvals at this time.'
                : 'No requests match the selected tab or search query.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isRejected = req.status === 'REJECTED';

            return (
              <div
                key={req.id}
                className={`p-5 rounded-lg border transition-all bg-surface-container flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden ${
                  isPending
                    ? 'border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : isApproved
                    ? 'border-tertiary/30'
                    : 'border-error/30 opacity-80'
                }`}
              >
                {/* Status Indicator Stripe */}
                <div
                  className={`absolute top-0 left-0 w-1.5 h-full ${
                    isPending ? 'bg-amber-400' : isApproved ? 'bg-tertiary' : 'bg-error'
                  }`}
                />

                {/* Left Side: Request Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${
                      isPending
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : isApproved
                        ? 'bg-tertiary/10 border-tertiary/30 text-tertiary'
                        : 'bg-error-container/40 border-error/30 text-error'
                    }`}
                  >
                    {isPending ? (
                      <Clock className="h-6 w-6" />
                    ) : isApproved ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <XCircle className="h-6 w-6" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-bold text-on-surface">{req.fullName}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : isApproved
                            ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                            : 'bg-error-container/40 text-error border-error/30'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant font-mono">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span>{req.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-on-surface-variant" />
                        <span>{req.organizationName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-on-surface-variant" />
                        <span>{new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                {isPending && (
                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenConfirm('REJECT', req)}
                      disabled={processingId === req.id}
                      className="px-4 py-2 rounded-md border border-error/40 bg-error/10 hover:bg-error/20 text-error text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleOpenConfirm('APPROVE', req)}
                      disabled={processingId === req.id}
                      className="px-4 py-2 rounded-md border border-tertiary/40 bg-tertiary/20 hover:bg-tertiary/30 text-tertiary text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 shadow-md shadow-tertiary/10 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Account</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal Dialog */}
      {confirmModal.isOpen && confirmModal.request && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-full border ${
                  confirmModal.type === 'APPROVE'
                    ? 'bg-tertiary/10 border-tertiary/30 text-tertiary'
                    : 'bg-error-container/40 border-error/30 text-error'
                }`}
              >
                {confirmModal.type === 'APPROVE' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-headline font-bold text-on-surface">
                  {confirmModal.type === 'APPROVE' ? 'Approve Account Request' : 'Reject Account Request'}
                </h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  ID: {confirmModal.request.id.slice(0, 12)}...
                </p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-low p-3.5 rounded border border-outline-variant">
              {confirmModal.type === 'APPROVE' ? (
                <>
                  Approve registration request and activate doctor account for{' '}
                  <strong className="text-on-surface font-semibold">{confirmModal.request.fullName}</strong> ({confirmModal.request.email})?
                </>
              ) : (
                <>
                  Reject registration request for{' '}
                  <strong className="text-on-surface font-semibold">{confirmModal.request.fullName}</strong> ({confirmModal.request.email})?
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant">
              <button
                onClick={handleCloseConfirm}
                disabled={processingId !== null}
                className="px-4 py-2 rounded border border-outline-variant bg-surface-container-high hover:bg-surface-variant text-on-surface-variant text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={processingId !== null}
                className={`px-5 py-2 rounded text-xs font-bold transition-all shadow-md active:scale-95 ${
                  confirmModal.type === 'APPROVE'
                    ? 'bg-tertiary hover:bg-tertiary-fixed-dim text-on-tertiary'
                    : 'bg-error hover:bg-red-600 text-white'
                }`}
              >
                {processingId !== null ? 'Processing...' : confirmModal.type === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
