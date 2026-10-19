'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { apiClient, hasAccessToken, onSessionChange, refreshSession } from './api-client';
import type { Role, SessionUser } from './types';

interface SessionState {
  user: SessionUser | null;
  /** True until the initial session restore has finished. */
  loading: boolean;
  setUser: (user: SessionUser | null) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onSessionChange(setUser), []);

  useEffect(() => {
    let active = true;
    (async () => {
      const restored = hasAccessToken() ? await apiClient.getSession().catch(() => null) : await refreshSession();
      if (active) {
        setUser(restored);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
  }, []);

  return <SessionContext.Provider value={{ user, loading, setUser, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}

export const ADMIN_ROLES: Role[] = ['ORG_ADMIN', 'SUPER_ADMIN'];

export function homeFor(user: SessionUser): string {
  return ADMIN_ROLES.includes(user.role) ? '/admin/dashboard' : '/dashboard';
}

/**
 * Client-side route guard. The backend enforces authorization on every request; this only
 * avoids rendering pages the user cannot use and routes them to the right place.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const mustChange = Boolean(user?.mustChangePassword) && pathname !== '/account/password';
  const roleDenied = Boolean(user && roles && !roles.includes(user.role));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (mustChange) {
      router.replace('/account/password');
    } else if (roleDenied) {
      router.replace(homeFor(user));
    }
  }, [loading, user, mustChange, roleDenied, pathname, router]);

  if (loading || !user || mustChange || roleDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
        <Activity className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }
  return <>{children}</>;
}
