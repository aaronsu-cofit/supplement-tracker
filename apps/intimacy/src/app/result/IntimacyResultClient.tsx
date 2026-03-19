'use client';

import { useRouter } from 'next/navigation';

export default function IntimacyResultClient({ initialData }) {
    const router = useRouter();

    if (!initialData) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>找不到該筆評估資料。</p>
                <button onClick={() => router.push('/intimacy')} className="btn btn-ghost" style={{ marginTop: '16px' }}>返回主控台</button>
            </div>
        );
    }

    // Determine specific supplement recommendations based on primary concern
    let supplementTitle = "體力與能量支援";
    let supplementDesc = "日常補給，維持最佳狀態";
    let supplementIcon = "💊";

    if (initialData.primary_concern?.includes('硬度') || initialData.primary_concern?.includes('持久') || initialData.primary_concern?.includes('活力')) {
        supplementTitle = "一氧化氮前驅物與體力支援";
        supplementDesc = "建議補充左旋精氨酸 (L-Arginine) 或黑瑪卡，幫助循環與恆久度。";
        supplementIcon = "⚡";
    } else if (initialData.primary_concern?.includes('乾澀') || initialData.primary_concern?.includes('不適') || initialData.primary_concern?.includes('舒適')) {
        supplementTitle = "私密水潤與舒適保養";
        supplementDesc = "建議使用高階玻尿酸水性潤滑液，並可補充女性專屬益生菌維持平衡。";
        supplementIcon = "💧";
    } else if (initialData.primary_concern?.includes('焦慮') || initialData.primary_concern?.includes('壓力')) {
        supplementTitle = "放鬆與神經舒緩";
        supplementDesc = "建議補充 GABA、茶胺酸或優質鎂，幫助神經放鬆，專注當下。";
        supplementIcon = "🌿";
    }

    return (
        <div className="page-container" style={{ paddingBottom: '120px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', marginTop: '12px' }}>
                <button onClick={() => router.push('/intimacy')} style={{ background: '#ffffff', border: '1px solid #F1F5F9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '8px 12px', color: '#64748B', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    <span style={{ fontSize: '16px' }}>←</span> 返回主控台
                </button>
                <div style={{ color: '#E11D48', fontSize: '12px', tracking: 'widest', textTransform: 'uppercase', fontWeight: '800' }}>
                    ● 專屬顧問報告
                </div>
            </div>

            {/* AI Diagnosis Report */}
            <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                marginBottom: '32px',
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid #FFF0F5'
            }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.1, zIndex: 0 }}>🩺</div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#BE123C', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✨</span> 醫師解析與建議
                    </h2>
                    <div style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                        {initialData.ai_summary || "AI 尚未生成分析報告。"}
                    </div>
                </div>
            </div>

            {/* Action Plan */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯</span> 專屬行動方案
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Action 1: Training */}
                <div
                    onClick={() => router.push('/intimacy/training')}
                    style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #EEF2FF' }}
                >
                    <div style={{ fontSize: '28px', background: '#EEF2FF', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🧘‍♀️
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>非藥物性物理訓練</h4>
                        <p style={{ fontSize: '13px', color: '#6366F1', fontWeight: '500' }}>開始凱格爾骨盆底肌訓練，提升控制力與核心強度。</p>
                    </div>
                    <div style={{ color: '#818CF8', fontWeight: 'bold' }}>→</div>
                </div>

                {/* Action 2: Supplements (Commerce Routing) */}
                <div
                    onClick={() => router.push('/supplements')}
                    style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #FFF1F2' }}
                >
                    <div style={{ fontSize: '28px', background: '#FFF1F2', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {supplementIcon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>{supplementTitle}</h4>
                        <p style={{ fontSize: '13px', color: '#E11D48', fontWeight: '500' }}>{supplementDesc}</p>
                    </div>
                    <div style={{ color: '#FB7185', fontWeight: 'bold' }}>→</div>
                </div>

                {/* Action 3: Medical / Clinic Referral */}
                <div
                    onClick={() => window.open('https://example.com/clinic-booking', '_blank')}
                    style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}
                >
                    <div style={{ fontSize: '28px', background: '#F8FAFC', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🏥
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>實體醫療轉介</h4>
                        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>一鍵預約隱私度極高的合作泌尿科或婦產科診所。</p>
                    </div>
                    <div style={{ color: '#CBD5E1', fontWeight: 'bold' }}>↗</div>
                </div>
            </div>
        </div>
    );
}
