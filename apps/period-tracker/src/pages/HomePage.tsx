import { useState, useEffect, useMemo, useRef } from 'react'
import { useLiff } from '@vitera/client-auth'
import { setupCycle, updateSettings, getCycleData } from '../api/client'
import { PHASE_HINTS } from '../constants'
import { DayLog, PbacLog, UserData } from '../types'
import { formatDate, calculateCycleInfo, calculateDayInfo, getScore } from '@vitera/utils'
import { initializeAppData, handleLineLoginSuccess } from '../utils/auth'
import {
  handlePeriodToggle,
  performPeriodToggle,
  handleSaveDailyLog,
  handleAddPbacLog,
} from '../utils/handlers'
import { AdviceModal } from '../components/AdviceModal'
import { CancelPeriodModal } from '../components/CancelPeriodModal'
import { PbacOverlay } from '../components/PbacOverlay'
import { TutorialOverlay } from '../components/TutorialOverlay'
import { SettingsIcon } from '../components/SettingsIcon'
import { OnboardingView } from '../components/OnboardingView'
import { InitView } from '../components/InitView'
import { PhaseBanner } from '../components/PhaseBanner'
import { PbacSummaryCard } from '../components/PbacSummaryCard'
import { PbacInfoModal } from '../components/PbacInfoModal'
import { DailyLogCard } from '../components/DailyLogCard'
import { HistoryTab } from '../components/HistoryTab'
import { SettingsTab } from '../components/SettingsTab'
import { Calendar } from '../components/Calendar'
import '../App.css'

