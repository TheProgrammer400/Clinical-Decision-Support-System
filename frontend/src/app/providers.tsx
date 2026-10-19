'use client';

import React from 'react';
import { SessionProvider } from '@/lib/session';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
