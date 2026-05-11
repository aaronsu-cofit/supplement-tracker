import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 將 Staging DB 的數據遷移到本地 Dev DB
 *
 * 使用方式：
 *
 * 使用 .env.staging.local（預設）：
 *   pnpm db:migrate-staging-to-local
 *
 * 指定其他 .env 文件：
 *   pnpm db:migrate-staging-to-local .env.staging
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

async function migrateData(stagingEnvFile: string = '.env.staging.local') {
  // 解析 staging env 文件路徑
  let stagingEnvFilePath: string;
  if (stagingEnvFile.startsWith('/')) {
    stagingEnvFilePath = stagingEnvFile;
  } else {
    stagingEnvFilePath = path.join(process.cwd(), stagingEnvFile);
  }

  console.log(`📖 Loading staging environment from: ${stagingEnvFilePath}`);
  loadEnvFile(stagingEnvFilePath);

  const stagingDatabaseUrl = process.env.POSTGRES_URL;
  if (!stagingDatabaseUrl) {
    console.error('❌ Staging DB POSTGRES_URL 未設定');
    console.error(`   請確認 ${stagingEnvFilePath} 中包含 POSTGRES_URL`);
    process.exit(1);
  }

  // 連接 staging DB
  const stagingPrisma = new PrismaClient({
    datasources: {
      db: {
        url: stagingDatabaseUrl,
      },
    },
  });

  // 連接本地 DB（使用預設的 .env）
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.LOCAL_POSTGRES_URL || 'postgresql://vitera_user:vitera_pass@localhost:5434/vitera_dev',
      },
    },
  });

  console.log('\n📦 Starting data migration from Staging to Local...\n');

  try {
    // 1. 遷移用戶（沒有外鍵依賴）
    const users = await stagingPrisma.user.findMany();
    console.log(`Found ${users.length} users in staging DB`);

    if (users.length > 0) {
      await localPrisma.user.deleteMany();
      console.log('✓ Cleared local users table');

      for (const user of users) {
        await localPrisma.user.create({
          data: user,
        });
      }
      console.log(`✓ Migrated ${users.length} users to local DB`);
    }

    // 2. 嘗試遷移 Admin（如果存在）
    try {
      const admins = await stagingPrisma.admin.findMany();
      console.log(`Found ${admins.length} admins in staging DB`);

      if (admins.length > 0) {
        await localPrisma.admin.deleteMany();
        console.log('✓ Cleared local admins table');

        for (const admin of admins) {
          await localPrisma.admin.create({
            data: admin,
          });
        }
        console.log(`✓ Migrated ${admins.length} admins to local DB`);
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⊘ Admin table does not exist in staging DB (skipping)');
      } else {
        throw error;
      }
    }

    // 3. 遷移 Product 表（沒有外鍵依賴）
    try {
      const products = await stagingPrisma.product.findMany();
      console.log(`Found ${products.length} products in staging DB`);

      if (products.length > 0) {
        await localPrisma.product.deleteMany();
        console.log('✓ Cleared local products table');

        for (const product of products) {
          await localPrisma.product.create({
            data: product,
          });
        }
        console.log(`✓ Migrated ${products.length} products to local DB`);
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⊘ Product table does not exist in staging DB (skipping)');
      } else {
        throw error;
      }
    }

    // 4. 遷移 LineOA 表（依賴 Product）
    try {
      const lineOas = await stagingPrisma.lineOA.findMany();
      console.log(`Found ${lineOas.length} LINE OAs in staging DB`);

      if (lineOas.length > 0) {
        await localPrisma.lineOA.deleteMany();
        console.log('✓ Cleared local LINE OAs table');

        for (const oa of lineOas) {
          await localPrisma.lineOA.create({
            data: oa,
          });
        }
        console.log(`✓ Migrated ${lineOas.length} LINE OAs to local DB`);
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⊘ LineOA table does not exist in staging DB (skipping)');
      } else {
        console.warn('⚠️  Warning: LineOA migration had issues:', (error as any).message);
      }
    }

    console.log('\n✅ Data migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', (error as any).message || error);
    process.exit(1);
  } finally {
    await stagingPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

// 從命令行參數讀取 staging env 文件（預設：.env.staging.local）
const stagingEnvFile = process.argv[2] || '.env.staging.local';
migrateData(stagingEnvFile).then(() => {
  console.log('✓ Migration completed');
  process.exit(0);
});
