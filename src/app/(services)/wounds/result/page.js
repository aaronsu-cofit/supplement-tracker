'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function WoundsResultPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const woundId = searchParams.get('woundId');
    const logId = searchParams.get('logId'); // 'latest' or specific ID

    const [logData, setLogData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!woundId) return;
        const fetchLog = async () => {
            try {
                const res = await fetch(`/api/wounds/${woundId}/logs`);
                if (res.ok) {
                    const logs = await res.json();
                    if (logs.length > 0) {
                        setLogData(logs[0]); // Get the most recent log
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchLog();
    }, [woundId]);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>載入診斷結果中...</div>;
    }

    if (!logData) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h3>找不到紀錄</h3>
                <button onClick={() => router.push('/wounds')} style={primaryBtnStyle}>返回首頁</button>
            </div>
        );
    }

    // Determine the color logic based on the AI label (avoiding strict red/green light logic)
    const isConcern = logData.ai_status_label?.includes('留意') || logData.ai_status_label?.includes('諮詢');
    const statusColor = isConcern ? '#ffa502' : '#2ed573';
    
    return (
        <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>📊 分析報告</h2>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                拍攝時間：{new Date(logData.logged_at).toLocaleString('zh-TW')}
            </p>

            {/* AI Status Banner */}
            <div style={{
                background: statusColor,
                color: '#fff',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                boxShadow: `0 4px 10px ${statusColor}40`
            }}>
                <span style={{ fontSize: '2rem' }}>{isConcern ? '⚠️' : '✅'}</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{logData.ai_status_label || '復原進度符合預期'}</h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                        {isConcern ? '檢測到部分需要觀察的跡象，請保持乾燥並持續追蹤。' : '傷口看來處於穩定狀態，請繼續保持！'}
                    </p>
                </div>
            </div>

            {/* AI Detail Analysis */}
            <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.8rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                    🤖 影像與症狀智能分析
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {logData.ai_assessment_summary}
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#888' }}>
                    <span>疼痛指數: {logData.nrs_pain_score}/10</span>
                    <span>回報症狀: {logData.symptoms || '無'}</span>
                </div>
            </div>

            {/* Contextual Commerce / Recommendation */}
            <div style={{ background: '#fff', borderLeft: '4px solid #7bed9f', padding: '1.2rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#333', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💡</span> 護理師的叮嚀與推薦
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666', lineHeight: 1.5 }}>
                    目前的傷口狀態適合使用「抗菌保濕敷料」來維持微濕潤環境，這能幫助細胞游移並加速癒合，同時降低留疤機率。
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href="#" style={{ ...outlineBtnStyle, borderColor: '#2ed573', color: '#2ed573', flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                        觀看敷料教學
                    </a>
                    <a href="#" style={{ ...outlineBtnStyle, borderColor: '#7bed9f', background: '#eafff2', color: '#2ed573', flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                        🏥 前往合作藥局
                    </a>
                </div>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center', lineHeight: 1.4, marginBottom: '2rem' }}>
                免責聲明：本系統照片分析僅供日常居家照護參考，非正式醫療診斷依據。<br/>
                如有發燒、持續劇痛、大量異常滲出液等嚴重不適，請立即就醫。
            </p>

            <button onClick={() => router.push('/wounds')} style={{ ...primaryBtnStyle, width: '100%' }}>
                完成並回到首頁
            </button>
        </div>
    );
}

const primaryBtnStyle = {
    display: 'inline-block',
    background: '#ff6b6b',
    color: '#fff',
    padding: '1rem',
    borderRadius: '25px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(255,107,107,0.2)'
};

const outlineBtnStyle = {
    background: 'transparent',
    border: '1px solid #ff6b6b',
    color: '#ff6b6b',
    padding: '0.6rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-block'
};
