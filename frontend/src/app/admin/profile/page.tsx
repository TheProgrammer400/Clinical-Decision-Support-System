'use client';

import React, { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    apiClient.getProfile().then(setProfile).catch(() => null);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 glass-panel rounded-3xl border border-purple-500/30">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <UserCheck className="h-6 w-6 text-purple-400" />
          <span>Admin Profile & Identity</span>
        </h1>
        <p className="text-sm text-slate-400">IT system administrator account details and permissions.</p>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="space-y-3 text-xs font-mono">
          <div className="flex justify-between p-3.5 bg-slate-900 rounded-xl">
            <span className="text-slate-400">Full Name:</span>
            <span className="text-slate-100 font-bold">{profile?.fullName || 'System Administrator'}</span>
          </div>
          <div className="flex justify-between p-3.5 bg-slate-900 rounded-xl">
            <span className="text-slate-400">Email Address:</span>
            <span className="text-slate-100 font-bold">{profile?.email || 'admin@cdss.med'}</span>
          </div>
          <div className="flex justify-between p-3.5 bg-slate-900 rounded-xl">
            <span className="text-slate-400">Role:</span>
            <span className="text-purple-300 font-bold">{profile?.role || 'ORG_ADMIN'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
