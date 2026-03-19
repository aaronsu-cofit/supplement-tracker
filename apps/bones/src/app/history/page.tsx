'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { History, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';

const SEVERITY_CLASSES = {
    normal:   { border: 'border-emerald-400', badge: 'bg-emerald-50 text-emerald-700', text: '正常' },
    mild:     { border: 'border-amber-400',   badge: 'bg-amber-50 text-amber-700',     text: '輕度' },
    moderate: { border: 'border-red-400',     badge: 'bg-red-50 text-red-600',         text: '中度' },
    severe:   { border: 'border-red-500',     badge: 'bg-red-50 text-red-700',         text: '重度' },
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
        <div className="p-5 max-w-[600px] mx-auto">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/" className="flex items-center gap-1 text-blue-600 no-underline text-[0.88rem] mb-2 hover:text-blue-700 transition-colors">
                        <ChevronLeft size={16} />
                        返回中心
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center">
                            <History size={20} className="text-blue-600" />
                        </div>
                        <h2 className="text-[1.35rem] font-bold m-0 text-slate-800">檢測歷程追蹤</h2>
                    </div>
                </div>
            </header>

            {images.length === 0 ? (
                <div className="text-center py-14 px-6 bg-slate-50 rounded-[16px] border border-dashed border-slate-300">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <FolderOpen size={32} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 text-[0.92rem] mb-1 font-medium">尚無檢測紀錄</p>
                    <p className="text-slate-400 text-[0.82rem] mb-6">完成第一次 AI 攝影檢測後<br />紀錄將顯示於此</p>
                    <Link href="/scan">
                        <button className="px-6 py-3 rounded-[10px] border-none bg-blue-600 text-white font-semibold cursor-pointer hover:bg-blue-700 transition-colors min-h-[44px]">
                            立即開始檢測
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {images.map(img => {
                        const sev = SEVERITY_CLASSES[img.ai_severity] || SEVERITY_CLASSES.normal;
                        const dateObj = new Date(img.logged_at);
                        const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

                        return (
                            <Link href={`/result?id=${img.id}`} key={img.id} className="no-underline">
                                <div className="flex gap-4 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm p-4 rounded-[14px] border border-slate-200 items-center transition-all duration-200 cursor-pointer shadow-sm">
                                    <div className={`w-[78px] h-[78px] rounded-[10px] overflow-hidden shrink-0 border-2 ${sev.border}`}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.image_data} alt="History Thumb" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center min-w-0">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-slate-400 text-[0.8rem]">{dateStr}</span>
                                            <span className={`py-0.5 px-2.5 rounded-full text-[0.75rem] font-semibold ${sev.badge}`}>
                                                {sev.text}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 m-0 text-[0.88rem] leading-snug line-clamp-2">
                                            {img.ai_summary}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
