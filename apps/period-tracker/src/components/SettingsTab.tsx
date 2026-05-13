import React from 'react'
import { UserData } from '../types'

interface SettingsTabProps {
  userData: UserData
  onUpdateUserData: (data: UserData) => void
  onSave: () => void
  onBack: () => void
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  userData,
  onUpdateUserData,
  onSave,
  onBack,
}) => {
  return (
    <div className="settings-container">
      {/* Sub-header matching the screenshot */}
      <div className="settings-sub-header">
        <div className="back-arrow" onClick={onBack}>
          ‹
        </div>
        <div className="settings-title">週期設定</div>
      </div>

      <div className="settings-scroll">
        <div className="setting-card">
          <div className="setting-row">
            <div>
              <div className="setting-lbl">平均週期長度</div>
              <div className="setting-sub">上次經期開始到下次開始的天數</div>
              <div className="setting-range">範圍：10 – 60 天</div>
            </div>
            <div className="mini-stepper">
              <button
                className="ms-btn"
                onClick={() =>
                  onUpdateUserData({ ...userData, cycleLen: Math.max(10, userData.cycleLen - 1) })
                }
              >
                −
              </button>
              <div className="ms-val">{userData.cycleLen}</div>
              <button
                className="ms-btn"
                onClick={() =>
                  onUpdateUserData({ ...userData, cycleLen: Math.min(60, userData.cycleLen + 1) })
                }
              >
                +
              </button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-lbl">經期持續天數</div>
              <div className="setting-sub">每次月經平均持續幾天</div>
              <div className="setting-range">範圍：1 – 14 天</div>
            </div>
            <div className="mini-stepper">
              <button
                className="ms-btn"
                onClick={() =>
                  onUpdateUserData({
                    ...userData,
                    periodDuration: Math.max(1, userData.periodDuration - 1),
                  })
                }
              >
                −
              </button>
              <div className="ms-val">{userData.periodDuration}</div>
              <button
                className="ms-btn"
                onClick={() =>
                  onUpdateUserData({
                    ...userData,
                    periodDuration: Math.min(14, userData.periodDuration + 1),
                  })
                }
              >
                +
              </button>
            </div>
          </div>
        </div>
        <button className="save-settings-btn" onClick={onSave}>
          儲存設定
        </button>
      </div>
    </div>
  )
}
