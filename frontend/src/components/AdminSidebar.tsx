'use client';

import React from 'react';
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
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const mainNavItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Doctors', href: '/admin/doctors', icon: Users },
    { label: 'Clinical Queries', href: '/admin/queries', icon: FileSpreadsheet },
    { label: 'AI / Models', href: '/admin/ai-models', icon: Cpu },
    { label: 'System Health', href: '/admin/system-health', icon: Activity },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Alerts', href: '/admin/alerts', icon: AlertTriangle },
    { label: 'Audit & Logs', href: '/admin/audit-logs', icon: ShieldAlert },
    { label: 'System Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-56 glass-panel rounded-r-2xl rounded-l-none border-y-0 border-l-0 border-r border-slate-800/80 p-3.5 flex flex-col justify-between flex-shrink-0 bg-slate-950/90 hidden lg:flex sticky top-16 h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        {/* Header Header badge */}
        <div className="px-3 py-2.5 border-b border-slate-800/80 flex items-center space-x-2.5">
          <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <ShieldAlert className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200 tracking-tight">Admin Portal</div>
            <div className="text-[10px] text-slate-400">IT Ops Control Center</div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 font-semibold shadow-sm shadow-purple-500/10'
                    : 'text-slate-400 hover:bg-slate-900/90 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Admin Profile Link */}
      <div className="pt-3 border-t border-slate-800/80">
        <Link
          href="/admin/profile"
          className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            pathname === '/admin/profile'
              ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 font-semibold'
              : 'text-slate-400 hover:bg-slate-900/90 hover:text-slate-200 border border-transparent'
          }`}
        >
          <UserCheck className={`h-4 w-4 flex-shrink-0 ${pathname === '/admin/profile' ? 'text-purple-400' : 'text-slate-500'}`} />
          <span className="truncate">Admin Profile</span>
        </Link>
      </div>
    </aside>
  );
}
