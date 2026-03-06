'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';

export default function BonesDashboard() {
  const [latestAssessment, setLatestAssessment] = useState(null);

  useEffect(() => {
    apiFetch('/api/footcare/assessments')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) setLatestAssessment(list[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-[600px] mx-auto flex flex-col gap-6 pb-8">

      <Link href="/scan" className="no-underline">
        <div className="bg-gradient-to-br from-[rgba(82,194,52,0.2)] to-[rgba(6,23,0,0.4)] border border-[rgba(168,255,120,0.3)] rounded-[16px] p-6 flex items-center gap-4 relative overflow-hidden">
          <div className="text-[2.5rem]">📷</div>
          <div className="flex-1">
            <h3 className="m-0 mb-1 text-[#a8ff78] text-[1.1rem]">AI 拇趾外翻檢測</h3>
            <p className="m-0 text-white/80 text-[0.85rem]">只要拍攝足部俯拍照，即可透過 AI 分析外翻角度與嚴重程度。</p>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/assess" className="no-underline">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[16px] p-5 text-center flex flex-col items-center gap-2">
            <div className="text-[2rem]">📝</div>
            <h3 className="m-0 text-white text-[1rem] font-semibold">今日痛點評估</h3>
            <p className="m-0 text-white/50 text-[0.75rem]">紀錄疼痛與活動力</p>
          </div>
        </Link>
        <Link href="/history" className="no-underline">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[16px] p-5 text-center flex flex-col items-center gap-2">
            <div className="text-[2rem]">📸</div>
            <h3 className="m-0 text-white text-[1rem] font-semibold">檢測歷程追蹤</h3>
            <p className="m-0 text-white/50 text-[0.75rem]">追蹤外翻角度變化</p>
          </div>
        </Link>
      </div>

      <div>
        <h3 className="text-[1.1rem] mb-4 text-white flex items-center gap-2">
          <span>📊</span> 近期狀態
        </h3>
        {latestAssessment ? (
          <div className="bg-black/20 rounded-[12px] p-4 border border-white/[0.05]">
            <div className="flex justify-between mb-2">
              <span className="text-white/50 text-[0.85rem]">最新紀錄 {latestAssessment.date}</span>
              <span className="font-bold" style={{ color: latestAssessment.nrs_pain_score > 3 ? '#ff9a9e' : '#a8ff78' }}>
                疼痛指數: {latestAssessment.nrs_pain_score}/10
              </span>
            </div>
            {latestAssessment.pain_locations && (
              <div className="flex gap-2 flex-wrap mt-2">
                {latestAssessment.pain_locations.split(',').map((loc, idx) => (
                  <span key={idx} className="bg-white/10 py-[0.2rem] px-2 rounded text-[0.8rem]">{loc.trim()} 📍</span>
                ))}
              </div>
            )}
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/[0.05]">
              <div className="flex-1">
                <div className="text-[0.75rem] text-white/50 mb-1">今日活動</div>
                <div className="text-[1.1rem] text-white">{latestAssessment.steps_count} 步</div>
              </div>
              <div className="flex-1 border-l border-white/[0.05] pl-4">
                <div className="text-[0.75rem] text-white/50 mb-1">累積久站</div>
                <div className="text-[1.1rem] text-white">{latestAssessment.standing_hours} 小時</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-black/20 rounded-[12px] p-8 border border-dashed border-white/10 text-center">
            <p className="text-white/50 m-0 text-[0.9rem]">目前尚無評估資料。<br />點擊上方「今日痛點評估」開始紀錄。</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-[rgba(168,255,120,0.1)] to-[rgba(120,255,214,0.1)] border border-[rgba(168,255,120,0.2)] rounded-[16px] p-5 mt-4">
        <h3 className="m-0 mb-2 text-[#a8ff78] text-[1rem]">🛍️ 專屬照護推薦</h3>
        <p className="m-0 mb-4 text-white/70 text-[0.85rem]">依據您的評估紀錄，建議使用夜間夾板或足弓支撐墊。現在結帳輸入 <strong className="text-white">CARE20</strong> 享專屬折扣。</p>
        <button className="w-full py-3 rounded-[8px] border-none bg-[#a8ff78] text-[#1a3630] font-bold cursor-pointer">前往商城選購</button>
      </div>
    </div>
  );
}
