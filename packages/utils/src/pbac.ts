/**
 * PBAC (Pictorial Blood Loss Assessment Chart) 相關工具函式與常數
 */

/** 症狀清單 */
export const SYMPTOMS = ['腹痛', '腰痠', '頭痛', '胸脹', '疲勞', '噁心', '無']

/** 情緒清單 */
export const EMOTIONS = ['開心', '平靜', '低落', '焦慮', '易怒', '敏感']

/** 血液顏色定義 */
export const BLOOD_COLORS = [
  { id: 'blank', label: '水藍', hex: '#bad8ff', desc: '空瓶子' },
  { id: 'pink', label: '粉紅', hex: '#FF99BB', desc: '第1天典型' },
  { id: 'bright', label: '鮮紅', hex: '#E63946', desc: '第2–3天典型' },
  { id: 'dark', label: '深紅', hex: '#8B0000', desc: '第4–5天典型' },
  { id: 'brown', label: '咖啡褐', hex: '#5C3A2A', desc: '第6–7天典型' },
  { id: 'black', label: '黑褐', hex: '#2C1810', desc: '循環不良警訊' },
]

export const BlankBloodColor = BLOOD_COLORS.find((type)=>type.id === 'blank');

/** 血塊類型定義 */
export const CLOT_TYPES = [
  { id: 'none', label: '無血塊', warn: false, desc: '', score: 0 },
  { id: 'small', label: '碎果凍', warn: false, desc: '直徑 < 2cm，第1–2天正常', score: 1 },
  {
    id: 'large',
    label: '燒仙草/仙草凍',
    warn: true,
    desc: '直徑 > 3cm，或質地硬、肉塊狀 ⚠',
    score: 5,
  },
]

export const NoneClot = CLOT_TYPES.find((type)=>type.id === 'none');

/** PBAC 浸透程度定義 */
export const PBAC_LEVELS = [
  { id: 'light', name: '輕微', desc: '佔面積 1/3 以下', score: 1 },
  { id: 'medium', name: '中度', desc: '佔面積 1/2 至 2/3', score: 5 },
  { id: 'heavy', name: '重度', desc: '完全浸透', score: 20 },
]

/** 生理用品定義 */
export const PRODUCTS = [
  { id: 'pad', label: '衛生棉', icon: '/assets/icons/pad.png' },
  { id: 'tampon', label: '棉條', icon: '/assets/icons/tampon.png' },
  { id: 'cup', label: '月亮杯', icon: '/assets/icons/cup.png' },
] as const

/**
 * 計算單次紀錄的 PBAC (Pictorial Blood Loss Assessment Chart) 分數
 *
 * 根據 Higham 等人提出的計分方式，將生理用品的浸透程度與血塊大小轉換為數值分數：
 * - 浸透程度 (Level): light=1, medium=5, heavy=20
 * - 血塊 (Clot): small=1, large=5
 *
 * @param level - 生理用品的浸透程度 ('light' | 'medium' | 'heavy')
 * @param clot - 血塊類型 ID ('none' | 'small' | 'large')
 * @returns {number} 該筆紀錄的總分
 */
export const getScore = (level: string, clot: string | undefined): number => {
  let s = level === 'light' ? 1 : level === 'medium' ? 5 : 20
  if (clot) {
    const ct = CLOT_TYPES.find((c) => c.id === clot)
    s += ct?.score || 0
  }
  return s
}

/**
 * 檢查特定日期的日誌中是否包含任何實質的經期紀錄
 *
 * 此函式用於判定該日期在日曆或清單中是否應顯示「已記錄」的視覺提示。
 * 檢查項目包含：PBAC 明細、症狀、情緒、生理用品設定、血色及血塊。
 *
 * @param dayLog - 該日期的日誌物件
 * @returns {boolean} 若包含任何一項紀錄則回傳 true
 */
export const hasPeriodRecords = (dayLog: Record<string, unknown> | null | undefined): boolean => {
  if (!dayLog) return false
  const log = dayLog as {
    pbacLogs?: unknown[]
    symptoms?: unknown[]
    emotions?: unknown[]
    pbacProduct?: unknown
    bloodColor?: unknown
    clot?: unknown
  }
  return (
    (log.pbacLogs && log.pbacLogs.length > 0) ||
    (log.symptoms && log.symptoms.length > 0) ||
    (log.emotions && log.emotions.length > 0) ||
    !!log.pbacProduct ||
    !!log.bloodColor ||
    !!log.clot
  )
}
