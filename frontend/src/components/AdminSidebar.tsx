'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Cpu,
  Activity,
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  Settings,
  UserCheck,
  Bell,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchPendingCount = async () => {
      try {
        const res = await apiClient.getPendingRegistrationsCount();
        if (isMounted) {
          setPendingCount(res.count || 0);
        }
      } catch {
        // Silently catch if not authenticated as admin yet
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const mainNavItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    {
      label: 'Notifications',
      href: '/admin/notifications',
      icon: Bell,
      badgeCount: pendingCount,
    },
    { label: 'Doctors', href: '/admin/doctors', icon: Users },
    { label: 'Clinical Queries', href: '/admin/queries', icon: FileSpreadsheet },
    { label: 'AI / Models', href: '/admin/ai-models', icon: Cpu },
    { label: 'System Health', href: '/admin/system-health', icon: Activity },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Alerts', href: '/admin/alerts', icon: AlertTriangle },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col h-full w-64 pt-4 border-r border-outline-variant bg-surface-container-low shrink-0 relative z-40 font-body select-none">
      {/* Header Badge Card */}
      <div className="p-4 border-b border-outline-variant">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-container border border-outline-variant">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Admin Portal</h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">
              IT Ops Control Center
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all w-full text-left ${
                isActive
                  ? 'bg-surface-container-highest text-primary border-l-2 border-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {item.badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Admin Profile Link */}
      <div className="p-4 border-t border-outline-variant mt-auto">
        <Link
          href="/admin/profile"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all w-full text-left ${
            pathname === '/admin/profile'
              ? 'bg-surface-container-highest text-primary border-l-2 border-primary font-semibold'
              : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
          }`}
        >
          <UserCheck className={`h-4 w-4 shrink-0 ${pathname === '/admin/profile' ? 'text-primary' : 'text-on-surface-variant'}`} />
          <span className="truncate">Admin Profile</span>
        </Link>
      </div>
    </aside>
  );
}
