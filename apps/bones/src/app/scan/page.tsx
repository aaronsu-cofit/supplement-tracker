'use client';
import { apiFetch } from '@vitera/lib';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Camera, Smartphone, Image, RotateCcw, ScanSearch, AlertCircle } from 'lucide-react';

export default function BonesScanPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const startCamera = async () => {
        setError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("您目前的瀏覽器不支援高階智能相機，請點擊下方「一般相機拍照」或點選右上角「以預設瀏覽器開啟」。");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });
            handleStreamSuccess(stream);
        } catch (err) {
            console.error("Camera error (environment):", err);
            try {
                const streamFallback = await navigator.mediaDevices.getUserMedia({ video: true });
                handleStreamSuccess(streamFallback);
            } catch (fallbackErr) {
                console.error("Camera fallback error:", fallbackErr);
                let errorMsg = "無法啟動相機。";
                if (fallbackErr.name === 'NotAllowedError') {
                    errorMsg = "相機權限已被拒絕。請至瀏覽器設定中「允許」此應用程式存取相機。";
                } else if (fallbackErr.name === 'NotFoundError') {
                    errorMsg = "找不到相機裝置。";
                }
                setError(`${errorMsg} (您也可以點擊下方「一般相機拍照」作為備案)`);
            }
        }
    };

    const handleStreamSuccess = (stream) => {
        setIsCameraActive(true);
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        }, 50);
    };

    const handleLoadedMetadata = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
            } catch (playErr) {
                console.error("Video play error on metadata load:", playErr);
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreview(imageDataUrl);
        stopCamera();
    };

    const handleCapture = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setResult(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPreview(ev.target.result);
            if (isCameraActive) stopCamera();
        };
        reader.readAsDataURL(file);
    };

    const handleRetake = () => {
        setPreview(null);
        setError(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                body: JSON.stringify({ image: preview, mode: 'hallux_valgus' }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || '分析失敗，請重試'); return; }
            setResult(data);
        } catch (err) {
            setError('系統連線發生錯誤');
            console.error(err);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSaveAndView = async () => {
        if (!result || !preview) return;
        setSaving(true);
        try {
            const payload = {
                image_data: preview,
                ai_severity: result.ai_severity,
                ai_summary: result.ai_summary,
            };
            if (result.left_toe || result.right_toe) {
                payload.ai_details = { left_toe: result.left_toe, right_toe: result.right_toe };
            }
            const res = await apiFetch('/api/footcare/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const savedImage = await res.json();
                router.push(`/result?id=${savedImage.id}`);
            } else {
                setError('無法儲存分析結果');
            }
        } catch (err) {
            setError('儲存失敗，請重試');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-6">
            <header>
                <Link href="/" className="flex items-center gap-1 text-blue-600 no-underline text-[0.88rem] mb-3 hover:text-blue-700 transition-colors w-fit">
                    <ChevronLeft size={16} />
                    返回中心
                </Link>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center">
                        <Camera size={20} className="text-blue-600" />
                    </div>
                    <h2 className="text-[1.35rem] font-bold m-0 text-slate-800">AI 拇趾外翻檢測</h2>
                </div>
                <p className="text-slate-400 m-0 text-[0.88rem] leading-relaxed pl-[52px]">請脫掉襪子，將手機移至足部正上方垂直往下拍攝。</p>
            </header>

            {!preview ? (
                <div className="rounded-[16px] p-5 text-center bg-white border border-slate-200 shadow-sm">
                    <p className="text-slate-700 font-semibold text-[1rem] mb-1">請拍攝雙腳正上方俯拍照</p>
                    <p className="text-slate-400 text-[0.84rem] mb-5">確保光線明亮，請將雙腳對齊下方參考線</p>

                    {/* 相機區域（保留深色，功能性需求） */}
                    <div className="relative w-full h-[380px] bg-slate-900 rounded-[14px] mb-5 overflow-hidden flex flex-col items-center justify-center shadow-md">
                        {!isCameraActive ? (
                            <div className="flex flex-col items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                                    <Camera size={32} className="text-white/40" />
                                </div>
                                <button
                                    onClick={startCamera}
                                    className="py-3 px-7 bg-blue-600 text-white border-none rounded-full font-semibold cursor-pointer hover:bg-blue-700 transition-colors shadow-md min-h-[44px]"
                                >
                                    啟動智能相機
                                </button>
                            </div>
                        ) : (
                            <>
                                <video
                                    key={isCameraActive ? 'active' : 'inactive'}
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted={true}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    className="absolute inset-0 w-full h-full object-cover z-[1] bg-black"
                                    style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
                                />

                                {/* 足部輪廓參考線 */}
                                <svg
                                    viewBox="0 0 200 240"
                                    className="absolute inset-0 w-full h-full z-[5] pointer-events-none"
                                    stroke="rgba(96, 165, 250, 0.85)" strokeWidth="2" fill="none"
                                    strokeDasharray="4 4"
                                    style={{ filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.45))' }}
                                >
                                    <path d="M70,40 C50,40 40,80 40,110 C40,150 45,180 50,190 C55,200 65,205 75,200 C85,195 90,170 90,140 C90,100 85,40 70,40 Z" />
                                    <path d="M130,40 C150,40 160,80 160,110 C160,150 155,180 150,190 C145,200 135,205 125,200 C115,195 110,170 110,140 C110,100 115,40 130,40 Z" />
                                    <line x1="100" y1="20" x2="100" y2="220" stroke="rgba(255,255,255,0.3)" strokeDasharray="2 6" strokeWidth="1" />
                                    <line x1="40" y1="120" x2="160" y2="120" stroke="rgba(255,255,255,0.3)" strokeDasharray="2 6" strokeWidth="1" />
                                </svg>

                                {/* 拍照按鈕 */}
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
                            className="flex items-center gap-2 py-3 px-5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full cursor-pointer text-[0.88rem] font-medium hover:bg-blue-100 transition-colors min-h-[44px]"
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
                        <img src={preview} alt="Preview" className="w-full max-h-[400px] object-contain" />
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
                                className="flex items-center justify-center gap-2 p-3.5 bg-blue-600 text-white border-none rounded-[12px] font-semibold cursor-pointer hover:bg-blue-700 transition-colors min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                            >
                                <ScanSearch size={16} />
                                {analyzing ? 'AI 分析中...' : '開始分析'}
                            </button>
                        </div>
                    )}

                    {result && (
                        <div className="bg-blue-50 border border-blue-200 rounded-[16px] p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="m-0 text-blue-700 font-semibold">分析完成</h3>
                                <span
                                    className="py-1 px-3 rounded-full text-[0.82rem] font-semibold text-white"
                                    style={{ background: result.ai_severity === 'severe' || result.ai_severity === 'moderate' ? '#dc2626' : '#2563eb' }}
                                >
                                    {result.ai_severity === 'normal' && '正常'}
                                    {result.ai_severity === 'mild' && '輕度外翻'}
                                    {result.ai_severity === 'moderate' && '中度外翻'}
                                    {result.ai_severity === 'severe' && '重度外翻'}
                                </span>
                            </div>

                            <p className="text-slate-700 leading-relaxed m-0 mb-5 text-[0.9rem]">
                                {result.ai_summary}
                            </p>

                            <button
                                onClick={handleSaveAndView}
                                disabled={saving}
                                className="w-full p-3.5 bg-blue-600 text-white border-none rounded-[12px] font-semibold cursor-pointer hover:bg-blue-700 transition-colors min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? '儲存中...' : '儲存紀錄並查看建議 →'}
                            </button>
                            <button
                                onClick={handleRetake}
                                disabled={saving}
                                className="w-full p-3.5 bg-transparent text-slate-500 border-none mt-2 cursor-pointer hover:text-slate-700 transition-colors text-[0.88rem]"
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
