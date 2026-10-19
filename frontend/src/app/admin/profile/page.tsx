'use client';

import React from 'react';
import Link from 'next/link';
import { UserCheck } from 'lucide-react';
import { Card, PageHeader } from '@/components/admin/ui';
import { useSession } from '@/lib/session';

export default function AdminProfilePage() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <div className="space-y-6 pb-12 max-w-2xl">
      <PageHeader icon={<UserCheck className="h-6 w-6 text-primary" />} title="Your account" description="Signed-in administrator." />
      <Card>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between"><dt className="text-on-surface-variant">Name</dt><dd>{user.fullName}</dd></div>
          <div className="flex justify-between"><dt className="text-on-surface-variant">Email</dt><dd className="font-mono">{user.email}</dd></div>
          <div className="flex justify-between"><dt className="text-on-surface-variant">Role</dt><dd>{user.role}</dd></div>
          <div className="flex justify-between"><dt className="text-on-surface-variant">Two-step verification</dt><dd>{user.mfaEnabled ? 'Enabled' : 'Not enabled'}</dd></div>
        </dl>
        <div className="flex gap-4 text-xs pt-2">
          <Link href="/account/security" className="text-primary hover:underline">Manage two-step verification</Link>
          <Link href="/account/password" className="text-primary hover:underline">Change password</Link>
        </div>
      </Card>
    </div>
  );
}
