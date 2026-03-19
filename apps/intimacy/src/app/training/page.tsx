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
        <div className="page-container pb-24 flex flex-col min-h-screen pt-6">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={() => router.back()}
                    className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-[12px] px-3 py-2 text-slate-500 cursor-pointer text-[13px] flex items-center gap-1 font-semibold"
                >
                    <span className="text-[16px]">←</span> 返回
                </button>
                <div className="text-[#9d4edd] text-[12px] uppercase font-extrabold tracking-widest">
                    ● 每日訓練計畫
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center">
                <h2 className="page-title mb-2 text-[26px]" style={{ backgroundImage: 'linear-gradient(135deg, #c77dff 0%, #7b2cbf 100%)' }}>
                    凱格爾訓練器
                </h2>
                <p className="page-subtitle text-center mb-12 max-w-[300px] text-slate-600 font-medium">
                    強化骨盆底肌群，提升核心控制力與雙方親密滿意度。請找個舒適的位置坐下。
                </p>

                {/* Animated Training Circle */}
                <div className="relative w-[280px] h-[280px] flex items-center justify-center mb-12">
                    {/* Outer glow ring */}
                    <div
                        className="absolute inset-0 rounded-full border-2 border-[rgba(157,78,221,0.4)]"
                        style={{
                            transform: isContracting ? 'scale(0.8)' : 'scale(1.15)',
                            opacity: isContracting ? 1 : 0.2,
                            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 1s ease'
                        }}
                    />
                    {/* Inner active ring */}
                    <div
                        className="absolute inset-6 rounded-full border-[4px] border-[rgba(157,78,221,0.6)]"
                        style={{
                            transform: isContracting ? 'scale(0.8)' : 'scale(1.05)',
                            opacity: isContracting ? 1 : 0.4,
                            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1) 0.1s, opacity 1s ease'
                        }}
                    />

                    {/* Center Core */}
                    <div
                        className="z-10 w-[140px] h-[140px] rounded-full flex items-center justify-center"
                        style={{
                            background: isContracting ? 'linear-gradient(135deg, #9d4edd, #5a189a)' : '#ffffff',
                            boxShadow: isContracting ? '0 0 40px rgba(157, 78, 221, 0.6)' : '0 8px 24px rgba(157, 78, 221, 0.1)',
                            transform: isContracting ? 'scale(0.9)' : 'scale(1)',
                            border: isContracting ? 'none' : '2px solid #F3E8FF',
                            transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div className="text-center">
                            <span
                                className="block text-[24px] font-extrabold tracking-[2px]"
                                style={{ color: isContracting ? '#ffffff' : '#9d4edd' }}
                            >
                                {isActive ? (isContracting ? '用力收縮' : '放鬆休息') : '準備'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="font-mono text-[40px] font-extrabold text-slate-800 mb-8 tracking-[4px]">
                    {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}
                </div>

                <button
                    onClick={() => setIsActive(!isActive)}
                    className="btn w-full py-[18px] text-[16px] font-extrabold rounded-[20px] cursor-pointer transition-all duration-300"
                    style={{
                        background: isActive ? '#ffffff' : 'linear-gradient(135deg, #9d4edd, #7b2cbf)',
                        color: isActive ? '#ff6b6b' : '#ffffff',
                        border: isActive ? '2px solid #FFE4E6' : 'none',
                        boxShadow: isActive ? 'none' : '0 8px 20px rgba(157, 78, 221, 0.3)',
                    }}
                >
                    {isActive ? '停止並紀錄' : '開始日常鍛鍊 (每日五分鐘)'}
                </button>
            </div>
        </div>
    );
}
