import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CDSS Database...');

  // Create default Organization
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'General Hospital Health Network',
    },
  });

  const salt = await bcrypt.genSalt(10);

  // Seed Super Admin
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', salt);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cdss.med' },
    update: {},
    create: {
      email: 'admin@cdss.med',
      passwordHash: adminPasswordHash,
      fullName: 'Dr. Sarah Connor (Chief Medical Informatics Officer)',
      role: Role.SUPER_ADMIN,
      organizationId: org.id,
    },
  });

  // Seed Doctor
  const doctorPasswordHash = await bcrypt.hash('DoctorPass123!', salt);
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor.smith@cdss.med' },
    update: {},
    create: {
      email: 'doctor.smith@cdss.med',
      passwordHash: doctorPasswordHash,
      fullName: 'Dr. Alex Smith, MD',
      role: Role.DOCTOR,
      organizationId: org.id,
    },
  });

  console.log(`Seeding complete: Org='${org.name}', Admin='${admin.email}', Doctor='${doctor.email}'`);
}

main()
  .catch((e) => {
    console.error('Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
