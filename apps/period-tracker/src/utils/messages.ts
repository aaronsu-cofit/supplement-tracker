/**
 * 應用中所有用戶界面文案的集中管理
 * 便於統一管理、翻譯和修改
 */

export const MESSAGES = {
  PERIOD: {
    /** 清除整個經期紀錄的反饋訊息 */
    CLEAR_ENTIRE_CYCLE: '已清除整個經期紀錄',
    /** 清除本日及之後紀錄的反饋訊息 */
    CLEAR_FOLLOWING: '已清除本日及之後紀錄',
    /** 自動標記天數的反饋訊息（使用佔位符 {days}） */
    MARKED_DAYS: (days: number) => `已標記 ${days} 天經期`,
  },
  DAILY_LOG: {
    /** 日誌保存成功 */
    SAVED: '已儲存',
    /** 日誌保存失敗 */
    SAVE_FAILED: '儲存失敗',
  },
  PBAC: {
    /** PBAC 記錄成功 */
    LOGGED: '已記錄',
    /** PBAC 記錄同步失敗 */
    SYNC_FAILED: '同步失敗',
  },
  SYNC: {
    /** 週期變更同步失敗 */
    PERIOD_SYNC_FAILED: '同步失敗',
  },
  AUTH: {
    /** LINE 登入認證失敗 */
    LOGIN_FAILED: '登入認證失敗',
  },
}
