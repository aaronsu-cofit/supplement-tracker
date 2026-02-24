'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

export default function HomePage() {
  const { t } = useLanguage();
  const [supplements, setSupplements] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animatingId, setAnimatingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [supRes, ciRes, streakRes] = await Promise.all([
        fetch('/api/supplements'),
        fetch('/api/checkins'),
        fetch('/api/checkins?type=streak'),
      ]);

      if (supRes.ok && ciRes.ok && streakRes.ok) {
        setSupplements(await supRes.json());
        setCheckIns(await ciRes.json());
        const streakData = await streakRes.json();
        setStreak(streakData.streak || 0);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async (supplementId) => {
    setAnimatingId(supplementId);
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementId }),
      });
      if (res.ok) {
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
      await fetch('/api/checkins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementId, date: today }),
      });
      await fetchData();
    } catch (err) {
      console.error('Uncheck error:', err);
    }
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

  if (loading) {
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
          <a href="/supplements" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>
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
                <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                  {totalCount > 0 ? Math.round(progress * 100) : 0}%
                </div>
                <div className="stat-label">{t('home.todayProgress')}</div>
              </div>
            </div>
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
    </div>
  );
}
