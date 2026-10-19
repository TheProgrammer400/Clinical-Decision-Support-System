'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse, LogOut } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { ADMIN_ROLES, RequireAuth, useSession } from '@/lib/session';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={ADMIN_ROLES}>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, signOut } = useSession();

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body antialiased">
      <header className="flex justify-between items-center px-6 h-16 w-full bg-surface border-b border-outline-variant sticky top-0 z-50">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <HeartPulse className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-xl font-headline font-bold tracking-tighter">CDSS Admin</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-tight">
              {user?.fullName} <span className="text-on-surface-variant text-xs">({user?.role === 'SUPER_ADMIN' ? 'Super admin' : 'Organization admin'})</span>
            </p>
            <p className="text-xs text-on-surface-variant font-mono">{user?.email}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
            aria-label="Sign out"
            className="text-on-surface-variant hover:text-error p-1.5 rounded-md"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="flex flex-1 w-full min-w-0">
        <AdminSidebar />
        <main className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
