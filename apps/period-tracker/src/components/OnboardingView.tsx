import React, { useState } from 'react'
import { DrumPicker } from './DrumPicker'
import { Stepper } from './Stepper'

interface OnboardingViewProps {
  onFinish: (data: {
    lastPeriodStart: { y: number; m: number; d: number }
    periodDuration: number
    cycleLen: number
  }) => void
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onFinish }) => {
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [obDate, setObDate] = useState({ y: 2026, m: 5, d: 7 })
  const [obCyc, setObCyc] = useState(28)
  const [obDur, setObDur] = useState(5)

  const handleFinish = () => {
    onFinish({
      lastPeriodStart: obDate,
      periodDuration: obDur,
      cycleLen: obCyc,
    })
  }

  return (
    <div id="onboarding">
      <div className="ob-progress">
        <div
          className="ob-progress-fill"
          style={{ width: `${25 + (onboardingStep - 1) * 25}%` }}
        ></div>
      </div>
      <div className="ob-pages">
        {onboardingStep === 1 && (
          <div className="ob-page active" id="ob-page-1">
            <div className="ob-welcome">
              <div className="ob-badge">
                <img src="/assets/icons/logo icon.png" alt="Logo" />
              </div>
              <div className="ob-title">
                陪你記下
                <br />
                <span>每次的生理週期</span>
              </div>
              <div className="ob-desc">
                紀錄每一天，掌握身體節律。
                <br />
                讓數據幫你找到最適合自己的生活方式。
              </div>
              <div className="ob-features">
                <div className="ob-feature">
                  <div className="ob-feat-text">
                    <b>週期預測</b>
                    <br />
                    預測排卵日、下次經期與易孕期
                  </div>
                </div>
                <div className="ob-feature">
                  <div className="ob-feat-text">
                    <b>每日紀錄</b>
                    <br />
                    記錄流量、症狀與情緒變化
                  </div>
                </div>
              </div>
              <div className="ob-privacy">你的資料僅供個人使用，不會分享給第三方。</div>
            </div>
            <div className="ob-bottom">
              <button className="ob-btn-primary" onClick={() => setOnboardingStep(2)}>
                開始紀錄 <span>→</span>
              </button>
            </div>
          </div>
        )}
        {onboardingStep === 2 && (
          <div className="ob-page active">
            <div className="ob-pg-inner">
              <div className="ob-step-label">步驟 1 / 2</div>
              <div className="ob-pg-title">
                上次經期
                <br />
                從哪天開始？
              </div>
              <div className="ob-pg-sub">
                請選擇最近一次月經的第一天。
                <br />
                這是計算週期的基準。
              </div>
              <div className="drum-wrap">
                <div className="drum-highlight"></div>
                <div className="drum-fade-top"></div>
                <div className="drum-fade-bot"></div>
                <div className="drum-cols">
                  <DrumPicker
                    items={[2024, 2025, 2026]}
                    value={obDate.y}
                    onChange={(v) => setObDate({ ...obDate, y: v as number })}
                    className="drum-col-year"
                  />
                  <DrumPicker
                    items={Array.from({ length: 12 }, (_, i) => i + 1)}
                    value={obDate.m}
                    onChange={(v) => setObDate({ ...obDate, m: v as number })}
                    unit="月"
                  />
                  <DrumPicker
                    items={Array.from({ length: 31 }, (_, i) => i + 1)}
                    value={obDate.d}
                    onChange={(v) => setObDate({ ...obDate, d: v as number })}
                  />
                </div>
              </div>
            </div>
            <div className="ob-bottom">
              <button className="ob-btn-primary" onClick={() => setOnboardingStep(3)}>
                繼續 →
              </button>
              <button className="ob-btn-back" onClick={() => setOnboardingStep(1)}>
                ← 返回
              </button>
            </div>
          </div>
        )}
        {onboardingStep === 3 && (
          <div className="ob-page active">
            <div className="ob-pg-inner">
              <div className="ob-step-label">步驟 2 / 2</div>
              <div className="ob-pg-title">
                你的週期
                <br />
                大概多長？
              </div>
              <div className="ob-pg-sub">
                不確定的話先用預設值也沒關係，
                <br />
                之後可以在設定裡調整。
              </div>
              <div className="ob-settings-row">
                <div className="ob-settings-lbl">生理週期</div>
                <div className="ob-settings-title">平均週期天數</div>
                <div className="ob-settings-sub">從一次月經第一天到下一次月經前一天</div>
                <div className="ob-settings-sub-small">範圍：10 – 60 天</div>
                <Stepper value={obCyc} min={10} max={60} onChange={setObCyc} unit="天" />
              </div>
              <div className="ob-settings-row">
                <div className="ob-settings-lbl">經期長度</div>
                <div className="ob-settings-title">每次持續天數</div>
                <div className="ob-settings-sub">每次月經平均持續幾天</div>
                <div className="ob-settings-sub-small">範圍：1 – 14 天</div>
                <Stepper value={obDur} min={1} max={14} onChange={setObDur} unit="天" />
              </div>
            </div>
            <div className="ob-bottom">
              <button className="ob-btn-primary" onClick={handleFinish}>
                完成設定
              </button>
              <button className="ob-btn-back" onClick={() => setOnboardingStep(2)}>
                ← 返回
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
