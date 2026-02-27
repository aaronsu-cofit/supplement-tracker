'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';

export default function WoundsDashboard() {
    const { user } = useAuth();
    const [wounds, setWounds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWounds = async () => {
            try {
                const res = await fetch('/api/wounds');
                if (res.ok) setWounds(await res.json());
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchWounds();
    }, []);

    const activeWound = wounds.length > 0 ? wounds[0] : null;

    const getDaysSince = (dateStr) => {
        if (!dateStr) return 0;
        return Math.ceil(Math.abs(new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    };

    const daysSince = activeWound ? getDaysSince(activeWound.date_of_injury) : 0;
    const displayName = user?.displayName || '你';

    return (
        <div style={{ padding: '1.2rem', fontFamily: "'Inter', 'SF Pro', sans-serif" }}>
            {/* Welcome Banner */}
            <div style={styles.welcomeBanner}>
                <div style={styles.welcomeGlow}></div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={styles.nurseAvatar}>👩‍⚕️</div>
                    <div>
                        <h2 style={styles.welcomeTitle}>
                            {displayName}，您好！
                        </h2>
                        <p style={styles.welcomeSubtitle}>
                            {daysSince > 0
                                ? `今天是照護的第 ${daysSince} 天，傷口會越來越好的 💪`
                                : '我會陪伴您記錄與復原每一次的傷口。'}
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                    <div style={styles.spinner}></div>
                    <p style={{ marginTop: '1rem' }}>載入資料中...</p>
                </div>
            ) : !activeWound ? (
                /* Empty State */
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(255,154,158,0.3))' }}>🩹</div>
                    <h3 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '1.2rem' }}>還沒有傷口紀錄</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        讓我們開始第一次的傷口建檔與 AI 偵測
                    </p>
                    <Link href="/wounds/scan" style={styles.primaryButton}>
                        📸 開始掃描與建檔
                    </Link>
                </div>
            ) : (
                /* Active Wound Dashboard */
                <div>
                    {/* Progress Badge */}
                    <div style={styles.progressSection}>
                        <div style={styles.progressBadge}>
                            <span style={styles.progressNumber}>{daysSince}</span>
                            <span style={styles.progressLabel}>天</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.05rem', color: '#fff' }}>目前照護進度</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                {daysSince <= 7 ? '急性照護期' : daysSince <= 21 ? '穩定恢復期' : '長期修復期'}
                            </p>
                        </div>
                        <Link href="/wounds/history" style={styles.outlineButton}>
                            歷程時間軸
                        </Link>
                    </div>

                    {/* Quick Access Grid */}
                    <div style={styles.gridContainer}>
                        <Link href="/wounds/scan" style={styles.actionCard}>
                            <div style={styles.actionCardGlow}></div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <span style={styles.actionIcon}>📸</span>
                                <span style={styles.actionTitle}>今日雷達掃描</span>
                                <span style={styles.actionDesc}>AI 一鍵風險分析</span>
                            </div>
                        </Link>

                        <div style={{ ...styles.actionCard, cursor: 'default' }}>
                            <div style={{ ...styles.actionCardGlow, background: 'radial-gradient(circle at 30% 30%, rgba(92,224,216,0.15) 0%, transparent 60%)' }}></div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <span style={styles.actionIcon}>📺</span>
                                <span style={styles.actionTitle}>衛教小學堂</span>
                                <span style={styles.actionDesc}>專業照護知識</span>
                            </div>
                        </div>
                    </div>

                    {/* Contextual Recommendation */}
                    <h3 style={styles.sectionTitle}>專屬照護建議</h3>
                    <div style={styles.recommendCard}>
                        <div style={styles.recommendAccent}></div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            {daysSince <= 7 ? (
                                <>
                                    <h4 style={styles.recommendTitle}>🛡️ 急性期防水對策</h4>
                                    <p style={styles.recommendText}>
                                        前 7 天避免碰水很重要！了解如何正確使用抗菌防水敷料，阻隔細菌不悶熱。
                                    </p>
                                    <button style={styles.recommendButton}>了解矽膠泡棉敷料 →</button>
                                </>
                            ) : (
                                <>
                                    <h4 style={styles.recommendTitle}>✨ 把握除疤黃金期</h4>
                                    <p style={styles.recommendText}>
                                        傷口進入穩定期了！現在是使用矽膠凝膠撫平疤痕的最佳時刻。
                                    </p>
                                    <button style={styles.recommendButton}>了解除疤專案包 →</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
            `}</style>
        </div>
    );
}

const styles = {
    welcomeBanner: {
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(255,154,158,0.2) 0%, rgba(253,164,133,0.15) 50%, rgba(124,92,252,0.1) 100%)',
        border: '1px solid rgba(255,154,158,0.15)',
        borderRadius: '20px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        overflow: 'hidden',
    },
    welcomeGlow: {
        position: 'absolute',
        top: '-50%', right: '-20%',
        width: '200px', height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,154,158,0.2) 0%, transparent 70%)',
        filter: 'blur(30px)',
    },
    nurseAvatar: {
        width: '52px', height: '52px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(255,154,158,0.3), rgba(253,164,133,0.3))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    welcomeTitle: {
        fontSize: '1.15rem', margin: '0 0 0.3rem', fontWeight: 700, color: '#fff',
    },
    welcomeSubtitle: {
        margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4,
    },
    spinner: {
        width: '36px', height: '36px',
        border: '3px solid rgba(255,255,255,0.08)',
        borderTop: '3px solid #ff9a9e',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto',
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem 1.5rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
    },
    primaryButton: {
        display: 'inline-block',
        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
        color: '#fff',
        padding: '0.85rem 2rem',
        borderRadius: '50px',
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: '0.95rem',
        boxShadow: '0 4px 20px rgba(255,154,158,0.3)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    progressSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem 1.2rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
    },
    progressBadge: {
        width: '56px', height: '56px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 15px rgba(255,154,158,0.3)',
        flexShrink: 0,
    },
    progressNumber: {
        fontSize: '1.3rem', fontWeight: 800, color: '#fff', lineHeight: 1,
    },
    progressLabel: {
        fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600,
    },
    outlineButton: {
        padding: '0.4rem 0.8rem',
        border: '1px solid rgba(255,154,158,0.4)',
        borderRadius: '20px',
        color: '#ff9a9e',
        fontSize: '0.75rem',
        fontWeight: 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'background 0.2s',
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.8rem',
        marginBottom: '1.8rem',
    },
    actionCard: {
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '1.3rem 1rem',
        borderRadius: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        textDecoration: 'none',
        color: '#e8e6f0',
        overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s',
    },
    actionCardGlow: {
        position: 'absolute',
        top: '-30%', left: '-20%',
        width: '140px', height: '140px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,154,158,0.12) 0%, transparent 60%)',
        filter: 'blur(20px)',
    },
    actionIcon: {
        display: 'block', fontSize: '2rem', marginBottom: '0.6rem',
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
    },
    actionTitle: {
        display: 'block', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem',
    },
    actionDesc: {
        display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
    },
    sectionTitle: {
        margin: '0 0 1rem',
        fontSize: '1.05rem',
        color: '#fff',
        fontWeight: 700,
    },
    recommendCard: {
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '1.3rem',
        overflow: 'hidden',
    },
    recommendAccent: {
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '4px',
        background: 'linear-gradient(180deg, #ff9a9e, #fda085)',
        borderRadius: '4px 0 0 4px',
    },
    recommendTitle: {
        margin: '0 0 0.6rem', color: '#fff', fontSize: '1rem', fontWeight: 700,
    },
    recommendText: {
        margin: '0 0 1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6,
    },
    recommendButton: {
        background: 'transparent',
        border: '1px solid rgba(255,154,158,0.3)',
        color: '#ff9a9e',
        padding: '0.5rem 1.2rem',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
};
