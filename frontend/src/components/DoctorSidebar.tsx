'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Plus,
  LayoutDashboard,
  Stethoscope,
  FileCheck,
  History,
  BookOpen,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function DoctorSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await apiClient.logout().catch(() => null);
    router.push('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      name: 'Clinical Query',
      href: '/cases/new',
      icon: Stethoscope,
      active: pathname === '/cases/new',
    },
    {
      name: 'Analysis Records',
      href: '/cases',
      icon: FileCheck,
      active: pathname === '/cases',
    }
  ];

  return (
    <aside className="w-64 bg-surface-container-low border-r border-outline-variant flex flex-col h-screen sticky top-0 shrink-0 z-30 font-body text-on-surface select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center text-primary">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-headline font-bold text-on-surface tracking-tight leading-none">
              Obsidian CDSS
            </h1>
            <span className="text-[10px] font-mono text-on-surface-variant mt-1 inline-block">
              v2.4.0-Stable
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? 'bg-surface-container-highest text-primary border-l-2 border-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className={`h-4 w-4 ${item.active ? 'text-primary' : 'text-on-surface-variant'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer Menu */}
      <div className="p-3 border-t border-outline-variant space-y-1">
        <a
          href="#help"
          onClick={(e) => {
            e.preventDefault();
            alert('Obsidian CDSS Documentation & Help Center available in user portal.');
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-on-surface-variant" />
          <span>Help Center</span>
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-error hover:bg-error-container/30 transition-colors"
        >
          <LogOut className="h-4 w-4 text-error" />
          <span className="font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
