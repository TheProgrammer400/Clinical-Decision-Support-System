/**
 * Development seed. Creates a demo organization, a super admin and a doctor.
 *
 * - Refuses to run when NODE_ENV=production.
 * - Passwords come from SEED_ADMIN_PASSWORD / SEED_DOCTOR_PASSWORD, or are generated
 *   randomly and printed once. No password is stored in source code.
 * - Seeded accounts must change their password at first sign-in.
 * - Existing accounts are never modified.
 *
 * Run with: npm run prisma:seed
 */
import { AccountStatus, PrismaClient, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword, PASSWORD_MIN_LENGTH } from '../modules/auth/passwords';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

function passwordFromEnv(name: string): { value: string; generated: boolean } {
  const fromEnv = process.env[name];
  if (fromEnv) {
    if (fromEnv.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`${name} must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    return { value: fromEnv, generated: false };
  }
  return { value: randomBytes(18).toString('base64url'), generated: true };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo accounts with NODE_ENV=production.');
  }

  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.upsert({
      where: { id: DEMO_ORG_ID },
      update: {},
      create: { id: DEMO_ORG_ID, name: 'Demo Health Network (development)' },
    });

    const accounts = [
      { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@cdss.local', fullName: 'Demo Super Admin', role: Role.SUPER_ADMIN, pw: passwordFromEnv('SEED_ADMIN_PASSWORD') },
      { email: process.env.SEED_DOCTOR_EMAIL ?? 'doctor@cdss.local', fullName: 'Demo Doctor', role: Role.DOCTOR, pw: passwordFromEnv('SEED_DOCTOR_PASSWORD') },
    ];

    for (const account of accounts) {
      const existing = await prisma.user.findUnique({ where: { email: account.email } });
      if (existing) {
        console.log(`[seed] ${account.email} already exists; left unchanged.`);
        continue;
      }
      await prisma.user.create({
        data: {
          email: account.email,
          fullName: account.fullName,
          role: account.role,
          organizationId: org.id,
          accountStatus: AccountStatus.APPROVED,
          passwordHash: await hashPassword(account.pw.value),
          mustChangePassword: true,
        },
      });
      const shown = account.pw.generated ? account.pw.value : '(from environment)';
      console.log(`[seed] created ${account.role} ${account.email} password: ${shown} (must be changed at first sign-in)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[seed] failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
