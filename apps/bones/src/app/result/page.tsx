'use client';

import { apiFetch } from '@vitera/lib';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Bot, AlertTriangle, Shield, FileText } from 'lucide-react';
import type { FootImage, FootSeverity, ToeDetection, FootImageDetails, SeverityStyle } from '../../types';

const SEVERITY_MAP: Record<FootSeverity, SeverityStyle> = {
  normal:   { label: '正常',    color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  mild:     { label: '輕度外翻', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  moderate: { label: '中度外翻', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  severe:   { label: '重度外翻', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
};

function SeverityDisplay({ severity }: { severity: FootSeverity }) {
  const sev = SEVERITY_MAP[severity] || SEVERITY_MAP.normal;
  return (
    <div
      className="flex items-center justify-between rounded-[14px] p-4 border"
      style={{ background: sev.bg, borderColor: sev.border }}
    >
      <div>
        <div className="text-slate-500 text-[0.78rem] mb-1">AI 嚴重程度評估</div>
        <div className="text-slate-800 font-bold text-[1.15rem]">{sev.label}</div>
      </div>
      <span
        className="py-1.5 px-4 rounded-full text-[0.82rem] font-semibold border"
        style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
      >
        {sev.label}
      </span>
    </div>
  );
}

interface BoundingBoxOverlayProps {
  details: FootImageDetails | null;
}

function BoundingBoxOverlay({ details }: BoundingBoxOverlayProps) {
  if (!details) return null;

  const renderBox = (toeData: ToeDetection | undefined, label: string) => {
    if (!toeData || !toeData.detected || !toeData.box) return null;
    const { xmin, ymin, xmax, ymax } = toeData.box;
    const width = xmax - xmin;
    const height = ymax - ymin;

    let color = '#059669';
    if (toeData.severity === 'mild') color = '#d97706';
    if (toeData.severity === 'moderate') color = '#dc2626';
    if (toeData.severity === 'severe') color = '#b91c1c';

    return (
      <g key={label}>
        <rect
          x={`${xmin * 100}%`} y={`${ymin * 100}%`}
          width={`${width * 100}%`} height={`${height * 100}%`}
          fill="none" stroke={color} strokeWidth="3" rx="8"
          strokeDasharray="8 4" style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <path
          d={`M${(xmin + width / 2) * 100}% ${(ymin + height) * 100}% L${(xmin + width / 2) * 100}% ${(ymin + height / 2) * 100}% L${(xmin + width / 2 + (label === 'L' ? width / 1.5 : -width / 1.5)) * 100}% ${(ymin) * 100}%`}
          fill="none" stroke={color} strokeWidth="2" opacity="0.8"
        />
        <g transform={`translate(${(xmax + 0.02) * 100}, ${(ymin + 0.05) * 100})`}>
          <rect x="-2%" y="-3%" width="22%" height="10%" rx="4" fill="rgba(0,0,0,0.7)" stroke={color} strokeWidth="1" />
          <text x="0%" y="2%" fill="#fff" fontSize="5" fontWeight="bold" dominantBaseline="middle">{toeData.angle_degrees}°</text>
          <text x="0%" y="5.5%" fill={color} fontSize="3" fontWeight="bold" dominantBaseline="middle" style={{ textTransform: 'uppercase' }}>{toeData.severity}</text>
        </g>
      </g>
    );
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
      {renderBox(details.left_toe, 'L')}
      {renderBox(details.right_toe, 'R')}
    </svg>
  );
}

function BonesResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [imageRecord, setImageRecord] = useState<FootImage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = searchParams?.get('id');
    if (!id) {
      router.replace('/');
      return;
    }

    apiFetch('/api/footcare/images')
      .then(res => res.json())
      .then((data: FootImage[]) => {
        const record = data.find(img => String(img.id) === id);
        if (record) {
          setImageRecord(record);
        } else {
          router.replace('/');
        }
      })
      .catch(err => {
        console.error(err);
        router.replace('/');
      })
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen flex-col gap-3">
        <div className="spinner" />
        <p className="text-slate-400 text-[0.88rem]">載入分析結果中...</p>
      </div>
    );
  }

  if (!imageRecord) return null;

  return (
    <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-4">
      <header>
        <Link href="/" className="flex items-center gap-1 text-blue-600 no-underline text-[0.88rem] mb-3 hover:text-blue-700 transition-colors w-fit">
          <ChevronLeft size={16} />
          返回中心
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center">
            <FileText size={20} className="text-blue-600" />
          </div>
          <h2 className="text-[1.35rem] font-bold m-0 text-slate-800">檢測報告</h2>
        </div>
      </header>

      <div className="relative rounded-[16px] overflow-hidden border border-slate-200 bg-slate-900 mx-auto w-full shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageRecord.image_data} alt="Foot Source Image" className="w-full h-auto block" />
        <BoundingBoxOverlay details={imageRecord.ai_details} />
      </div>

      <SeverityDisplay severity={imageRecord.ai_severity} />

      <div className="bg-white border border-slate-200 rounded-[14px] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={18} className="text-blue-600" />
          <h4 className="text-slate-800 m-0 font-semibold text-[0.95rem]">AI 說明與建議</h4>
        </div>
        <p className="text-slate-600 leading-relaxed m-0 text-[0.9rem]">
          {imageRecord.ai_summary}
        </p>
      </div>

      {(imageRecord.ai_severity === 'moderate' || imageRecord.ai_severity === 'severe') && (
        <div className="bg-red-50 border border-red-200 rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-600" />
            <h3 className="text-red-700 m-0 font-semibold text-[0.95rem]">醫療諮詢建議</h3>
          </div>
          <p className="text-slate-600 m-0 mb-4 text-[0.88rem] leading-relaxed">
            由於您的檢測結果顯示一定程度的外翻，建議及早尋求物理治療師或骨科醫師的專業評估，避免情況惡化。
          </p>
          <button className="w-full p-3.5 rounded-[10px] border-none bg-red-600 text-white font-semibold cursor-pointer hover:bg-red-700 transition-colors min-h-[44px]">
            尋找附近合作專科診所
          </button>
          <div className="mt-4 border-t border-red-100 pt-4">
            <p className="text-slate-500 m-0 mb-3 text-[0.84rem]">開刀術後需要傷口照護嗎？</p>
            <Link href="/wounds" className="no-underline">
              <button className="w-full p-3.5 rounded-[10px] border border-red-300 bg-white text-red-600 font-semibold cursor-pointer hover:bg-red-50 transition-colors min-h-[44px]">
                前往傷口照護追蹤 (WoundCare)
              </button>
            </Link>
          </div>
        </div>
      )}

      {(imageRecord.ai_severity === 'normal' || imageRecord.ai_severity === 'mild' || imageRecord.ai_severity === 'moderate') && (
        <div className="bg-blue-50 border border-blue-200 rounded-[14px] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-blue-600" />
            <h3 className="text-blue-700 m-0 font-semibold text-[0.95rem]">預防與保養推薦</h3>
          </div>
          <p className="text-slate-600 m-0 mb-4 text-[0.88rem] leading-relaxed">
            適當的輔具可以減緩惡化速度，現在使用 <strong className="text-slate-800">CARE20</strong> 享夜間夾板折扣。
          </p>
          <button className="w-full py-3 rounded-[10px] border-none bg-blue-600 text-white font-semibold cursor-pointer hover:bg-blue-700 transition-colors min-h-[44px]">
            選購居家矯正輔具
          </button>
        </div>
      )}
    </div>
  );
}

export default function BonesResultPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen flex-col gap-3">
        <div className="spinner" />
        <p className="text-slate-400 text-[0.88rem]">載入分析結果中...</p>
      </div>
    }>
      <BonesResultContent />
    </Suspense>
  );
}
