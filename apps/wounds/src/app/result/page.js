'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function WoundsResultContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const woundId = searchParams.get('woundId');
    const [logData, setLogData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!woundId) return;
        const fetchLog = async () => {
            try {
                const res = await fetch(`/api/wounds/${woundId}/logs`);
                if (res.ok) {
                    const logs = await res.json();
                    if (logs.length > 0) setLogData(logs[0]);
                }
            } catch (error) { console.error(error); }
            finally { setLoading(false); }
        };
        fetchLog();
    }, [woundId]);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                <div style={styles.spinner}></div>
                <p style={{ marginTop: '1rem' }}>載入診斷結果中...</p>
            </div>
        );
    }

    if (!logData) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{ color: '#fff' }}>找不到紀錄</h3>
                <button onClick={() => router.push('/wounds')} style={styles.primaryBtn}>返回首頁</button>
            </div>
        );
    }

    const isConcern = logData.ai_status_label?.includes('留意') || logData.ai_status_label?.includes('諮詢');
    const statusGradient = isConcern
        ? 'linear-gradient(135deg, rgba(255,165,2,0.25), rgba(255,71,87,0.15))'
        : 'linear-gradient(135deg, rgba(46,213,115,0.25), rgba(92,224,216,0.15))';
    const statusBorder = isConcern ? 'rgba(255,165,2,0.3)' : 'rgba(46,213,115,0.3)';
    const statusColor = isConcern ? '#ffa502' : '#2ed573';

    return (
        <div style={{ padding: '1.2rem', fontFamily: "'Inter', 'SF Pro', sans-serif" }}>
            <h2 style={styles.pageTitle}>📊 分析報告</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                拍攝時間：{new Date(logData.logged_at).toLocaleString('zh-TW')}
            </p>

            {/* AI Status Banner */}
            <div style={{
                background: statusGradient,
                border: `1px solid ${statusBorder}`,
                padding: '1.2rem',
                borderRadius: '18px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
            }}>
                <div style={{
                    width: '48px', height: '48px',
                    borderRadius: '14px',
                    background: `${statusColor}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                }}>
                    {isConcern ? '⚠️' : '✅'}
                </div>
                <div>
                    <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.05rem', color: '#fff' }}>
                        {logData.ai_status_label || '復原進度符合預期'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                        {isConcern
                            ? '檢測到部分需要觀察的跡象，請保持乾燥並持續追蹤。'
                            : '傷口看來處於穩定狀態，請繼續保持！'}
                    </p>
                </div>
            </div>

            {/* AI Detail Analysis */}
            <div style={styles.glassCard}>
                <h3 style={styles.cardTitle}>🤖 影像與症狀智能分析</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '0 0 1rem' }}>
                    {logData.ai_assessment_summary}
                </p>
                <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                    <span>🌡️ 疼痛: <b style={{ color: 'rgba(255,255,255,0.7)' }}>{logData.nrs_pain_score}/10</b></span>
                    <span>📝 症狀: <b style={{ color: 'rgba(255,255,255,0.7)' }}>{logData.symptoms || '無'}</b></span>
                </div>
            </div>

            {/* Recommendation */}
            <div style={{ ...styles.glassCard, marginTop: '1rem' }}>
                <div style={styles.recommendAccent}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h4 style={{ margin: '0 0 0.6rem', color: '#fff', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        💡 護理師的叮嚀與推薦
                    </h4>
                    <p style={{ margin: '0 0 1.2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                        目前的傷口狀態適合使用「抗菌保濕敷料」來維持微濕潤環境，這能幫助細胞游移並加速癒合，同時降低留疤機率。
                    </p>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <a href="#" style={styles.outlineBtn}>觀看敷料教學</a>
                        <a href="#" style={{ ...styles.outlineBtn, borderColor: 'rgba(46,213,115,0.3)', color: '#2ed573' }}>🏥 前往合作藥局</a>
                    </div>
                </div>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.5, margin: '1.5rem 0 1rem' }}>
                免責聲明：本系統照片分析僅供日常居家照護參考，非正式醫療診斷依據。<br />
                如有發燒、持續劇痛、大量異常滲出液等嚴重不適，請立即就醫。
            </p>

            <button onClick={() => router.push('/wounds')} style={{ ...styles.primaryBtn, width: '100%' }}>
                完成並回到首頁
            </button>
        </div>
    );
}

export default function WoundsResultPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>載入中...</div>}>
            <WoundsResultContent />
        </Suspense>
    );
}

const styles = {
    pageTitle: {
        fontSize: '1.15rem', margin: '0 0 0.3rem', color: '#fff', fontWeight: 700,
    },
    spinner: {
        width: '36px', height: '36px',
        border: '3px solid rgba(255,255,255,0.08)',
        borderTop: '3px solid #ff9a9e',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '3rem auto 0',
    },
    glassCard: {
        position: 'relative',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '1.3rem',
        borderRadius: '16px',
        overflow: 'hidden',
    },
    cardTitle: {
        fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.8rem', marginTop: 0,
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontWeight: 600,
    },
    recommendAccent: {
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '4px',
        background: 'linear-gradient(180deg, #2ed573, #5ce0d8)',
        borderRadius: '4px 0 0 4px',
    },
    primaryBtn: {
        display: 'inline-block',
        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
        color: '#fff',
        padding: '0.9rem 2rem',
        borderRadius: '50px',
        border: 'none',
        fontWeight: 700,
        fontSize: '1rem',
        cursor: 'pointer',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(255,154,158,0.3)',
    },
    outlineBtn: {
        background: 'transparent',
        border: '1px solid rgba(255,154,158,0.3)',
        color: '#ff9a9e',
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 600,
        textDecoration: 'none',
        textAlign: 'center',
        flex: 1,
        display: 'inline-block',
    },
};
