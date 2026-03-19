'use client';

import { apiFetch } from '@vitera/lib';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Camera, Smartphone, Image, RotateCcw, ScanSearch, AlertCircle, Bot } from 'lucide-react';
import type { ShoeWearResult, ShoeRiskLevel, ShoeWearPattern, RiskClasses } from '../../types';

const RISK_CLASSES: Record<ShoeRiskLevel, RiskClasses> = {
  low:      { badge: 'bg-emerald-100 text-emerald-700', label: '低風險' },
  moderate: { badge: 'bg-amber-100 text-amber-700',    label: '中等風險' },
  high:     { badge: 'bg-red-100 text-red-700',        label: '高風險' },
};

const WEAR_LABELS: Record<ShoeWearPattern, string> = {
  medial_forefoot: '前掌內側磨損',
  lateral:         '外側磨損',
  heel_center:     '後跟中央磨損',
  toe_asymmetric:  '前趾不對稱磨損',
  uniform:         '均勻磨損',
  mixed:           '複合磨損',
};

export default function ShoeScanPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShoeWearResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('您目前的瀏覽器不支援高階智能相機，請點擊下方「一般相機拍照」或點選右上角「以預設瀏覽器開啟」。');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      handleStreamSuccess(stream);
    } catch {
      try {
        const streamFallback = await navigator.mediaDevices.getUserMedia({ video: true });
        handleStreamSuccess(streamFallback);
      } catch (fallbackErr) {
        const fe = fallbackErr as DOMException;
        let errorMsg = '無法啟動相機。';
        if (fe.name === 'NotAllowedError') errorMsg = '相機權限已被拒絕。請至瀏覽器設定中「允許」此應用程式存取相機。';
        else if (fe.name === 'NotFoundError') errorMsg = '找不到相機裝置。';
        setError(`${errorMsg} (您也可以點擊下方「一般相機拍照」作為備案)`);
      }
    }
  };

  const handleStreamSuccess = (stream: MediaStream) => {
    setIsCameraActive(true);
    setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 50);
  };

  const handleLoadedMetadata = async () => {
    if (videoRef.current) {
      try { await videoRef.current.play(); } catch {}
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreview(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
  };

  const handleCapture = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
      if (isCameraActive) stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setPreview(null);
    setError(null);
    setResult(null);
    startCamera();
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await apiFetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview, mode: 'shoe_wear' }),
      });
      const data: ShoeWearResult = await res.json();
      if (!res.ok) { setError((data as { error?: string }).error || '分析失敗，請重試'); return; }
      setResult(data);
    } catch {
      setError('系統連線發生錯誤');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !preview) return;
    setSaving(true);
    try {
      const payload = {
        image_data: preview,
        ai_risk_level: result.ai_risk_level,
        ai_wear_pattern: result.ai_wear_pattern,
        ai_summary: result.ai_summary,
        ai_details: { left_shoe: result.left_shoe, right_shoe: result.right_shoe },
      };
      const res = await apiFetch('/api/footcare/shoe-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push('/');
      } else {
        setError('無法儲存分析結果');
      }
    } catch {
      setError('儲存失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  const risk = result ? (RISK_CLASSES[result.ai_risk_level] || RISK_CLASSES.low) : null;

  return (
    <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-6">
      <header>
        <Link href="/" className="flex items-center gap-1 text-blue-600 no-underline text-[0.88rem] mb-3 hover:text-blue-700 transition-colors w-fit">
          <ChevronLeft size={16} />
          返回中心
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-[10px] bg-amber-50 flex items-center justify-center">
            <ScanSearch size={20} className="text-amber-600" />
          </div>
          <h2 className="text-[1.35rem] font-bold m-0 text-slate-800">AI 鞋底磨損分析</h2>
        </div>
        <p className="text-slate-400 m-0 text-[0.88rem] leading-relaxed pl-[52px]">將鞋底朝上放置，從正上方垂直拍攝，確保磨損紋路清晰。</p>
      </header>

      {!preview ? (
        <div className="rounded-[16px] p-5 text-center bg-white border border-slate-200 shadow-sm">
          <p className="text-slate-700 font-semibold text-[1rem] mb-1">請拍攝鞋底俯視照</p>
          <p className="text-slate-400 text-[0.84rem] mb-5">建議拍攝慣用鞋（左右各一），光線明亮</p>

          <div className="relative w-full h-[380px] bg-slate-900 rounded-[14px] mb-5 overflow-hidden flex flex-col items-center justify-center shadow-md">
            {!isCameraActive ? (
              <div className="flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Camera size={32} className="text-white/40" />
                </div>
                <button
                  onClick={startCamera}
                  className="py-3 px-7 bg-amber-500 text-white border-none rounded-full font-semibold cursor-pointer hover:bg-amber-600 transition-colors shadow-md min-h-[44px]"
                >
                  啟動智能相機
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={handleLoadedMetadata}
                  className="absolute inset-0 w-full h-full object-cover z-[1] bg-black"
                  style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                />
                <svg
                  viewBox="0 0 300 220"
                  className="absolute inset-0 w-full h-full z-[5] pointer-events-none"
                  stroke="rgba(251, 191, 36, 0.85)" strokeWidth="2" fill="none"
                  strokeDasharray="5 4"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' }}
                >
                  <ellipse cx="85" cy="110" rx="55" ry="90" />
                  <ellipse cx="215" cy="110" rx="55" ry="90" />
                  <line x1="150" y1="15" x2="150" y2="205" stroke="rgba(255,255,255,0.25)" strokeDasharray="3 6" strokeWidth="1" />
                </svg>
                <div className="absolute bottom-5 left-0 right-0 flex justify-center z-10">
                  <button
                    onClick={captureFromVideo}
                    className="w-16 h-16 rounded-full bg-white/20 border-[3px] border-white cursor-pointer flex items-center justify-center backdrop-blur shadow-lg hover:bg-white/30 transition-colors"
                  >
                    <div className="w-11 h-11 bg-white rounded-full" />
                  </button>
                </div>
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3.5 bg-red-50 text-red-600 rounded-[10px] border border-red-200 mb-5 text-[0.84rem] text-left">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-center gap-3 flex-wrap">
            <button
              className="flex items-center gap-2 py-3 px-5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full cursor-pointer text-[0.88rem] font-medium hover:bg-amber-100 transition-colors min-h-[44px]"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
                input.onchange = handleCapture; input.click();
              }}
            >
              <Smartphone size={16} />
              一般相機拍照
            </button>
            <button
              className="flex items-center gap-2 py-3 px-5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full cursor-pointer text-[0.88rem] font-medium hover:bg-slate-100 transition-colors min-h-[44px]"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*';
                input.onchange = handleCapture; input.click();
              }}
            >
              <Image size={16} />
              從相簿選取
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] overflow-hidden border border-slate-200 bg-slate-900 flex justify-center items-center shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="鞋底預覽" className="w-full max-h-[400px] object-contain" />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3.5 bg-red-50 text-red-600 rounded-[10px] border border-red-200 text-[0.84rem]">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!result && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRetake}
                disabled={analyzing}
                className="flex items-center justify-center gap-2 p-3.5 bg-white text-slate-700 border border-slate-300 rounded-[12px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors min-h-[48px] shadow-sm"
              >
                <RotateCcw size={16} />
                重拍
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center justify-center gap-2 p-3.5 bg-amber-500 text-white border-none rounded-[12px] font-semibold cursor-pointer hover:bg-amber-600 transition-colors min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                <ScanSearch size={16} />
                {analyzing ? 'AI 分析中...' : '開始分析'}
              </button>
            </div>
          )}

          {result && risk && (
            <div className="flex flex-col gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-[16px] p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="m-0 text-amber-700 font-semibold">分析完成</h3>
                  <span className={`py-1 px-3 rounded-full text-[0.82rem] font-semibold ${risk.badge}`}>
                    {risk.label}
                  </span>
                </div>

                {result.ai_wear_pattern && (
                  <div className="mb-3">
                    <span className="text-[0.78rem] text-slate-400 font-medium uppercase tracking-wide">磨損類型</span>
                    <p className="m-0 mt-1 text-slate-700 font-semibold text-[0.9rem]">
                      {WEAR_LABELS[result.ai_wear_pattern] || result.ai_wear_pattern}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-white/70 rounded-[10px] mb-4">
                  <Bot size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed m-0 text-[0.88rem]">{result.ai_summary}</p>
                </div>

                {(result.left_shoe?.detected || result.right_shoe?.detected) && (
                  <div className="grid grid-cols-2 gap-2">
                    {([['left_shoe', '左鞋'], ['right_shoe', '右鞋']] as const).map(([key, label]) => {
                      const shoe = result[key];
                      if (!shoe?.detected) return null;
                      return (
                        <div key={key} className="bg-white/70 rounded-[10px] p-3">
                          <div className="text-[0.75rem] text-amber-600 font-semibold mb-1">{label}</div>
                          <p className="m-0 text-slate-600 text-[0.8rem] leading-snug">{shoe.primary_wear}</p>
                          {shoe.gait_note && (
                            <p className="m-0 mt-1 text-slate-400 text-[0.75rem] leading-snug">{shoe.gait_note}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full p-3.5 bg-amber-500 text-white border-none rounded-[12px] font-semibold cursor-pointer hover:bg-amber-600 transition-colors min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? '儲存中...' : '儲存紀錄 →'}
              </button>
              <button
                onClick={handleRetake}
                disabled={saving}
                className="w-full p-3.5 bg-transparent text-slate-500 border-none cursor-pointer hover:text-slate-700 transition-colors text-[0.88rem]"
              >
                取消重新掃描
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
