import { FC, useState, useEffect } from 'react'
import { SYMPTOMS, EMOTIONS, getScore } from '@repo/utils'
import { DayLog, PbacLog } from '../types'
import { PbacLogItem } from './PbacLogItem'
import { PbacAddSheet } from './PbacAddSheet'
import { ProductSelector } from './ProductSelector'
import { PbacSummaryRow } from './PbacSummaryRow'
import { ChipSection } from './ChipSection'

interface DailyLogCardProps {
  selectedDate: Date
  selectedDateKey: string
  dayLog?: DayLog
  statusText?: string
  isToday?: boolean
  isFuture?: boolean
  cycleTotalScore?: number
  onTogglePeriod: (date: Date) => void
  onSaveDaily: (key: string, data: Partial<DayLog>) => void
  onClose?: () => void
  onShowPbacInfo?: () => void
}

export const DailyLogCard: FC<DailyLogCardProps> = ({
  selectedDate,
  selectedDateKey,
  dayLog,
  statusText,
  isToday,
  isFuture,
  cycleTotalScore = 0,
  onTogglePeriod,
  onSaveDaily,
  onClose,
  onShowPbacInfo,
}) => {
  const [localLogs, setLocalLogs] = useState<PbacLog[]>([])
  const [localProduct, setLocalProduct] = useState<'pad' | 'tampon' | 'cup'>('pad')
  const [localSymptoms, setLocalSymptoms] = useState<string[]>([])
  const [localEmotions, setLocalEmotions] = useState<string[]>([])
  const [showAddSheet, setShowAddSheet] = useState(false)

  useEffect(() => {
    setLocalLogs(dayLog?.pbacLogs || [])
    setLocalProduct(dayLog?.pbacProduct || 'pad')
    setLocalSymptoms(dayLog?.symptoms || [])
    setLocalEmotions(dayLog?.emotions || [])
    setShowAddSheet(false)
  }, [dayLog, selectedDateKey])

  const inP = dayLog?.period === true
  const dayScore = localLogs.reduce((sum, l) => sum + getScore(l.level, l.clot), 0)

  const originalDayScore = (dayLog?.pbacLogs || []).reduce(
    (sum, l) => sum + getScore(l.level, l.clot),
    0
  )
  const liveCycleScore = cycleTotalScore - originalDayScore + dayScore

  const handleAddLog = (newLogData: Omit<PbacLog, 'id' | 'time'>) => {
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`

    const newLog: PbacLog = {
      ...newLogData,
      id: Date.now(),
      time: timeStr,
    }

    setLocalLogs([...localLogs, newLog])
    setShowAddSheet(false)
  }

  const handleDeleteLog = (id: number) => {
    setLocalLogs(localLogs.filter((l) => l.id !== id))
  }

  const handleCommitSave = () => {
    // 前端發送完整的編輯結果，後端直接蓋掉
    const saveData: Partial<DayLog> = {
      pbacProduct: localProduct,
      symptoms: localSymptoms,
      emotions: localEmotions,
      pbacLogs: localLogs,
    }

    onSaveDaily(selectedDateKey, saveData)
    if (onClose) onClose()
  }

  const getCycleScoreClass = () => {
    if (liveCycleScore >= 100) return 'danger'
    if (liveCycleScore >= 60) return 'warning'
    return 'success'
  }

  const toggleSymptom = (s: string) => {
    setLocalSymptoms((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s]))
  }

  const toggleEmotion = (e: string) => {
    setLocalEmotions((prev) => (prev.includes(e) ? prev.filter((v) => v !== e) : [...prev, e]))
  }

  return (
    <div className="day-inline-card">
      <div className="dic-top">
        <div className="dic-title-row">
          {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          {isToday && <span className="dic-today"> · 今天</span>}
          {statusText && <span className="dic-status"> {statusText}</span>}
        </div>
        {!isFuture && (
          <button
            className={inP ? 'dic-cancel-btn' : 'dic-mark-btn'}
            onClick={() => onTogglePeriod(selectedDate)}
          >
            {inP ? '取消標記' : '標記經期'}
          </button>
        )}
      </div>

      {inP && (
        <div className="period-fields">
          <ProductSelector selectedProduct={localProduct} onSelect={setLocalProduct} />

          <PbacSummaryRow
            logsCount={localLogs.length}
            dayScore={dayScore}
            liveCycleScore={liveCycleScore}
            scoreClass={getCycleScoreClass()}
            onShowInfo={onShowPbacInfo}
          />

          <div className="pbac-log-list">
            {localLogs.length === 0 ? (
              <div className="pbac-empty">每更換一次記一次，幫你了解經血量</div>
            ) : (
              localLogs.map((l) => (
                <PbacLogItem
                  key={l.id}
                  log={l}
                  defaultProduct={localProduct}
                  onDelete={handleDeleteLog}
                />
              ))
            )}
          </div>

          {!showAddSheet ? (
            <div className="pbac-add-btn" onClick={() => setShowAddSheet(true)}>
              <span className="pbac-add-plus">+</span> 新增一筆
            </div>
          ) : (
            <PbacAddSheet
              currentProduct={localProduct}
              onAdd={handleAddLog}
              onCancel={() => setShowAddSheet(false)}
            />
          )}

          <ChipSection
            label="症狀"
            items={SYMPTOMS}
            selectedItems={localSymptoms}
            onToggle={toggleSymptom}
            mtClass="pf-label-mt20"
          />

          <ChipSection
            label="情緒變化"
            items={EMOTIONS}
            selectedItems={localEmotions}
            onToggle={toggleEmotion}
            mtClass="pf-label-mt10"
            chipClass="emo"
          />

          <div className="save-row save-row-mt20">
            <button className="pf-save" onClick={handleCommitSave}>
              儲存
            </button>
            <button className="pf-skip" onClick={() => onClose && onClose()}>
              略過
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
