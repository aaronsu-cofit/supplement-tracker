'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KegelTrainingPage() {
    const router = useRouter();
    const [isActive, setIsActive] = useState(false);
    const [isContracting, setIsContracting] = useState(false);
    const [seconds, setSeconds] = useState(0);

    // alternate 5 seconds contract, 5 seconds relax
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => {
                    const next = s + 1;
                    if (next % 10 < 5) {
                        setIsContracting(true);
                    } else {
                        setIsContracting(false);
                    }
                    return next;
                });
            }, 1000);
        } else {
            clearInterval(interval);
            setIsContracting(false);
            setSeconds(0);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    return (
        <div className="page-container" style={{ paddingBottom: '100px', display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <button onClick={() => router.back()} style={{ background: '#ffffff', border: '1px solid #F1F5F9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', borderRadius: '12px', padding: '8px 12px', color: '#64748B', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    <span style={{ fontSize: '16px' }}>←</span> 返回
                </button>
                <div style={{ color: '#9d4edd', fontSize: '12px', tracking: 'widest', textTransform: 'uppercase', fontWeight: '800' }}>
                    ● 每日訓練計畫
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h2 className="page-title" style={{ backgroundImage: 'linear-gradient(135deg, #c77dff 0%, #7b2cbf 100%)', marginBottom: '8px', fontSize: '26px' }}>
                    凱格爾訓練器
                </h2>
                <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '300px', color: '#475569', fontWeight: '500' }}>
                    強化骨盆底肌群，提升核心控制力與雙方親密滿意度。請找個舒適的位置坐下。
                </p>

                {/* Animated Training Circle */}
                <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '48px' }}>
                    {/* Outer glow ring */}
                    <div
                        style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            border: '2px solid rgba(157, 78, 221, 0.4)',
                            transform: isContracting ? 'scale(0.8)' : 'scale(1.15)',
                            opacity: isContracting ? 1 : 0.2,
                            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 1s ease'
                        }}
                    />
                    {/* Inner active ring */}
                    <div
                        style={{
                            position: 'absolute', inset: '24px', borderRadius: '50%',
                            border: '4px solid rgba(157, 78, 221, 0.6)',
                            transform: isContracting ? 'scale(0.8)' : 'scale(1.05)',
                            opacity: isContracting ? 1 : 0.4,
                            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1) 0.1s, opacity 1s ease'
                        }}
                    />

                    {/* Center Core */}
                    <div
                        style={{
                            zIndex: 10, width: '140px', height: '140px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isContracting ? 'linear-gradient(135deg, #9d4edd, #5a189a)' : '#ffffff',
                            boxShadow: isContracting ? '0 0 40px rgba(157, 78, 221, 0.6)' : '0 8px 24px rgba(157, 78, 221, 0.1)',
                            transform: isContracting ? 'scale(0.9)' : 'scale(1)',
                            border: isContracting ? 'none' : '2px solid #F3E8FF',
                            transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <span style={{
                                display: 'block', fontSize: '24px', fontWeight: '800', letterSpacing: '2px',
                                color: isContracting ? '#ffffff' : '#9d4edd'
                            }}>
                                {isActive ? (isContracting ? '用力收縮' : '放鬆休息') : '準備'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{
                    fontFamily: 'monospace', fontSize: '40px', fontWeight: '800',
                    color: '#1E293B', marginBottom: '32px', letterSpacing: '4px'
                }}>
                    {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}
                </div>

                <button
                    onClick={() => setIsActive(!isActive)}
                    className="btn"
                    style={{
                        width: '100%', padding: '18px', fontSize: '16px', fontWeight: '800', borderRadius: '20px',
                        background: isActive ? '#ffffff' : 'linear-gradient(135deg, #9d4edd, #7b2cbf)',
                        color: isActive ? '#ff6b6b' : '#ffffff',
                        border: isActive ? '2px solid #FFE4E6' : 'none',
                        boxShadow: isActive ? 'none' : '0 8px 20px rgba(157, 78, 221, 0.3)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isActive ? '停止並紀錄' : '開始日常鍛鍊 (每日五分鐘)'}
                </button>
            </div>
        </div>
    );
}
