'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

export default function HistoryPage() {
    const { t, locale } = useLanguage();
    const [history, setHistory] = useState([]);
    const [details, setDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedDate, setExpandedDate] = useState(null);
    const [dateRange, setDateRange] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        };
    });

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/checkins?type=history&startDate=${dateRange.start}&endDate=${dateRange.end}`
            );
            if (res.ok) {
                setHistory(await res.json());
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const fetchDateDetails = async (date) => {
        if (details[date]) {
            setExpandedDate(expandedDate === date ? null : date);
            return;
        }
        try {
            const res = await fetch(`/api/checkins?date=${date}`);
            if (res.ok) {
                const data = await res.json();
                setDetails((prev) => ({ ...prev, [date]: data }));
                setExpandedDate(date);
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const navigate = (direction) => {
        const newEnd = new Date(dateRange.end);
        const newStart = new Date(dateRange.start);
        const days = direction === 'prev' ? -30 : 30;
        newEnd.setDate(newEnd.getDate() + days);
        newStart.setDate(newStart.getDate() + days);

        // Don't go into the future
        const today = new Date();
        if (newEnd > today) return;

        setDateRange({
            start: newStart.toISOString().split('T')[0],
            end: newEnd.toISOString().split('T')[0],
        });
        setLoading(true);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        if (locale === 'zh-TW') {
            return `${date.getMonth() + 1}月${date.getDate()}日 (${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]})`;
        }
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatDateRange = () => {
        const start = new Date(dateRange.start + 'T00:00:00');
        const end = new Date(dateRange.end + 'T00:00:00');
        if (locale === 'zh-TW') {
            return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
        }
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-container"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <LanguageSwitcher />

            <div className="page-header">
                <h1 className="page-title">{t('history.title')}</h1>
            </div>

            <div className="date-nav">
                <button className="date-nav-btn" onClick={() => navigate('prev')}>←</button>
                <span className="date-display">{formatDateRange()}</span>
                <button className="date-nav-btn" onClick={() => navigate('next')}>→</button>
            </div>

            {history.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <p className="empty-title">{t('history.noRecords')}</p>
                </div>
            ) : (
                history.map((entry, idx) => (
                    <div key={entry.date} className="history-date-card slide-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                        <div className="history-date-header" onClick={() => fetchDateDetails(entry.date)}>
                            <span className="history-date">{formatDate(entry.date)}</span>
                            <span className="history-count">
                                {entry.supplements_taken} {t('history.items')} ✓
                            </span>
                        </div>
                        {expandedDate === entry.date && details[entry.date] && (
                            <div className="history-details">
                                {details[entry.date].map((item) => (
                                    <div key={item.id} className="history-item">
                                        <span className="history-item-name">
                                            💊 {item.supplement_name}
                                            {item.dosage && ` (${item.dosage})`}
                                        </span>
                                        <span className="history-item-time">
                                            {new Date(item.checked_at).toLocaleTimeString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
