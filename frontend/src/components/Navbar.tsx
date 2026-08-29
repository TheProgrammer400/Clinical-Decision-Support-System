'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, PlusCircle, FileText, ShieldAlert, LogOut, User, LayoutDashboard } from 'lucide-react';
import { apiClient, getAccessToken } from '@/lib/api-client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      apiClient.getProfile()
        .then(setUser)
        .catch(() => setUser(null));
    }
  }, [pathname]);

  const handleLogout = async () => {
    await apiClient.logout();
    setUser(null);
    router.push('/login');
  };

  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link
              href={user && (user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN') ? '/admin/dashboard' : '/dashboard'}
              className="flex items-center space-x-3 text-sky-400 font-bold text-xl tracking-tight"
            >
              <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
                <Activity className="h-6 w-6 text-sky-400" />
              </div>
              <span>CDSS <span className="text-xs font-normal text-slate-400 px-2 py-0.5 bg-slate-800 rounded-full border border-slate-700">Groq v1.4</span></span>
            </Link>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-4">
            {user && (user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN') ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/admin/dashboard'
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 text-purple-400" />
                  <span>Admin Dashboard</span>
                </Link>

                <Link
                  href="/admin/audit-logs"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/admin/audit-logs'
                      ? 'bg-slate-800 text-purple-400 border border-purple-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Audit Logs</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/dashboard'
                      ? 'bg-slate-800 text-sky-400 border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/cases/new"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/cases/new'
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>New Case</span>
                </Link>

                <Link
                  href="/cases"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/cases'
                      ? 'bg-slate-800 text-sky-400 border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>History</span>
                </Link>
              </>
            )}

            {user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-medium text-slate-200">{user.fullName}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-2 px-3 py-2 bg-slate-800 text-slate-200 rounded-md text-sm font-medium hover:bg-slate-700"
              >
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
