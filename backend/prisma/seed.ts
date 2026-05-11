import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Admin user (separate Admin table)
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: 'admin@cofit.me' },
  });

  if (existingAdmin) {
    console.log('✓ Admin user already exists, skipping...');
  } else {
    const adminPasswordHash = await bcrypt.hash('password', 10);
    const admin = await prisma.admin.create({
      data: {
        id: crypto.randomUUID(),
        email: 'admin@cofit.me',
        password_hash: adminPasswordHash,
        display_name: '系統管理員',
        auth_provider: 'email',
        role: 'admin',
        timezone: 'Asia/Taipei',
      },
    });
    console.log('✓ Admin user created:', admin.email);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✓ Seed completed successfully');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('✗ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
