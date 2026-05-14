/**
 * Luna 14-Day Sleep Course — Seed Script
 *
 * Creates:
 *   - Product: "Cofit Luna"
 *   - 2 MissionTemplates: daily sleep habit + morning check-in
 *   - 4 Scenarios (one per sleep type): 壓力型 / 夜貓型 / 代謝失衡型 / 荷爾蒙波動型
 *
 * Run:
 *   cd backend && npx tsx scripts/seed-luna.ts
 *
 * Re-runnable: uses upsert/skipDuplicates throughout.
 *
 * Content keys follow the pattern:
 *   luna_{type}_day{N}_{slot}
 *   type: stress | nightowl | metabolic | hormonal
 *   slot: welcome | task | sleep | morning | day7 | day14
 *
 * Fill these ContentItems via HQ → Products → Cofit Luna → 內容庫.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix: string, idx: number | string): string {
  return `${prefix}-${idx}`;
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

function buildScenarioFlow(
  typeKey: string,   // stress | nightowl | metabolic | hormonal
): { flow_nodes: FlowNode[]; flow_edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const push = (
    dayId: string,
    nodeId: string,
    slot: 'morning' | 'evening' | 'bedtime',
    contentKey: string,
    colIdx: number,
    rowIdx: number,
  ) => {
    nodes.push({
      id: nodeId,
      type: 'push-message-node',
      position: { x: 320 + colIdx * 260, y: 80 + rowIdx * 240 },
      data: { type: 'text', timeSlot: slot, contentKey },
    });
    edges.push({ id: `${dayId}-${nodeId}`, source: dayId, target: nodeId });
  };

  const assign = (
    dayId: string,
    nodeId: string,
    missionKey: string,
    colIdx: number,
    rowIdx: number,
  ) => {
    nodes.push({
      id: nodeId,
      type: 'mission-assign-node',
      position: { x: 320 + colIdx * 260, y: 80 + rowIdx * 240 },
      data: { missionKey },
    });
    edges.push({ id: `${dayId}-${nodeId}`, source: dayId, target: nodeId });
  };

  const streak = (
    dayId: string,
    nodeId: string,
    streakKey: string,
    colIdx: number,
    rowIdx: number,
  ) => {
    nodes.push({
      id: nodeId,
      type: 'streak-increment-node',
      position: { x: 320 + colIdx * 260, y: 80 + rowIdx * 240 },
      data: { streakKey },
    });
    edges.push({ id: `${dayId}-${nodeId}`, source: dayId, target: nodeId });
  };

  // ── Day 0: Welcome ─────────────────────────────────────────────────────────
  const d0 = uid('day', 0);
  nodes.push({
    id: d0, type: 'day-node',
    position: { x: 80, y: 80 },
    data: { day: 0, label: 'Day 0 — 歡迎' },
  });
  push(d0, uid(`${typeKey}-welcome`, 'push'), 'evening', `luna_${typeKey}_day0_welcome`, 0, 0);

  // ── Day 1–6: Daily routine ─────────────────────────────────────────────────
  for (let n = 1; n <= 6; n++) {
    const rowIdx = n;
    const dId = uid('day', n);
    nodes.push({
      id: dId, type: 'day-node',
      position: { x: 80, y: 80 + rowIdx * 240 },
      data: { day: n, label: `Day ${n}` },
    });
    push(dId, uid(`${typeKey}-d${n}`, 'eve'),  'evening', `luna_${typeKey}_day${n}_task`,    0, rowIdx);
    push(dId, uid(`${typeKey}-d${n}`, 'bed'),  'bedtime', `luna_${typeKey}_day${n}_sleep`,   1, rowIdx);
    push(dId, uid(`${typeKey}-d${n}`, 'morn'), 'morning', `luna_${typeKey}_day${n}_morning`, 2, rowIdx);
    assign(dId, uid(`${typeKey}-d${n}`, 'miss'), 'luna_daily_habit', 3, rowIdx);
    streak(dId, uid(`${typeKey}-d${n}`, 'str'),  'luna_streak',       4, rowIdx);
  }

  // ── Day 7: Mid-course review ───────────────────────────────────────────────
  const d7 = uid('day', 7);
  nodes.push({
    id: d7, type: 'day-node',
    position: { x: 80, y: 80 + 7 * 240 },
    data: { day: 7, label: 'Day 7 — 中期評估' },
  });
  push(d7, uid(`${typeKey}-d7`, 'eve'),    'evening', `luna_${typeKey}_day7_task`,    0, 7);
  push(d7, uid(`${typeKey}-d7`, 'bed'),    'bedtime', `luna_${typeKey}_day7_sleep`,   1, 7);
  push(d7, uid(`${typeKey}-d7`, 'morn'),   'morning', `luna_${typeKey}_day7_morning`, 2, 7);
  push(d7, uid(`${typeKey}-d7`, 'review'), 'evening', `luna_${typeKey}_day7_review`,  3, 7);
  assign(d7, uid(`${typeKey}-d7`, 'miss'), 'luna_daily_habit', 4, 7);
  streak(d7, uid(`${typeKey}-d7`, 'str'),  'luna_streak',       5, 7);

  // ── Day 8–13: Daily routine (continued) ───────────────────────────────────
  for (let n = 8; n <= 13; n++) {
    const rowIdx = n;
    const dId = uid('day', n);
    nodes.push({
      id: dId, type: 'day-node',
      position: { x: 80, y: 80 + rowIdx * 240 },
      data: { day: n, label: `Day ${n}` },
    });
    push(dId, uid(`${typeKey}-d${n}`, 'eve'),  'evening', `luna_${typeKey}_day${n}_task`,    0, rowIdx);
    push(dId, uid(`${typeKey}-d${n}`, 'bed'),  'bedtime', `luna_${typeKey}_day${n}_sleep`,   1, rowIdx);
    push(dId, uid(`${typeKey}-d${n}`, 'morn'), 'morning', `luna_${typeKey}_day${n}_morning`, 2, rowIdx);
    assign(dId, uid(`${typeKey}-d${n}`, 'miss'), 'luna_daily_habit', 3, rowIdx);
    streak(dId, uid(`${typeKey}-d${n}`, 'str'),  'luna_streak',       4, rowIdx);
  }

  // ── Day 14: Completion ─────────────────────────────────────────────────────
  const d14 = uid('day', 14);
  nodes.push({
    id: d14, type: 'day-node',
    position: { x: 80, y: 80 + 14 * 240 },
    data: { day: 14, label: 'Day 14 — 完課' },
  });
  push(d14, uid(`${typeKey}-d14`, 'eve'),      'evening', `luna_${typeKey}_day14_task`,       0, 14);
  push(d14, uid(`${typeKey}-d14`, 'bed'),      'bedtime', `luna_${typeKey}_day14_sleep`,      1, 14);
  push(d14, uid(`${typeKey}-d14`, 'complete'), 'evening', `luna_${typeKey}_day14_complete`,   2, 14);
  streak(d14, uid(`${typeKey}-d14`, 'str'), 'luna_streak', 3, 14);

  return { flow_nodes: nodes, flow_edges: edges };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌙 Seeding Luna 14-Day Sleep Course...\n');

  // 1. Product
  const product = await prisma.product.upsert({
    where: { id: 'luna' },
    update: { name: 'Cofit Luna', description: '14天睡眠優化課程', is_active: true },
    create: { id: 'luna', name: 'Cofit Luna', description: '14天睡眠優化課程', is_active: true },
  });
  console.log(`✓ Product: ${product.name} (${product.id})`);

  // 2. Mission templates
  const missions = [
    {
      key: 'luna_daily_habit',
      name: '今日睡眠習慣',
      description: '完成今日的睡眠習慣任務（主任務 + 睡前例行）',
      progress_target: 1,
    },
    {
      key: 'luna_morning_report',
      name: '晨起睡眠回報',
      description: '早起填寫昨晚睡眠品質快速問卷',
      progress_target: 1,
    },
  ];

  for (const m of missions) {
    await prisma.missionTemplate.upsert({
      where: { product_id_key: { product_id: product.id, key: m.key } },
      update: { name: m.name, description: m.description, is_active: true },
      create: {
        product_id: product.id,
        key: m.key,
        name: m.name,
        description: m.description,
        progress_target: m.progress_target,
        is_active: true,
        on_complete_actions: [],
      },
    });
    console.log(`  ✓ Mission: ${m.key}`);
  }

  // 3. Scenarios — one per sleep type
  const sleepTypes = [
    { key: 'stress',    name: '壓力型 — 14天睡眠課程',        typeName: '壓力型' },
    { key: 'nightowl',  name: '夜貓型 — 14天睡眠課程',        typeName: '夜貓型' },
    { key: 'metabolic', name: '代謝失衡型 — 14天睡眠課程',    typeName: '代謝失衡型' },
    { key: 'hormonal',  name: '荷爾蒙波動型 — 14天睡眠課程',  typeName: '荷爾蒙波動型' },
  ];

  // Find the first LineOA that has product_id=luna (or any active OA to bind later)
  const existingOA = await prisma.lineOA.findFirst({ where: { product_id: product.id } });

  for (const st of sleepTypes) {
    const { flow_nodes, flow_edges } = buildScenarioFlow(st.key);

    // Check if a scenario with this name already exists for the Luna OA
    const existing = existingOA
      ? await prisma.coBlocksScenario.findFirst({ where: { oa_id: existingOA.id, name: st.name } })
      : null;

    if (existing) {
      await prisma.coBlocksScenario.update({
        where: { id: existing.id },
        data: {
          flow_nodes: flow_nodes as object[],
          flow_edges: flow_edges as object[],
        },
      });
      console.log(`  ↺ Scenario updated: ${st.name} (${existing.id})`);
    } else if (existingOA) {
      const created = await prisma.coBlocksScenario.create({
        data: {
          oa_id: existingOA.id,
          name: st.name,
          is_active: false,
          flow_nodes: flow_nodes as object[],
          flow_edges: flow_edges as object[],
        },
      });
      console.log(`  ✓ Scenario created: ${st.name} (${created.id})`);
    } else {
      // No OA yet — save as JSON file for later import
      const fs = await import('fs/promises');
      const out = { name: st.name, flow_nodes, flow_edges };
      await fs.writeFile(
        `scripts/luna-scenario-${st.key}.json`,
        JSON.stringify(out, null, 2),
      );
      console.log(`  📄 No OA found — saved to scripts/luna-scenario-${st.key}.json`);
    }
  }

  console.log(`
✅ Luna seed complete!

Next steps:
  1. In HQ → LINE OA，建立或選擇 Luna 的 OA，並在「設定」頁面綁定 product = Cofit Luna
  2. 若上方顯示「saved to .json」，建立 OA 後重新執行此 seed 即可匯入劇本
  3. HQ → Products → Cofit Luna → 內容庫，新增 ContentItem：
       luna_{type}_day{N}_{slot}  （共 ${4 * (3 * 13 + 2 + 4 + 2)} 個 key）
  4. 確認訊息內容後，到劇本頁面將 is_active 設為 true
  5. 設定外部 cron，每天三次呼叫：
       POST /api/scheduler/run?time_slot=morning  （07:00）
       POST /api/scheduler/run?time_slot=evening  （21:00）
       POST /api/scheduler/run?time_slot=bedtime  （22:30）
`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
