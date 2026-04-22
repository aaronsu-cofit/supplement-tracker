import { db } from './db.js';

/**
 * Build a Flex message showing a user's pending missions for a product
 * as a tap-to-complete checklist. Returns null if the product has no
 * missions at all, a celebration card if the user has zero pending,
 * and a bubble with up to 10 rows otherwise.
 *
 * Each row is a <text> (mission name, with progress for multi-step) +
 * a <button> whose postback data includes `reply_checklist=1` so
 * completing via the button pushes a fresh checklist back.
 */
export const MAX_CHECKLIST_ROWS = 10;

export async function buildMissionChecklist(
  productId: string,
  userId: string,
): Promise<import('@line/bot-sdk').Message | null> {
  const assignments = await db().missionAssignment.findMany({
    where: { user_id: userId, status: 'pending' },
    orderBy: { assigned_at: 'asc' },
    include: {
      template: {
        select: { id: true, key: true, name: true, product_id: true, is_active: true },
      },
    },
  });
  // Narrow to missions in this specific product (user may belong to multiple)
  const pending = assignments.filter(a => a.template.product_id === productId && a.template.is_active);

  if (pending.length === 0) {
    // "All done" card
    return {
      type: 'flex',
      altText: '沒有進行中的任務',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '🎉 全部完成', weight: 'bold', size: 'xl', color: '#1DB446' },
            { type: 'text', text: '目前沒有進行中的任務，給自己拍拍手！', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
          ],
        },
      },
    };
  }

  const rows = pending.slice(0, MAX_CHECKLIST_ROWS);
  const overflow = pending.length - rows.length;

  const contents: Array<Record<string, unknown>> = [
    { type: 'text', text: '你的任務清單', weight: 'bold', size: 'lg' },
    {
      type: 'text',
      text: `${pending.length} 項待完成${overflow > 0 ? `（顯示前 ${rows.length} 項）` : ''}`,
      size: 'xs', color: '#aaaaaa', margin: 'xs',
    },
    { type: 'separator', margin: 'md' },
  ];

  for (const a of rows) {
    const progress =
      a.progress_target > 1 ? ` (${a.progress_current}/${a.progress_target})` : '';
    // Multi-step: use increment_mission so each tap advances by 1 until target
    const act = a.progress_target > 1 ? 'increment_mission' : 'complete_mission';
    contents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: `☐  ${a.template.name}${progress}`,
          size: 'sm',
          color: '#444444',
          flex: 5,
          gravity: 'center',
          wrap: true,
        },
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          flex: 3,
          action: {
            type: 'postback',
            label: a.progress_target > 1 ? '+1' : '✓ 完成',
            data: `act=${act}&key=${encodeURIComponent(a.template.key)}&reply_checklist=1`,
            displayText: `${a.progress_target > 1 ? '進度 +1：' : '完成：'}${a.template.name}`,
          },
        },
      ],
    });
  }

  return {
    type: 'flex',
    altText: `任務清單（${pending.length} 項待完成）`,
    contents: {
      type: 'bubble',
      body: { type: 'box', layout: 'vertical', contents: contents as never },
    },
  };
}
