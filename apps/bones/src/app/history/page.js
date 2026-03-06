'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';

const SEVERITY_CLASSES = {
    normal:   { border: 'border-[#a8ff78]', badge: 'bg-[rgba(168,255,120,0.1)] text-[#a8ff78]', text: '正常' },
    mild:     { border: 'border-[#ffeb3b]', badge: 'bg-[rgba(255,235,59,0.1)] text-[#ffeb3b]', text: '輕度' },
    moderate: { border: 'border-[#ff9a9e]', badge: 'bg-[rgba(255,154,158,0.1)] text-[#ff9a9e]', text: '中度' },
    severe:   { border: 'border-[#ff4b4b]',  badge: 'bg-[rgba(255,75,75,0.1)] text-[#ff4b4b]',  text: '重度' },
};

export default function BonesHistoryPage() {
    const [images, setImages] = useState([]);

    useEffect(() => {
        apiFetch('/api/footcare/images')
            .then(r => r.ok ? r.json() : [])
            .then(data => setImages(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    return (
        <div className="p-6 max-w-[600px] mx-auto">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/bones" className="text-[#a8ff78] no-underline text-[0.9rem] mb-2 inline-block">
                        ← 返回中心
                    </Link>
                    <h2 className="text-[1.5rem] font-bold m-0">📸 檢測歷程追蹤</h2>
                </div>
            </header>

            {images.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/[0.03] rounded-[16px] border border-white/[0.05]">
                    <div className="text-[3rem] mb-4 opacity-50">📂</div>
                    <p className="text-white/70 text-[0.95rem]">您目前還沒有任何拇趾外翻 AI 攝影檢測紀錄。</p>
                    <Link href="/scan">
                        <button className="mt-6 px-6 py-3 rounded-[12px] border-none bg-[#a8ff78] text-[#1a3630] font-bold cursor-pointer">
                            立即建立第一筆檢測
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {images.map(img => {
                        const sev = SEVERITY_CLASSES[img.ai_severity] || SEVERITY_CLASSES.normal;
                        const dateObj = new Date(img.logged_at);
                        const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

                        return (
                            <Link href={`/result?id=${img.id}`} key={img.id} className="no-underline">
                                <div className="flex gap-4 bg-[var(--bg-card)] p-4 rounded-[16px] border border-white/[0.05] items-center transition-colors duration-200 cursor-pointer hover:bg-white/[0.06]">
                                    <div className={`w-[80px] h-[80px] rounded-[10px] overflow-hidden shrink-0 border ${sev.border}`}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.image_data} alt="History Thumb" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-white/50 text-[0.8rem]">{dateStr}</span>
                                            <span className={`py-[0.2rem] px-2 rounded text-[0.75rem] font-semibold ${sev.badge}`}>
                                                {sev.text}
                                            </span>
                                        </div>
                                        <p className="text-white m-0 text-[0.9rem] line-clamp-2">
                                            {img.ai_summary}
                                        </p>
                                    </div>
                                    <div className="text-white/30 pl-2">
                                        ➔
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
