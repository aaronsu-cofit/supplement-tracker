/**
 * Seed script: 女性保健小課程
 *
 * 將 women_healing_course template 塞入指定 product。
 * 用法：
 *   POSTGRES_URL=<url> tsx scripts/seedWomenHealingCourse.ts
 *   POSTGRES_URL=<url> PRODUCT_ID=<id> tsx scripts/seedWomenHealingCourse.ts
 *
 * 預設 PRODUCT_ID = cmotiblw200008iiqqgtbyqdp（女性經期 on staging）
 */

import { PrismaClient } from '@prisma/client';
import { SEED_TEMPLATES } from '../src/lib/seedTemplates.js';

const prisma = new PrismaClient();
const PRODUCT_ID = process.env.PRODUCT_ID ?? 'cmotiblw200008iiqqgtbyqdp';
const TEMPLATE_KEY = 'women_healing_course';

async function main() {
  const tpl = SEED_TEMPLATES[TEMPLATE_KEY];
  if (!tpl) throw new Error(`Template "${TEMPLATE_KEY}" not found`);

  const product = await prisma.product.findUnique({ where: { id: PRODUCT_ID } });
  if (!product) throw new Error(`Product not found: ${PRODUCT_ID}`);

  console.log(`\n🌸 Seeding "${tpl.name}" → product: ${product.name} (${PRODUCT_ID})\n`);

  const summary = {
    content:  { created: 0, skipped: 0 },
    badges:   { created: 0, skipped: 0 },
    journeys: { created: 0, skipped: 0 },
    intents:  { created: 0, skipped: 0 },
    errors:   [] as string[],
  };

  const tryCreate = async (
    label: string,
    section: 'content' | 'badges' | 'journeys' | 'intents',
    fn: () => Promise<unknown>
  ) => {
    try {
      await fn();
      summary[section].created++;
      console.log(`  ✓ ${label}`);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        summary[section].skipped++;
        console.log(`  — ${label} (already exists, skipped)`);
      } else {
        summary.errors.push(`${label}: ${err.message}`);
        console.error(`  ✗ ${label}: ${err.message}`);
      }
    }
  };

  // ── ContentItems ────────────────────────────────────────────────────────────
  console.log('📋 ContentItems:');
  for (const item of tpl.content) {
    await tryCreate(`content:${item.key}`, 'content', () =>
      prisma.contentItem.create({
        data: {
          product_id: PRODUCT_ID,
          key:        item.key,
          type:       item.type,
          title:      item.title ?? null,
          body:       item.body,
        },
      })
    );
  }

  // ── JourneyTemplates ────────────────────────────────────────────────────────
  console.log('\n🗺️  JourneyTemplates:');
  for (const journey of tpl.journeys) {
    await tryCreate(`journey:${journey.key}`, 'journeys', () =>
      prisma.journeyTemplate.create({
        data: {
          product_id:  PRODUCT_ID,
          key:         journey.key,
          name:        journey.name,
          description: journey.description ?? null,
          phases:      journey.phases      as any,
          transitions: journey.transitions as any,
          is_active:   true,
        },
      })
    );
  }

  // ── BadgeTemplates ──────────────────────────────────────────────────────────
  console.log('\n🏅 BadgeTemplates:');
  for (const badge of tpl.badges) {
    await tryCreate(`badge:${badge.key}`, 'badges', () =>
      prisma.badgeTemplate.create({
        data: {
          product_id:         PRODUCT_ID,
          key:                badge.key,
          name:               badge.name,
          description:        badge.description ?? null,
          icon:               badge.icon        ?? null,
          criteria:           badge.criteria    as any,
          notify_content_key: badge.notify_content_key ?? null,
          is_active:          true,
        },
      })
    );
  }

  // ── IntentRules ─────────────────────────────────────────────────────────────
  console.log('\n🎯 IntentRules:');
  for (const intent of tpl.intents) {
    await tryCreate(`intent:${intent.name}`, 'intents', () =>
      prisma.intentRule.create({
        data: {
          product_id:    PRODUCT_ID,
          name:          intent.name,
          priority:      intent.priority,
          match_type:    intent.match_type,
          patterns:      intent.patterns,
          action_type:   intent.action_type,
          action_config: intent.action_config as any,
          is_active:     true,
        },
      })
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────');
  console.log(`ContentItems    : created=${summary.content.created}  skipped=${summary.content.skipped}`);
  console.log(`BadgeTemplates  : created=${summary.badges.created}  skipped=${summary.badges.skipped}`);
  console.log(`JourneyTemplates: created=${summary.journeys.created}  skipped=${summary.journeys.skipped}`);
  console.log(`IntentRules     : created=${summary.intents.created}  skipped=${summary.intents.skipped}`);
  if (summary.errors.length) {
    console.error('\nErrors:');
    summary.errors.forEach(e => console.error('  ✗', e));
    process.exit(1);
  } else {
    console.log('\n✅ Done.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
