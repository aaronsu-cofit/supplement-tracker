'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';

export default function IntimacyClientDashboard({ initialAssessments }) {
    const router = useRouter();
    const { user } = useAuth();
    const latest = initialAssessments[0];

    return (
        <div className="page-container" style={{ paddingBottom: '120px' }}>
            {/* Header */}
            <div className="page-header" style={{ textAlign: 'center', marginTop: '1rem' }}>
                <h1 className="page-title" style={{
                    backgroundImage: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)',
                    marginBottom: '0.5rem'
                }}>
                    私密健康顧問
                </h1>
                <p className="page-subtitle" style={{ color: '#64748B' }}>
                    專屬您的溫馨無壓力空間 ✨
                </p>
            </div>

            {/* AI Icebreaker */}
            <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid #FFF0F5'
            }}>
                <div style={{
                    position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.2, zIndex: 0
                }}>💖</div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#BE123C', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✨</span> 來自專屬顧問的訊息
                    </h2>
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#475569', fontWeight: '500' }}>
                        {user ? `${user.displayName}，` : ''}您好～許多人都會面臨一些生理上的小困擾，這往往與壓力或疲勞有關。別擔心！在這裡，您可以安心地探索身體的需求，我會為您提供最科學的照顧建議！
                    </p>
                </div>
            </div>

            {/* Latest Status */}
            {latest && (
                <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    padding: '20px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                    marginBottom: '24px',
                    border: '2px solid #FFE4E6'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '13px', color: '#E11D48', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
                            ● 最近的建康評價
                        </h3>
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>
                            {new Date(latest.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', lineHeight: 1.5, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {latest.ai_summary || '您已完成初步評估，請查看詳細專屬建議。'}
                    </p>
                    <button
                        className="btn"
                        onClick={() => router.push(`/intimacy/result?id=${latest.id}`)}
                        style={{
                            width: '100%',
                            background: '#FFF1F2',
                            color: '#BE123C',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: '700',
                            padding: '14px'
                        }}
                    >
                        檢視完整分析報告
                    </button>
                </div>
            )}

            {/* Guided Discovery - Situational Cards */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', color: '#1E293B' }}>探索您的困擾</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div onClick={() => router.push('/intimacy/assess?concern=vitality')} style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '28px', background: '#EEF2FF', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🔋
                    </div>
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>活力與恆久度</h4>
                        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>希望在關鍵時刻表現更穩定？</p>
                    </div>
                </div>

                <div onClick={() => router.push('/intimacy/assess?concern=comfort')} style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '28px', background: '#FFF1F2', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        💧
                    </div>
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>私密舒適度</h4>
                        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>親密時刻感到乾澀或難以進入狀態？</p>
                    </div>
                </div>

                <div onClick={() => router.push('/intimacy/assess?concern=anxiety')} style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '28px', background: '#F0FDF4', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🌪️
                    </div>
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>壓力與表現焦慮</h4>
                        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>因為工作壓力大導致對親密關係焦慮？</p>
                    </div>
                </div>
            </div>

            {/* Tools Area */}
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', color: '#1E293B' }}>日常專屬保養</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                <button
                    onClick={() => router.push('/intimacy/training')}
                    style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', textAlign: 'left', cursor: 'pointer', border: '1px solid #F1F5F9', boxShadow: '0 8px 16px rgba(0,0,0,0.03)' }}
                >
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🧘‍♀️</span>
                    <span style={{ display: 'block', color: '#1E293B', fontWeight: '800', fontSize: '15px' }}>骨盆底肌訓練器</span>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>強健核心，提升控制力</span>
                </button>
                <button
                    onClick={() => router.push('/supplements')}
                    style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', textAlign: 'left', cursor: 'pointer', border: '1px solid #F1F5F9', boxShadow: '0 8px 16px rgba(0,0,0,0.03)' }}
                >
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>💊</span>
                    <span style={{ display: 'block', color: '#1E293B', fontWeight: '800', fontSize: '15px' }}>體力支援保健</span>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>瑪卡、精氨酸日常補給</span>
                </button>
            </div>

            {/* History List */}
            {initialAssessments.length > 0 && (
                <div style={{ width: '100%' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#94A3B8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        過去的紀錄
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {initialAssessments.slice(1).map(record => (
                            <div key={record.id} onClick={() => router.push(`/intimacy/result?id=${record.id}`)} style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #F8FAFC' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#334155' }}>{new Date(record.created_at).toLocaleDateString()}</span>
                                    <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '600' }}>AI 專屬分析報告</span>
                                </div>
                                <span style={{ color: '#CBD5E1', fontWeight: 'bold' }}>→</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
