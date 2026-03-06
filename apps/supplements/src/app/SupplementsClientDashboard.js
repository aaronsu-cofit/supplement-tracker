'use client';
import { apiFetch } from '@vitera/lib';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@vitera/lib';
import { useLiff } from '@vitera/lib';
import { useAuth } from '@vitera/lib';
import { CameraCapture } from '@vitera/ui';
// LanguageSwitcher moved to app-local — import from local copy if needed;
import { IconCamera } from '@vitera/ui';

export default function SupplementsClientDashboard({ initialSupplements = [], initialCheckIns = [], initialStreak = 0 }) {
  const { t } = useLanguage();
  const { isLoading: authLoading } = useAuth();
  const { liff, isInitialized } = useLiff();
  const [supplements, setSupplements] = useState(initialSupplements);
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [streak, setStreak] = useState(initialStreak);
  const [animatingId, setAnimatingId] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [aiMatches, setAiMatches] = useState(null);

  const fetchData = useCallback(async () => {
    // We keep this function so it can refetch when users interact (check/uncheck).
    try {
      const [supRes, ciRes, streakRes] = await Promise.all([
        apiFetch('/api/supplements'),
        apiFetch('/api/checkins'),
        apiFetch('/api/checkins?type=streak'),
      ]);

      if (supRes.ok && ciRes.ok && streakRes.ok) {
        setSupplements(await supRes.json());
        setCheckIns(await ciRes.json());
        const streakData = await streakRes.json();
        setStreak(streakData.streak || 0);
      }
    } catch (err) {
      console.error('Error fetching latest updates:', err);
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(initialSupplements)) {
      setSupplements(initialSupplements);
    }
    if (Array.isArray(initialCheckIns)) {
      setCheckIns(initialCheckIns);
    }
    setStreak(initialStreak || 0);
  }, [initialSupplements, initialCheckIns, initialStreak]);

  const handleCheckIn = async (supplementId) => {
    setAnimatingId(supplementId);
    try {
      const res = await apiFetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementId }),
      });
      if (res.ok) {
        // We calculate if this was the last one needed to complete the day
        const isChecked = (supId) => checkIns.some((ci) => ci.supplement_id === supId) || supId === supplementId;
        const newCheckedCount = supplements.filter((s) => isChecked(s.id)).length;

        if (newCheckedCount === supplements.length && supplements.length > 0) {
          try {
            await apiFetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'daily_completed' })
            });
          } catch (notifyErr) {
            console.error('Failed to trigger push notification:', notifyErr);
          }
        }

        await fetchData();
      }
    } catch (err) {
      console.error('Check-in error:', err);
    }
    setTimeout(() => setAnimatingId(null), 400);
  };

  const handleUncheck = async (supplementId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await apiFetch('/api/checkins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementId, date: today }),
      });
      await fetchData();
    } catch (err) {
      console.error('Uncheck error:', err);
    }
  };

  // Handle AI capsule recognition result
  const handleAiCheckinResult = async (data) => {
    setCameraOpen(false);
    if (data.success && data.result?.matches?.length > 0) {
      setAiMatches(data.result);
    } else {
      setAiMatches({ matches: [], description: data.result?.description || '' });
    }
  };

  const handleConfirmAiCheckin = async () => {
    if (aiMatches?.matches) {
      for (const match of aiMatches.matches) {
        if (match.confidence !== 'low') {
          await handleCheckIn(match.id);
        }
      }
    }
    setAiMatches(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: t('home.greeting'), emoji: '☀️' };
    if (hour < 18) return { text: t('home.greetingAfternoon'), emoji: '🌤️' };
    return { text: t('home.greetingEvening'), emoji: '🌙' };
  };

  const isChecked = (supplementId) => {
    return checkIns.some((ci) => ci.supplement_id === supplementId);
  };

  const checkedCount = supplements.filter((s) => isChecked(s.id)).length;
  const totalCount = supplements.length;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference * (1 - progress);

  const groupByTime = (sups) => {
    const groups = { morning: [], afternoon: [], evening: [] };
    sups.forEach((s) => {
      const time = s.time_of_day || 'morning';
      if (groups[time]) groups[time].push(s);
      else groups.morning.push(s);
    });
    return groups;
  };

  const timeIcons = { morning: '🌅', afternoon: '☀️', evening: '🌙' };
  const timeLabels = {
    morning: t('home.morning'),
    afternoon: t('home.afternoon'),
    evening: t('home.evening'),
  };

  const confidenceLabels = {
    high: t('ai.high'),
    medium: t('ai.medium'),
    low: t('ai.low'),
  };

  if (authLoading) {
    return (
      <div className="page-container">
        <div className="loading-container"><div className="spinner"></div></div>
      </div>
    );
  }

  const greeting = getGreeting();
  const grouped = groupByTime(supplements);

  return (
    <div className="page-container">
      <LanguageSwitcher />

      <div className="greeting-section">
        <h1 className="greeting-text">
          {greeting.text}
          <span className="greeting-emoji">{greeting.emoji}</span>
        </h1>
      </div>

      {totalCount === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💊</div>
          <p className="empty-title">{t('home.noSupplements')}</p>
          <a href="/manage" className="btn btn-primary inline-block mt-2">
            {t('home.addFirst')}
          </a>
        </div>
      ) : (
        <>
          {/* Progress Ring */}
          <div className="progress-section glass-card">
            <div className="progress-ring-wrapper">
              <svg className="progress-ring" width="120" height="120">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c5cfc" />
                    <stop offset="100%" stopColor="#5ce0d8" />
                  </linearGradient>
                </defs>
                <circle className="progress-ring-bg" cx="60" cy="60" r="50" />
                <circle
                  className="progress-ring-fill"
                  cx="60" cy="60" r="50"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="progress-center">
                <div className="progress-number">{checkedCount}/{totalCount}</div>
                <div className="progress-label">{t('home.todayProgress')}</div>
              </div>
            </div>
            <div className="stats-column">
              <div className="stat-item">
                <div className="stat-value">{streak}</div>
                <div className="stat-label">{t('home.streak')}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value text-[var(--accent-primary)]">
                  {totalCount > 0 ? Math.round(progress * 100) : 0}%
                </div>
                <div className="stat-label">{t('home.todayProgress')}</div>
              </div>
            </div>
          </div>

          {/* AI Photo Check-in Button */}
          <div className="action-group">
            <button className="btn-action primary" onClick={() => setCameraOpen(true)}>
              <IconCamera /> {t('ai.photoCheckin')}
            </button>
          </div>

          {checkedCount === totalCount && (
            <div className="all-done-banner">{t('home.allDone')}</div>
          )}

          {/* Grouped supplements */}
          {Object.entries(grouped).map(
            ([time, sups]) =>
              sups.length > 0 && (
                <div key={time} className="time-section">
                  <div className="time-section-header">
                    <span className="time-icon">{timeIcons[time]}</span>
                    <span className="time-label">{timeLabels[time]}</span>
                  </div>
                  {sups.map((sup, idx) => {
                    const checked = isChecked(sup.id);
                    return (
                      <div
                        key={sup.id}
                        className={`checkin-card ${checked ? 'checked' : ''} slide-in`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className="checkin-info">
                          <div className="checkin-name">{sup.name}</div>
                          {sup.dosage && <div className="checkin-dosage">{sup.dosage}</div>}
                        </div>
                        <button
                          className={`checkin-btn ${checked ? 'checked' : 'unchecked'} ${animatingId === sup.id ? 'check-animate' : ''
                            }`}
                          onClick={() => checked ? handleUncheck(sup.id) : handleCheckIn(sup.id)}
                        >
                          {checked ? t('home.checkedIn') : t('home.checkIn')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
          )}
        </>
      )}

      {/* Camera for AI Check-in */}
      {cameraOpen && (
        <CameraCapture
          mode="checkin"
          onResult={handleAiCheckinResult}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* AI Match Results Modal */}
      {aiMatches && (
        <div className="modal-overlay" onClick={() => setAiMatches(null)} role="dialog" aria-modal="true" aria-label={aiMatches.matches.length > 0 ? t('ai.matchFound') : t('ai.noMatch')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {aiMatches.matches.length > 0 ? t('ai.matchFound') : t('ai.noMatch')}
            </h2>

            {aiMatches.description && (
              <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                {aiMatches.description}
              </p>
            )}

            {aiMatches.matches.length > 0 ? (
              <>
                <p className="text-[14px] text-[var(--text-secondary)] mb-3">
                  {t('ai.matchConfirm')}
                </p>
                {aiMatches.matches.map((match) => (
                  <div key={match.id} className="ai-match-item">
                    <span className="ai-match-name">💊 {match.name}</span>
                    <span className={`ai-match-confidence ${match.confidence}`}>
                      {confidenceLabels[match.confidence] || match.confidence}
                    </span>
                  </div>
                ))}
                <div className="form-actions">
                  <button className="btn btn-ghost" onClick={() => setAiMatches(null)}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn btn-primary" onClick={handleConfirmAiCheckin}>
                    ✅ {t('common.confirm')}
                  </button>
                </div>
              </>
            ) : (
              <button className="btn btn-ghost w-full mt-3" onClick={() => setAiMatches(null)}>
                {t('common.close')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
