"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@vitera/lib";
import {
  Camera,
  ClipboardList,
  History,
  Activity,
  PlayCircle,
  ShoppingBag,
  ChevronRight,
  X,
  MapPin,
} from "lucide-react";

const EDUCATION_VIDEOS = [
  {
    youtubeId: "hb8m0Y7D2l4",
    doctor: "主治醫師 陳永仁",
    title: "拇趾外翻的原因？",
    description: "了解拇趾外翻的成因",
  },
  {
    youtubeId: "nqqCtz6Orqk",
    doctor: "主治醫師 陳永仁",
    title: "扁平足的原因是什麼？",
    description: "了解扁平足的成因",
  },
];

export default function BonesDashboard() {
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    apiFetch("/api/footcare/assessments")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) setLatestAssessment(list[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-4 pb-8">

      {/* AI 檢測 CTA */}
      <Link href="/scan" className="no-underline">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[16px] p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
            <Camera size={24} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="m-0 mb-1 text-blue-700 text-[1.05rem] font-semibold">AI 拇趾外翻檢測</h3>
            <p className="m-0 text-slate-500 text-[0.82rem] leading-relaxed">拍攝足部俯拍照，AI 即時分析外翻角度與嚴重程度</p>
          </div>
          <ChevronRight size={18} className="text-slate-300 shrink-0" />
        </div>
      </Link>

      {/* 快速入口 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/assess" className="no-underline">
          <div className="bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all duration-200 border border-slate-200 rounded-[16px] p-5 flex flex-col gap-3 cursor-pointer min-h-[120px] shadow-sm">
            <div className="w-10 h-10 rounded-[12px] bg-blue-50 flex items-center justify-center">
              <ClipboardList size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="m-0 text-slate-800 text-[0.95rem] font-semibold mb-1">今日痛點評估</h3>
              <p className="m-0 text-slate-400 text-[0.75rem]">紀錄疼痛與活動力</p>
            </div>
          </div>
        </Link>
        <Link href="/history" className="no-underline">
          <div className="bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all duration-200 border border-slate-200 rounded-[16px] p-5 flex flex-col gap-3 cursor-pointer min-h-[120px] shadow-sm">
            <div className="w-10 h-10 rounded-[12px] bg-blue-50 flex items-center justify-center">
              <History size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="m-0 text-slate-800 text-[0.95rem] font-semibold mb-1">檢測歷程追蹤</h3>
              <p className="m-0 text-slate-400 text-[0.75rem]">追蹤外翻角度變化</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 近期狀態 */}
      <div>
        <h3 className="text-[0.8rem] mb-3 text-slate-400 font-semibold flex items-center gap-1.5 uppercase tracking-wide">
          <Activity size={14} className="text-blue-500" />
          近期狀態
        </h3>
        {latestAssessment ? (
          <div className="bg-white rounded-[14px] p-4 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-[0.82rem]">最新紀錄 {latestAssessment.date}</span>
              <span
                className="text-[0.82rem] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  color: latestAssessment.nrs_pain_score > 3 ? "#dc2626" : "#059669",
                  background: latestAssessment.nrs_pain_score > 3 ? "#fef2f2" : "#f0fdf4",
                }}
              >
                疼痛指數 {latestAssessment.nrs_pain_score}/10
              </span>
            </div>
            {latestAssessment.pain_locations && (
              <div className="flex gap-2 flex-wrap mb-3">
                {latestAssessment.pain_locations.split(",").map((loc, idx) => (
                  <span key={idx} className="flex items-center gap-1 bg-slate-100 py-1 px-2.5 rounded-full text-[0.78rem] text-slate-500">
                    <MapPin size={11} className="text-slate-400" />
                    {loc.trim()}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-3 border-t border-slate-100">
              <div className="flex-1 text-center">
                <div className="text-[0.72rem] text-slate-400 mb-1">今日步數</div>
                <div className="text-[1.05rem] font-semibold text-slate-800">{latestAssessment.steps_count.toLocaleString()}</div>
              </div>
              <div className="flex-1 text-center border-l border-slate-100">
                <div className="text-[0.72rem] text-slate-400 mb-1">累積久站</div>
                <div className="text-[1.05rem] font-semibold text-slate-800">{latestAssessment.standing_hours} hr</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-[14px] p-8 border border-dashed border-slate-300 text-center">
            <p className="text-slate-400 m-0 text-[0.88rem] leading-relaxed">
              目前尚無評估資料<br />
              <span className="text-blue-500">點擊「今日痛點評估」開始紀錄</span>
            </p>
          </div>
        )}
      </div>

      {/* 醫師衛教專區 */}
      <div>
        <h3 className="text-[0.8rem] mb-3 text-slate-400 font-semibold flex items-center gap-1.5 uppercase tracking-wide">
          <PlayCircle size={14} className="text-blue-500" />
          醫師衛教專區
        </h3>
        <div className="flex flex-col gap-2.5">
          {EDUCATION_VIDEOS.map((video) => (
            <button
              key={video.youtubeId}
              onClick={() => setActiveVideo(video)}
              className="text-left w-full bg-none border-none p-0 cursor-pointer"
            >
              <div className="bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all duration-200 border border-slate-200 rounded-[14px] p-3.5 flex items-center gap-3.5 shadow-sm">
                <div className="w-[96px] h-[60px] rounded-[10px] shrink-0 relative overflow-hidden border border-slate-200">
                  <img
                    src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center shadow">
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-blue-700 ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-blue-600 text-[0.68rem] mb-1 font-medium bg-blue-50 inline-block px-2 py-0.5 rounded-full">
                    {video.doctor}
                  </div>
                  <h4 className="m-0 text-slate-800 text-[0.9rem] font-semibold mb-0.5 leading-snug">{video.title}</h4>
                  <p className="m-0 text-slate-400 text-[0.77rem]">{video.description}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* YouTube Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="w-full max-w-[600px] bg-white rounded-[18px] overflow-hidden border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <div>
                <div className="text-blue-600 text-[0.68rem] font-medium bg-blue-50 inline-block px-2 py-0.5 rounded-full mb-1">
                  {activeVideo.doctor}
                </div>
                <h4 className="m-0 text-slate-800 text-[0.95rem] font-semibold">{activeVideo.title}</h4>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer border-none"
              >
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* 專屬照護推薦 */}
      <div className="bg-blue-50 border border-blue-200 rounded-[16px] p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag size={18} className="text-blue-600" />
          <h3 className="m-0 text-blue-700 text-[0.95rem] font-semibold">專屬照護推薦</h3>
        </div>
        <p className="m-0 mb-4 text-slate-600 text-[0.84rem] leading-relaxed">
          依據您的評估紀錄，建議使用夜間夾板或足弓支撐墊。結帳輸入{" "}
          <strong className="text-slate-800 font-semibold">CARE20</strong> 享專屬折扣。
        </p>
        <button className="w-full py-3 rounded-[10px] border-none bg-blue-600 text-white font-semibold cursor-pointer hover:bg-blue-700 transition-colors duration-200 min-h-[44px]">
          前往商城選購
        </button>
      </div>
    </div>
  );
}
