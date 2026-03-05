'use client';
import { apiFetch } from '@vitera/lib';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const CONCERNS = {
    male: [
        { id: 'vitality', label: '硬度不足或持久度不如預期', emoji: '🔋' },
        { id: 'desire', label: '性慾低下或提不起勁', emoji: '📉' },
        { id: 'anxiety', label: '表現焦慮或緊張', emoji: '🌪️' },
        { id: 'other', label: '其他', emoji: '💭' }
    ],
    female: [
        { id: 'comfort', label: '私密處乾澀或親密時感到不適', emoji: '💧' },
        { id: 'desire', label: '提不起勁或難以進入狀態', emoji: '🥀' },
        { id: 'climax', label: '難以達到高潮', emoji: '🏔️' },
        { id: 'other', label: '其他', emoji: '💭' }
    ],
    other: [
        { id: 'desire', label: '性慾低下', emoji: '📉' },
        { id: 'anxiety', label: '親密關係焦慮', emoji: '🌪️' },
        { id: 'pain', label: '生理不適', emoji: '🩹' },
        { id: 'other', label: '其他', emoji: '💭' }
    ]
};

function AssessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const concernParam = searchParams.get('concern');

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [gender, setGender] = useState('');
    const [primaryConcern, setPrimaryConcern] = useState('');
    const [stressLevel, setStressLevel] = useState(5);
    const [sleepHours, setSleepHours] = useState(7);
    const [intimacySatisfaction, setIntimacySatisfaction] = useState(5); // newly added for nuances

    const handleNext = () => setStep(step + 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const aiRes = await apiFetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'sexual_health',
                    image: 'data:image/jpeg;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', // dummy
                    prompt: `患者性別：${gender}\n主要困擾：${primaryConcern}\n近期壓力指數(1-10)：${stressLevel}\n平均睡眠時間：${sleepHours}小時\n目前親密關係/生理狀況滿意度(1-10)：${intimacySatisfaction}\n\n請根據以上資訊，給予極度包容、不帶批判的深度病因解析，並提供非藥物性建議(如凱格爾運動、正念)及保健品建議。`
                }),
            });
            const aiData = await aiRes.json();
            const aiSummary = aiData.success ? aiData.ai_summary : '目前無法取得分析建議，請稍後再試。';

            const payload = {
                gender,
                primary_concern: primaryConcern,
                assessment_data: { stressLevel, sleepHours, intimacySatisfaction },
                ai_summary: aiSummary
            };

            const res = await apiFetch('/api/intimacy/assessments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success && data.assessment?.id) {
                router.push(`/intimacy/result?id=${data.assessment.id}`);
            } else {
                router.push('/intimacy');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container" style={{ paddingBottom: '80px', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <button onClick={() => router.back()} style={{ background: '#ffffff', border: '1px solid #F1F5F9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '8px 12px', color: '#64748B', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    <span style={{ fontSize: '16px' }}>←</span> 返回
                </button>
                <div style={{ color: '#E11D48', fontSize: '12px', tracking: 'widest', textTransform: 'uppercase', fontWeight: '800' }}>
                    ● 專屬私密評估 {step} / 3
                </div>
            </div>

            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {step === 1 && (
                    <div>
                        <h2 className="page-title" style={{ backgroundImage: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)', marginBottom: '16px', fontSize: '24px' }}>
                            您認同的生理性別？
                        </h2>
                        <p className="page-subtitle" style={{ marginBottom: '32px', lineHeight: 1.6, color: '#475569', fontWeight: '500' }}>
                            這將幫助 AI 顧問了解您的生理結構，提供精準且專屬的醫學建議。所有資訊皆在裝置與伺服器間進行軍規級加密，絕不外洩。
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[{ id: 'male', label: '👨 男性 (Male)' }, { id: 'female', label: '👩 女性 (Female)' }, { id: 'other', label: '🧑 其他 / 不願透露' }].map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => { setGender(g.id); handleNext(); }}
                                    style={{
                                        width: '100%', textAlign: 'left', padding: '20px', cursor: 'pointer',
                                        fontSize: '16px', fontWeight: '700', color: '#1E293B',
                                        border: '1px solid #F1F5F9', background: '#ffffff',
                                        borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
                        <h2 className="page-title" style={{ backgroundImage: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)', marginBottom: '16px', fontSize: '24px' }}>
                            您目前最大的困擾是？
                        </h2>
                        <p className="page-subtitle" style={{ marginBottom: '32px', color: '#475569', fontWeight: '500' }}>
                            請放心點選最貼近您感受的選項。
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(CONCERNS[gender] || CONCERNS.other).map(c => {
                                const isRecommended = concernParam === c.id;
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => { setPrimaryConcern(c.label); handleNext(); }}
                                        style={{
                                            width: '100%', textAlign: 'left', padding: '20px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            border: isRecommended ? '2px solid #FFE4E6' : '1px solid #F1F5F9',
                                            background: isRecommended ? '#FFF1F2' : '#ffffff',
                                            borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        <div style={{ fontSize: '24px', background: '#ffffff', padding: '10px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>{c.emoji}</div>
                                        <div style={{ flex: 1, fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>
                                            {c.label}
                                        </div>
                                        {isRecommended && <div style={{ fontSize: '11px', color: '#BE123C', background: '#ffffff', padding: '4px 8px', borderRadius: '12px', fontWeight: '700' }}>為您推薦</div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
                        <h2 className="page-title" style={{ backgroundImage: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)', marginBottom: '16px', fontSize: '24px' }}>
                            生活狀態與心理滿意度
                        </h2>
                        <p className="page-subtitle" style={{ marginBottom: '32px', color: '#475569', fontWeight: '500' }}>
                            健康與壓力、睡眠息息相關，了解您的身心狀態能極大幫助我們找出根本原因。
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Stress Slider */}
                            <div style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.03)', border: '1px solid #F8FAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>近期壓力指數</span>
                                    <span style={{ color: '#E11D48', fontWeight: '800', background: '#FFF1F2', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>{stressLevel} / 10</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{ fontSize: '24px' }}>😌</span>
                                    <input
                                        type="range" min="1" max="10" value={stressLevel} onChange={(e) => setStressLevel(e.target.value)}
                                        style={{ flex: 1, accentColor: '#E11D48' }}
                                    />
                                    <span style={{ fontSize: '24px' }}>🤯</span>
                                </div>
                            </div>

                            {/* Intimacy Satisfaction Slider */}
                            <div style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.03)', border: '1px solid #F8FAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>親密滿意度</span>
                                    <span style={{ color: '#E11D48', fontWeight: '800', background: '#FFF1F2', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>{intimacySatisfaction} / 10</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{ fontSize: '24px' }}>🥀</span>
                                    <input
                                        type="range" min="1" max="10" value={intimacySatisfaction} onChange={(e) => setIntimacySatisfaction(e.target.value)}
                                        style={{ flex: 1, accentColor: '#E11D48' }}
                                    />
                                    <span style={{ fontSize: '24px' }}>✨</span>
                                </div>
                            </div>

                            {/* Sleep Slider */}
                            <div style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.03)', border: '1px solid #F8FAFC' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>平均每晚睡眠</span>
                                    <span style={{ color: '#E11D48', fontWeight: '800', background: '#FFF1F2', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>{sleepHours} 小時</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{ fontSize: '24px' }}>🥱</span>
                                    <input
                                        type="range" min="3" max="12" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)}
                                        style={{ flex: 1, accentColor: '#E11D48' }}
                                    />
                                    <span style={{ fontSize: '24px' }}>😴</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '48px' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="btn"
                                style={{
                                    width: '100%',
                                    padding: '18px',
                                    background: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)',
                                    color: '#ffffff',
                                    fontWeight: '800',
                                    fontSize: '16px',
                                    opacity: isSubmitting ? 0.7 : 1,
                                    border: 'none',
                                    borderRadius: '20px',
                                    boxShadow: '0 8px 20px rgba(225, 29, 72, 0.3)'
                                }}
                            >
                                {isSubmitting ? 'AI 專屬顧問分析中...' : '送出隱私評估'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                input[type=range] {
                    -webkit-appearance: none;
                    width: 100%;
                    background: transparent;
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                }
                input[type=range]:focus {
                    outline: none;
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 8px;
                    cursor: pointer;
                    background: #F1F5F9;
                    border-radius: 8px;
                }
                input[type=range]::-webkit-slider-thumb {
                    height: 24px;
                    width: 24px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 3px solid #E11D48;
                    cursor: pointer;
                    -webkit-appearance: none;
                    margin-top: -8px;
                    box-shadow: 0 4px 10px rgba(225, 29, 72, 0.2);
                }
            `}</style>
        </div>
    );
}

export default function IntimacyAssessPage() {
    return (
        <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}>
            <AssessContent />
        </Suspense>
    );
}
