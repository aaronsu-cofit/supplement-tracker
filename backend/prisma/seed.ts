import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@cofit.me' },
  });

  if (existingAdmin) {
    console.log('✓ Admin user already exists, skipping...');
    return;
  }

  // Hash the password
  const passwordHash = await bcrypt.hash('password', 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'admin@cofit.me',
      password_hash: passwordHash,
      display_name: 'Admin',
      auth_provider: 'email',
      role: 'admin',
      timezone: 'Asia/Taipei',
    },
  });

  console.log('✓ Admin user created:', adminUser.email);
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
