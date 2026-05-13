import { UserData } from '../types'
import { getCycleData } from '../api/client'
import { handleLiffLogin } from '@vitera/client-auth'
import { MESSAGES } from './messages'

// Import LIFF SDK
declare global {
  interface Window {
    liff?: any
  }
}

/**
 * 初始化應用後的共享邏輯
 * 根據用戶是否有週期數據來決定顯示主頁面或入門頁面
 * @param data - 從後端獲取的用戶週期數據
 * @param setUserData - 更新用戶數據的回調函數
 * @param setView - 切換應用視圖的回調函數
 * @param setTutorialStep - 設置教學步驟的回調函數
 */
const _initializeUserAfterAuth = async (
  data: any,
  setUserData: (data: UserData) => void,
  setView: (view: 'login' | 'onboarding' | 'main') => void,
  setTutorialStep: (step: number) => void
) => {
  // 如果後端返回的數據表示用戶有週期數據且有基準日期，就進入主頁面
  // 否則進入入門頁面（例如首次使用或清除了所有經期記錄）
  if (data && data.hasData && data.lastPeriodStart) {
    setUserData(data)
    setView('main')
    if (!localStorage.getItem('tutorial_done')) {
      setTutorialStep(1)
    }
  } else {
    // 若 lastPeriodStart 為 null/undefined，仍然設置用戶數據（為後續標記做準備）
    if (data && data.dayData) {
      setUserData(data)
    }
    setView('onboarding')
  }
}

/**
 * 初始化應用並檢查用戶認證及教學狀態
 * 如果用戶未認證則導向登入頁面
 * 如果已認證則獲取週期數據並初始化應用狀態
 * @param setUserData - 更新用戶數據的回調函數
 * @param setView - 切換應用視圖的回調函數
 * @param setTutorialStep - 設置教學步驟的回調函數
 */
export const initializeAppData = async (
  setUserData: (data: UserData) => void,
  setView: (view: 'login' | 'onboarding' | 'main') => void,
  setTutorialStep: (step: number) => void
) => {
  try {
    const data = await getCycleData()
    await _initializeUserAfterAuth(data, setUserData, setView, setTutorialStep)
  } catch (error) {
    console.error('Init failed', error)
    setView('login')
  }
}

/**
 * 處理 LINE 登入成功後的初始化
 * 從 LIFF SDK 取得用戶信息，初始化應用狀態
 * @param _token - LINE 授權伺服器返回的授權令牌（現已不使用）
 * @param setUserData - 更新用戶數據的回調函數
 * @param setView - 切換應用視圖的回調函數
 * @param setTutorialStep - 設置教學步驟的回調函數
 * @param onError - 錯誤處理的回調函數
 */
export const handleLineLoginSuccess = async (
  _token: string,
  setUserData: (data: UserData) => void,
  setView: (view: 'login' | 'onboarding' | 'main') => void,
  setTutorialStep: (step: number) => void,
  onError: (msg: string) => void
) => {
  try {
    // 從 LIFF 取得用戶信息並登入後端
    await handleLiffLogin()

    // 獲取周期數據並初始化應用
    const data = await getCycleData()
    await _initializeUserAfterAuth(data, setUserData, setView, setTutorialStep)
  } catch (error) {
    console.error('LINE Login failed:', error)
    onError(MESSAGES.AUTH.LOGIN_FAILED)
    setView('login')
  }
}
