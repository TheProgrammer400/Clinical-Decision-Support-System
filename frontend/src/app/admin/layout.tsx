'use client';

import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-h-[calc(100vh-4rem)] bg-slate-950">
      <AdminSidebar />
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
