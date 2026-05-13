/**
 * PBAC 狀態配置類型和工具函數
 */

export interface PbacStatusConfig {
  primaryColor: string
  numberColor: string
  textColor: string
  backgroundColor: string
  message: string
  showStatus: boolean
}

/**
 * 根據經血量分數和週期天數計算 PBAC 狀態配置
 *
 * 分級標準：
 * - >= 100: 紅色警告 (失血量可能超過 80ml)
 * - >= 60: 橙色警告 (接近警戒線)
 * - >= 21: 綠色正常 (正常範圍)
 * - > 0 且天數 >= 3: 紫色警告 (經血量過少)
 * - = 0: 灰色無狀態
 */
export function getPbacStatusConfig(pbacTotal: number, cycleDay: number): PbacStatusConfig {
  if (pbacTotal === 0) {
    return {
      primaryColor: '#D1D5DB',
      numberColor: '#9CA3AF',
      textColor: '#6B7280',
      backgroundColor: '#F9FAFB',
      message: '',
      showStatus: false,
    }
  } else if (pbacTotal >= 100) {
    return {
      primaryColor: '#E24B4A',
      numberColor: '#A32D2D',
      textColor: '#791F1F',
      backgroundColor: '#FCEBEB',
      message: '失血量可能超過 80ml，建議諮詢婦科醫師',
      showStatus: true,
    }
  } else if (pbacTotal >= 60) {
    return {
      primaryColor: '#EF9F27',
      numberColor: '#854F0B',
      textColor: '#633806',
      backgroundColor: '#FAEEDA',
      message: '接近警戒線，持續觀察剩餘天數',
      showStatus: true,
    }
  } else if (pbacTotal >= 21) {
    return {
      primaryColor: '#639922',
      numberColor: '#3B6D11',
      textColor: '#27500A',
      backgroundColor: '#EAF3DE',
      message: '出血量目前在正常範圍內',
      showStatus: true,
    }
  } else if (pbacTotal > 0 && cycleDay >= 3) {
    return {
      primaryColor: '#7C3AED',
      numberColor: '#5B21B6',
      textColor: '#3F0F5C',
      backgroundColor: '#F3E8FF',
      message: '經血量過少，建議持續觀察或諮詢婦科醫師',
      showStatus: true,
    }
  } else {
    // pbacTotal > 0 但 cycleDay < 3
    return {
      primaryColor: '#639922',
      numberColor: '#3B6D11',
      textColor: '#27500A',
      backgroundColor: '#EAF3DE',
      message: '',
      showStatus: false,
    }
  }
}
