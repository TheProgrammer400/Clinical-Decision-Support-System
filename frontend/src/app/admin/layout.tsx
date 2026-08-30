'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  HeartPulse,
  LayoutDashboard,
  Shield,
  LogOut,
} from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { apiClient } from '@/lib/api-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    apiClient
      .getProfile()
      .then((profile) => {
        if (!profile || (profile.role !== 'ORG_ADMIN' && profile.role !== 'SUPER_ADMIN')) {
          router.push('/login');
          return;
        }
        setUser(profile);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [pathname, router]);

  const handleLogout = async () => {
    await apiClient.logout().catch(() => null);
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-body antialiased selection:bg-primary selection:text-on-primary">
      {/* Single Top Admin Header */}
      <header className="flex justify-between items-center px-6 h-16 w-full bg-surface border-b border-outline-variant sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-6 w-6 text-primary" />
          <span className="text-xl font-headline font-bold tracking-tighter text-on-surface">
            Obsidian CDSS
          </span>
          <span className="text-xs bg-surface-container-highest text-on-surface-variant px-2.5 py-0.5 rounded-full border border-outline-variant ml-1 font-mono">
            Groq v1.4
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/admin/dashboard'
                ? 'bg-surface-container-high border border-primary/30 text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Admin Dashboard</span>
          </Link>
          <Link
            href="/admin/audit-logs"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/admin/audit-logs'
                ? 'bg-surface-container-high border border-primary/30 text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Audit Logs</span>
          </Link>
          <div className="h-6 w-px bg-outline-variant"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-on-surface leading-tight">
                {user?.fullName || 'Dr. Sarah Connor'}{' '}
                <span className="text-on-surface-variant text-xs font-normal">
                  ({user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'CMIO'})
                </span>
              </p>
              <p className="text-xs text-on-surface-variant font-mono">
                {user?.email || 'admin@cdss.med'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-md hover:bg-surface-container"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Canvas Layout with Single Left Sidebar */}
      <div className="flex flex-1 w-full min-w-0">
        <AdminSidebar />
        <main className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