export function HomePage() {
  const liffId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('liffId') || import.meta.env.VITE_LIFF_ID
  }, [])

  const { isInitialized, isLoggedIn } = useLiff({
    liffId,
    autoLogin: true,
    onLoggedIn: async (token) => {
      await handleLineLoginSuccess(token, setUserData, setView, setTutorialStep, toast)
      setLoading(false)
    },
  })

  const [, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData>({
    hasData: false,
    lastPeriodStart: null,
    periodDuration: 5,
    cycleLen: 28,
    dayData: {},
  })

  // UI State
  const [view, setView] = useState<'login' | 'onboarding' | 'main'>('login')
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'settings'>('log')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false)
  const [showToast, setShowToast] = useState<string | null>(null)
  const [showAdviceModal, setShowAdviceModal] = useState(false)
  const [showPbacOverlay, setShowPbacOverlay] = useState(false)
  const [showPbacInfo, setShowPbacInfo] = useState(false)
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean
    mode: 'first-day' | 'middle-day'
    date: Date
    count: number
  }>({ isOpen: false, mode: 'first-day', date: new Date(), count: 0 })
  const [tutorialStep, setTutorialStep] = useState(0)

  const selectedDateKey = useMemo(
    () => (selectedDate && hasUserSelectedDate ? formatDate(selectedDate) : ''),
    [selectedDate, hasUserSelectedDate]
  )

  // Auth & Data Init (for non-LINE or recovery)
  useEffect(() => {
    // If we are using LIFF and it's not initialized yet, we wait for LIFF's onLoggedIn
    if (liffId && !isInitialized) return

    // If we are using LIFF and not logged in, we wait
    if (liffId && !isLoggedIn) return

    const init = async () => {
      try {
        await initializeAppData(setUserData, setView, setTutorialStep)
      } catch (error) {
        console.error('Init failed', error)
        setView('login')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [liffId, isInitialized, isLoggedIn])


  const toast = (msg: string) => {
    setShowToast(msg)
    setTimeout(() => setShowToast(null), 2500)
  }

  // --- Logic ---
  const cycleInfo = useMemo(() => calculateCycleInfo(userData, getScore, formatDate), [userData])

  const phase = cycleInfo?.phase || '濾泡期'
  const cycleDay = cycleInfo?.cycleDay || 1
  const phaseDay = cycleInfo?.phaseDay || 1
  const phaseInfo = PHASE_HINTS[phase]
  const dailyAdviceSummary = PHASE_HINTS[phase]?.dailyDesc?.[cycleDay] || ''

  const selectedDayInfo = useMemo(
    () =>
      selectedDate && hasUserSelectedDate
        ? calculateDayInfo(selectedDate, userData, cycleInfo, formatDate)
        : { dayLog: undefined, statusText: '', isToday: false, isFuture: false },
    [selectedDate, userData, cycleInfo, hasUserSelectedDate]
  )

  // Track previous period state to detect when period is unmarked via simple unmark
  const prevPeriodStateRef = useRef<boolean | undefined>(undefined)

  // Auto-close card on simple unmark (when no modal is shown)
  useEffect(() => {
    if (hasUserSelectedDate && selectedDate && !cancelModal.isOpen) {
      const key = formatDate(selectedDate)
      const currentIsPeriod = userData.dayData[key]?.period === true
      const wasMarked = prevPeriodStateRef.current === true
      const nowUnmarked = currentIsPeriod === false

      // Close if: was marked before, now unmarked, and modal is not open
      // (simple unmark case)
      if (wasMarked && nowUnmarked) {
        setSelectedDate(null)
        setHasUserSelectedDate(false)
      }

      prevPeriodStateRef.current = currentIsPeriod
    }
  }, [userData.dayData, hasUserSelectedDate, selectedDate, cancelModal.isOpen])

  // --- Handlers ---
  const handleOnboardingFinish = async (data: {
    lastPeriodStart: { y: number; m: number; d: number }
    periodDuration: number
    cycleLen: number
  }) => {
    setLoading(true)
    const initialData = {
      userId: 'user_123',
      ...data,
    }
    try {
      await setupCycle(initialData)
      // 重新獲取完整數據以確保前後端一致
      const fullData = await getCycleData()
      setUserData(fullData)
      setView('main')
      setTutorialStep(1)
    } catch {
      toast('儲存失敗')
    } finally {
      setLoading(false)
    }
  }

  const togglePeriod = async (date: Date) => {
    await handlePeriodToggle(date, userData, {
      onShowModal: (params) => {
        setCancelModal({
          isOpen: true,
          mode: params.mode,
          date: params.date,
          count: params.count,
        })
      },
      onUpdateUserData: setUserData,
      onShowToast: toast,
    })
  }

  const handleSaveDaily = async (key: string, data: Partial<DayLog>) => {
    await handleSaveDailyLog(key, data, userData, setUserData, toast)
  }

  const handleAddPbac = async (
    log: Partial<PbacLog>,
    product: string,
    color: string,
    clot: string
  ) => {
    await handleAddPbacLog(log, product, color, clot, userData, setUserData, toast, () =>
      setShowPbacOverlay(false)
    )
  }

  // Wrapper for handling CancelPeriodModal actions
  const performCancelAction = async (
    date: Date,
    options: {
      isPeriod: boolean
      clearFollowing?: boolean
      clearEntireCycle?: boolean
    }
  ) => {
    await performPeriodToggle(date, userData, {
      isPeriod: options.isPeriod,
      clearFollowing: options.clearFollowing,
      clearEntireCycle: options.clearEntireCycle,
      onUpdateUserData: setUserData,
      onShowToast: toast,
    })
  }

  if (view === 'login') return <InitView />

  if (view === 'onboarding') return <OnboardingView onFinish={handleOnboardingFinish} />

  return (
    <div id="app" className="visible">
      <div className="tb">
        <div className="tb-row">
          <div className="tb-ttl">了解你的生理週期</div>
          <div className="gear-btn" onClick={() => setActiveTab('settings')}>
            <SettingsIcon size={18} />
          </div>
        </div>
      </div>
      {activeTab !== 'settings' && (
        <div className="tab-bar">
          <div
            className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
          >
            日誌
          </div>
          <div
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            歷史紀錄
          </div>
        </div>
      )}

      {activeTab !== 'settings' ? (
        <div className="det-scroll">
          {activeTab === 'log' && (
            <>
              <PhaseBanner
                phase={phase}
                phaseDay={phaseDay}
                phaseInfo={phaseInfo}
                dailyAdviceSummary={dailyAdviceSummary}
                onShowAdvice={() => setShowAdviceModal(true)}
                gridInfo={
                  cycleInfo
                    ? {
                        ovulationDate: cycleInfo.ovulationDate,
                        nextPeriodDate: cycleInfo.nextPeriodDate,
                        daysToNext: cycleInfo.daysToNext,
                        lastPeriodStart: cycleInfo.lastPeriodStart,
                        periodDuration: cycleInfo.periodDuration,
                      }
                    : undefined
                }
              />

              {phase === '經期' && (
                <PbacSummaryCard
                  pbacTotal={cycleInfo?.pbacTotal || 0}
                  cycleDay={cycleDay}
                  onShowPbacOverlay={() => setShowPbacOverlay(true)}
                  onShowInfo={() => setShowPbacInfo(true)}
                />
              )}

              <Calendar
                currentMonth={currentMonth}
                selectedDateKey={selectedDateKey}
                userData={userData}
                onMonthChange={setCurrentMonth}
                onDateSelect={(date) => {
                  setSelectedDate(date)
                  setHasUserSelectedDate(true)
                }}
                inlineChild={
                  hasUserSelectedDate && selectedDate ? (
                    <DailyLogCard
                      selectedDate={selectedDate}
                      selectedDateKey={selectedDateKey}
                      dayLog={selectedDayInfo.dayLog as DayLog}
                      statusText={selectedDayInfo.statusText}
                      isToday={selectedDayInfo.isToday}
                      isFuture={selectedDayInfo.isFuture}
                      cycleTotalScore={cycleInfo?.pbacTotal || 0}
                      onTogglePeriod={togglePeriod}
                      onSaveDaily={handleSaveDaily}
                      onShowPbacInfo={() => setShowPbacInfo(true)}
                      onClose={() => {
                        setSelectedDate(null)
                        setHasUserSelectedDate(false)
                      }}
                    />
                  ) : null
                }
              />
            </>
          )}

          {activeTab === 'history' && (
            <HistoryTab
              userData={userData}
              cycleInfo={cycleInfo}
              isActive={activeTab === 'history'}
            />
          )}
        </div>
      ) : (
        <SettingsTab
          userData={userData}
          onUpdateUserData={setUserData}
          onSave={async () => {
            try {
              await updateSettings({
                periodDuration: userData.periodDuration,
                cycleLen: userData.cycleLen,
              })
              setActiveTab('log')
              toast('設定已儲存')
            } catch (error) {
              console.error('Failed to save settings', error)
              toast('儲存失敗，請稍後再試')
            }
          }}
          onBack={() => setActiveTab('log')}
        />
      )}

      {showToast && <div className="toast show">{showToast}</div>}
      <AdviceModal
        isOpen={showAdviceModal}
        onClose={() => setShowAdviceModal(false)}
        phase={phase}
        cycleDay={cycleDay}
        phaseDay={phaseDay}
      />
      <PbacOverlay
        isOpen={showPbacOverlay}
        onClose={() => setShowPbacOverlay(false)}
        cycleDay={cycleDay}
        dayLogs={userData.dayData[selectedDateKey]?.pbacLogs}
        initialProduct={userData.dayData[selectedDateKey]?.pbacProduct}
        onConfirm={handleAddPbac}
      />
      <PbacInfoModal isOpen={showPbacInfo} onClose={() => setShowPbacInfo(false)} />
      <CancelPeriodModal
        isOpen={cancelModal.isOpen}
        mode={cancelModal.mode}
        successorsCount={cancelModal.count}
        onClose={() => setCancelModal({ ...cancelModal, isOpen: false })}
        onConfirmOnlyToday={() => {
          setCancelModal({ ...cancelModal, isOpen: false })
          performCancelAction(cancelModal.date, { isPeriod: false })
          // Close DailyLogCard after unmark
          setSelectedDate(null)
          setHasUserSelectedDate(false)
        }}
        onConfirmClearFollowing={() => {
          setCancelModal({ ...cancelModal, isOpen: false })
          if (cancelModal.mode === 'first-day') {
            performCancelAction(cancelModal.date, { isPeriod: false, clearEntireCycle: true })
          } else {
            performCancelAction(cancelModal.date, { isPeriod: false, clearFollowing: true })
          }
          // Close DailyLogCard after unmark
          setSelectedDate(null)
          setHasUserSelectedDate(false)
        }}
      />
      <TutorialOverlay
        isOpen={tutorialStep > 0}
        onNext={() => {
          setTutorialStep(0)
          localStorage.setItem('tutorial_done', 'true')
        }}
      />
    </div>
  )
}
