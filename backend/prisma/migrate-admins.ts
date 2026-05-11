import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 將現有的 admin/superadmin 用戶從 User 表遷移到 Admin 表
 *
 * 使用方式：
 *
 * 本地開發 DB（使用 .env）：
 *   pnpm db:migrate-admins
 *   或
 *   pnpm db:migrate-admins .env
 *
 * Staging DB（使用 .env.staging）：
 *   pnpm db:migrate-admins .env.staging
 *
 * Production DB（使用 .env.prod）：
 *   pnpm db:migrate-admins .env.prod
 */

function loadEnvFile(envPath: string) {
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️  .env 檔案不存在: ${envPath}`);
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function migrateAdmins(envFile: string = '.env') {
  // Resolve path to .env file
  let envFilePath: string;
  if (envFile.startsWith('/')) {
    envFilePath = envFile;
  } else {
    envFilePath = path.join(process.cwd(), envFile);
  }

  console.log(`📖 Loading environment from: ${envFilePath}`);
  loadEnvFile(envFilePath);

  // Get database URL from environment
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ POSTGRES_URL 未設定');
    process.exit(1);
  }

  // Create a temporary Prisma client with the specified database URL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  console.log(`\n📦 Starting admin user migration from User to Admin table...\n`);

  try {
    // 1. Find all admin/superadmin users in User table
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'superadmin'],
        },
        deleted_at: null, // Only non-deleted users
      },
    });

    if (adminUsers.length === 0) {
      console.log('✓ No admin users to migrate');
      return;
    }

    console.log(`Found ${adminUsers.length} admin user(s) to migrate\n`);

    // 2. Migrate each admin user to Admin table
    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of adminUsers) {
      // Check if admin already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: user.email },
      });

      if (existingAdmin) {
        console.log(`⊘ Admin already exists: ${user.email}, skipping...`);
        skippedCount++;
        continue;
      }

      // Create admin in Admin table
      try {
        await prisma.admin.create({
          data: {
            id: user.id,
            email: user.email,
            password_hash: user.password_hash!,
            display_name: user.display_name,
            picture_url: user.picture_url,
            auth_provider: user.auth_provider,
            role: user.role as 'admin' | 'superadmin',
            timezone: user.timezone,
            created_at: user.created_at,
          },
        });
        console.log(`✓ Migrated: ${user.email} (${user.role})`);
        migratedCount++;
      } catch (error) {
        console.error(`✗ Failed to migrate ${user.email}:`, error);
      }
    }

    // 3. Summary
    console.log('\n📊 Migration Summary:');
    console.log(`  ✓ Migrated: ${migratedCount}`);
    console.log(`  ⊘ Skipped: ${skippedCount}`);
    console.log(`  Total: ${adminUsers.length}`);

    if (migratedCount > 0) {
      console.log('\n⚠️  Next steps:');
      console.log('  1. Verify admin users in Admin table');
      console.log('  2. Optionally remove migrated users from User table:');
      console.log(`     DELETE FROM users WHERE id IN (${adminUsers.map(u => `'${u.id}'`).join(', ')})`);
      console.log('     OR mark them as deleted:');
      console.log(`     UPDATE users SET deleted_at = NOW() WHERE id IN (${adminUsers.map(u => `'${u.id}'`).join(', ')})`);
    }
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get .env file from command line argument (default: .env)
const envFile = process.argv[2] || '.env';
migrateAdmins(envFile).then(() => {
  console.log('\n✓ Migration completed');
  process.exit(0);
});
