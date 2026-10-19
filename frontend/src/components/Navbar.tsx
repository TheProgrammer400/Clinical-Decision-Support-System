'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, LogOut } from 'lucide-react';
import { homeFor, useSession } from '@/lib/session';

/** Minimal top bar for standalone pages (account pages). Section layouts render their own navigation. */
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useSession();

  if (!pathname.startsWith('/account')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link href={user ? homeFor(user) : '/'} className="flex items-center gap-2 text-on-surface font-bold">
          <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          CDSS
        </Link>
        {user && (
          <button
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-error"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
