'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@vitera/lib';
import { AppHeader } from '@cofit/ui';

const ACCENT = 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)';

const cardBase = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '20px',
    marginBottom: '16px',
};

const iconBox = (bg) => ({
    fontSize: '26px',
    background: bg,
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
});

export default function IntimacyClientDashboard({ initialAssessments }) {
    const router = useRouter();
    const { user } = useAuth();
    const latest = initialAssessments[0];

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <AppHeader backHref="/" title="私密健康顧問" accent={ACCENT} />

            <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 0' }}>

                {/* AI Icebreaker */}
                <div style={{
                    ...cardBase,
                    background: 'rgba(190, 18, 60, 0.08)',
                    border: '1px solid rgba(190, 18, 60, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '56px', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }}>
                        💖
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#ff6b8a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✨ 來自專屬顧問的訊息
                        </h2>
                        <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                            {user ? `${user.displayName}，` : ''}您好～許多人都會面臨一些生理上的小困擾，這往往與壓力或疲勞有關。別擔心！在這裡，您可以安心地探索身體的需求，我會為您提供最科學的照顧建議！
                        </p>
                    </div>
                </div>

                {/* Latest Status */}
                {latest && (
                    <div style={{ ...cardBase, border: '1px solid rgba(190, 18, 60, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#ff6b8a', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                                最近的健康評估
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                {new Date(latest.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {latest.ai_summary || '您已完成初步評估，請查看詳細專屬建議。'}
                        </p>
                        <button
                            onClick={() => router.push(`/intimacy/result?id=${latest.id}`)}
                            style={{
                                width: '100%',
                                padding: '13px',
                                borderRadius: '14px',
                                border: '1px solid rgba(190, 18, 60, 0.3)',
                                background: 'rgba(190, 18, 60, 0.12)',
                                color: '#ff6b8a',
                                fontWeight: 700,
                                fontSize: '14px',
                                fontFamily: 'inherit',
                            }}
                        >
                            檢視完整分析報告
                        </button>
                    </div>
                )}

                {/* Explore Concerns */}
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    探索您的困擾
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {[
                        { concern: 'vitality', icon: '🔋', bg: 'rgba(99,102,241,0.15)', title: '活力與恆久度', desc: '希望在關鍵時刻表現更穩定？' },
                        { concern: 'comfort',  icon: '💧', bg: 'rgba(190,18,60,0.12)',  title: '私密舒適度',   desc: '親密時刻感到乾澀或難以進入狀態？' },
                        { concern: 'anxiety',  icon: '🌿', bg: 'rgba(16,185,129,0.12)', title: '壓力與表現焦慮', desc: '因為工作壓力大導致對親密關係焦慮？' },
                    ].map(({ concern, icon, bg, title, desc }) => (
                        <div
                            key={concern}
                            onClick={() => router.push(`/intimacy/assess?concern=${concern}`)}
                            style={{
                                ...cardBase,
                                marginBottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                            }}
                        >
                            <div style={iconBox(bg)}>{icon}</div>
                            <div>
                                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f0f0f5', marginBottom: '3px' }}>{title}</h4>
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Daily Tools */}
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    日常專屬保養
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
                    {[
                        { path: '/intimacy/training', icon: '🧘', bg: 'rgba(190,18,60,0.12)', title: '骨盆底肌訓練器', desc: '強健核心，提升控制力' },
                        { path: '/supplements',       icon: '💊', bg: 'rgba(124,92,252,0.15)', title: '體力支援保健',   desc: '瑪卡、精氨酸日常補給' },
                    ].map(({ path, icon, bg, title, desc }) => (
                        <button
                            key={path}
                            onClick={() => router.push(path)}
                            style={{
                                ...cardBase,
                                marginBottom: 0,
                                padding: '18px 16px',
                                textAlign: 'left',
                                fontFamily: 'inherit',
                            }}
                        >
                            <div style={{ ...iconBox(bg), marginBottom: '12px' }}>{icon}</div>
                            <span style={{ display: 'block', color: '#f0f0f5', fontWeight: 700, fontSize: '14px' }}>{title}</span>
                            <span style={{ display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '4px' }}>{desc}</span>
                        </button>
                    ))}
                </div>

                {/* Past Records */}
                {initialAssessments.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                            過去的紀錄
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {initialAssessments.slice(1).map(record => (
                                <div
                                    key={record.id}
                                    onClick={() => router.push(`/intimacy/result?id=${record.id}`)}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '14px',
                                        padding: '14px 16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f0f0f5', display: 'block' }}>
                                            {new Date(record.created_at).toLocaleDateString()}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', display: 'block', marginTop: 2 }}>AI 專屬分析報告</span>
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.1rem' }}>→</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
