export const WOUND_TYPES = [
  { code: 'surgical', label: '手術傷口', emoji: '🏥', careNote: '注意拆線時間與防水' },
  { code: 'pressure', label: '壓瘡', emoji: '🛏️', careNote: '翻身頻率與減壓墊' },
  { code: 'burn', label: '燒燙傷', emoji: '🔥', careNote: '降溫處理與除疤' },
  { code: 'diabetic', label: '糖尿病足', emoji: '🦶', careNote: '血糖控制與足部護理' },
  { code: 'laceration', label: '撕裂傷', emoji: '🩹', careNote: '止血與縫合追蹤' },
  { code: 'other', label: '其他', emoji: '📋', careNote: '一般照護' },
];

export const BODY_LOCATIONS = [
  { code: 'head', label: '頭部', emoji: '🧠' },
  { code: 'chest', label: '胸腹', emoji: '🫁' },
  { code: 'left_arm', label: '左上肢', emoji: '💪' },
  { code: 'right_arm', label: '右上肢', emoji: '💪' },
  { code: 'left_leg', label: '左下肢', emoji: '🦵' },
  { code: 'right_leg', label: '右下肢', emoji: '🦵' },
  { code: 'back', label: '背部', emoji: '🔙' },
  { code: 'other', label: '其他 (自行輸入)', emoji: '📍' },
];

export function getWoundType(code) {
  return WOUND_TYPES.find(t => t.code === code) || WOUND_TYPES.find(t => t.code === 'other');
}

export function getBodyLocation(code) {
  const loc = BODY_LOCATIONS.find(l => l.code === code);
  if (loc) return loc;
  if (code) return { code, label: code, emoji: '📍' };
  return null;
}
