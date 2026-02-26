'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiff } from '@/app/components/liff/LiffProvider';

export default function WoundsDashboard() {
    const { isInitialized, liff, profile } = useLiff();
    const [wounds, setWounds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWounds = async () => {
            try {
                const res = await fetch('/api/wounds');
                if (res.ok) {
                    const data = await res.json();
                    setWounds(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchWounds();
    }, []);

    const activeWound = wounds.length > 0 ? wounds[0] : null;

    // Calculate days since surgery/injury
    const getDaysSince = (dateStr) => {
        if (!dateStr) return 0;
        const start = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const daysSince = activeWound ? getDaysSince(activeWound.date_of_injury) : 0;

    return (
        <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
            {/* Virtual Nurse Welcome */}
            <div style={{
                background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 15px rgba(255, 154, 158, 0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>👩‍⚕️</div>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.2rem 0', fontWeight: 'bold' }}>
                            {profile ? `${profile.displayName}，您好！` : '你好！'}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                            {daysSince > 0 
                                ? `今天是您照護的第 ${daysSince} 天，傷口會越來越舒服的。` 
                                : '我會陪伴您記錄與復原每一次的傷口。'}
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>載入資料中...</div>
            ) : !activeWound ? (
                // Empty state
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#fff', borderRadius: '12px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🩹</div>
                    <h3>還沒有建立任何傷口紀錄</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        讓我們開始第一次的傷口建檔與偵測。
                    </p>
                    <Link href="/wounds/scan" style={primaryBtnStyle}>
                        📸 開始掃描與建檔
                    </Link>
                </div>
            ) : (
                // Active Wound State
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>目前照護進度</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#ff6b6b', fontWeight: 'bold' }}>
                                第 {daysSince} 天
                            </span>
                            <Link href="/wounds/history" style={{ ...outlineBtnStyle, padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                歷程時間軸
                            </Link>
                        </div>
                    </div>

                    {/* Quick Access Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <Link href="/wounds/scan" style={cardBtnStyle}>
                            <span style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>📸</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>今日雷達掃描</span>
                            <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.3rem' }}>AI 一鍵風險分析</span>
                        </Link>
                        
                        <div style={cardBtnStyle}>
                            <span style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>📺</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>衛教小學堂</span>
                            <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.3rem' }}>拆除敷料教學</span>
                        </div>
                    </div>

                    {/* Contextual Recommendation based on days */}
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>專屬您的照護建議</h3>
                    {daysSince <= 7 ? (
                        <div style={promoCardStyle}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>🛡️ 急性期防水對策</h4>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666', lineHeight: 1.5 }}>
                                前 7 天避免碰水很重要！了解如何正確使用抗菌防水敷料，阻隔細菌不悶熱。
                            </p>
                            <button style={outlineBtnStyle}>了解矽膠泡棉敷料</button>
                        </div>
                    ) : (
                        <div style={promoCardStyle}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>✨ 把握除疤黃金期</h4>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666', lineHeight: 1.5 }}>
                                傷口進入穩定期了！現在是使用矽膠凝膠撫平疤痕的最佳時刻。
                            </p>
                            <button style={outlineBtnStyle}>了解除疤專案包</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const primaryBtnStyle = {
    display: 'inline-block',
    background: '#ff6b6b',
    color: '#fff',
    padding: '0.8rem 1.5rem',
    borderRadius: '25px',
    textDecoration: 'none',
    fontWeight: 'bold',
    boxShadow: '0 4px 6px rgba(255,107,107,0.2)'
};

const cardBtnStyle = {
    background: '#fff',
    padding: '1.2rem 1rem',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    textDecoration: 'none',
    color: '#333',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
};

const promoCardStyle = {
    background: '#fff',
    borderLeft: '4px solid #fecfef',
    padding: '1.2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
};

const outlineBtnStyle = {
    background: 'transparent',
    border: '1px solid #ff6b6b',
    color: '#ff6b6b',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer'
};
