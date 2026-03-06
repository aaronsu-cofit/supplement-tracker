'use client';
import { apiFetch } from '@vitera/lib';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BonesScanPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    // Custom WebRTC Camera States
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
                    errorMsg = "🎥 相機權限已被拒絕。請至瀏覽器設定中「允許」此應用程式存取相機。";
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
        <div className="p-6 max-w-[600px] mx-auto flex flex-col gap-8">
            <header>
                <Link href="/bones" className="text-[#a8ff78] no-underline text-[0.9rem] mb-4 inline-block">
                    ← 返回中心
                </Link>
                <h2 className="text-[1.5rem] font-bold m-0 mb-2">📷 AI 拇趾外翻檢測</h2>
                <p className="text-white/60 m-0 text-[0.9rem]">請脫掉襪子，將手機移至足部正上方垂直往下拍攝。</p>
            </header>

            {!preview ? (
                <div className="rounded-[16px] p-6 px-4 text-center bg-white/[0.03] border border-white/[0.08]">
                    <p className="text-white font-bold text-[1.1rem] mb-2">請拍攝雙腳正上方俯拍照</p>
                    <p className="text-white/50 text-[0.85rem] mb-6">確保光線明亮，請將雙腳對齊下方參考線</p>

                    {/* WebRTC Camera Area */}
                    <div className="relative w-full h-[400px] bg-black rounded-[16px] mb-6 overflow-hidden flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                        {!isCameraActive ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-[3rem] opacity-50">📷</div>
                                <button
                                    onClick={startCamera}
                                    className="py-3 px-6 bg-[#a8ff78] text-[#1a3630] border-none rounded-[24px] font-bold cursor-pointer shadow-[0_4px_12px_rgba(168,255,120,0.3)]"
                                >
                                    啟動智能相機
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Live Video Stream */}
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

                                {/* Glowing Foot Guideline SVG */}
                                <svg
                                    viewBox="0 0 200 240"
                                    className="absolute inset-0 w-full h-full z-[5] pointer-events-none"
                                    stroke="rgba(168, 255, 120, 0.9)" strokeWidth="2" fill="none"
                                    strokeDasharray="4 4"
                                    style={{ filter: 'drop-shadow(0 0 4px rgba(168, 255, 120, 0.5))' }}
                                >
                                    <path d="M70,40 C50,40 40,80 40,110 C40,150 45,180 50,190 C55,200 65,205 75,200 C85,195 90,170 90,140 C90,100 85,40 70,40 Z" />
                                    <path d="M130,40 C150,40 160,80 160,110 C160,150 155,180 150,190 C145,200 135,205 125,200 C115,195 110,170 110,140 C110,100 115,40 130,40 Z" />
                                    <line x1="100" y1="20" x2="100" y2="220" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 6" strokeWidth="1" />
                                    <line x1="40" y1="120" x2="160" y2="120" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 6" strokeWidth="1" />
                                </svg>

                                {/* Shutter Button */}
                                <div className="absolute bottom-5 left-0 right-0 flex justify-center z-10">
                                    <button
                                        onClick={captureFromVideo}
                                        className="w-16 h-16 rounded-full bg-white/20 border-4 border-white cursor-pointer flex items-center justify-center backdrop-blur shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-full" />
                                    </button>
                                </div>
                            </>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {error && (
                        <div className="p-3 bg-[rgba(255,99,132,0.1)] text-[#ff6384] rounded-[8px] border border-[rgba(255,99,132,0.3)] mb-6 text-[0.85rem]">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-center gap-4 flex-wrap">
                        <label
                            className="flex items-center gap-2 py-3 px-6 bg-[rgba(168,255,120,0.1)] text-[#a8ff78] border border-[rgba(168,255,120,0.3)] rounded-[24px] cursor-pointer text-[0.9rem]"
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
                                input.onchange = handleCapture; input.click();
                            }}
                        >
                            <span>📱</span><span>一般相機拍照</span>
                        </label>
                        <label
                            className="flex items-center gap-2 py-3 px-6 bg-white/5 text-white border border-white/10 rounded-[24px] cursor-pointer text-[0.9rem]"
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file'; input.accept = 'image/*';
                                input.onchange = handleCapture; input.click();
                            }}
                        >
                            <span>🖼️</span><span>從相簿選取</span>
                        </label>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="rounded-[16px] overflow-hidden border border-white/10 bg-black flex justify-center items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Preview" className="w-full max-h-[400px] object-contain" />
                    </div>

                    {error && (
                        <div className="p-4 bg-[rgba(255,99,132,0.1)] text-[#ff6384] rounded-[8px] border border-[#ff6384]">
                            {error}
                        </div>
                    )}

                    {!result && (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleRetake}
                                disabled={analyzing}
                                className="p-4 bg-white/10 text-white border-none rounded-[12px] font-bold cursor-pointer"
                            >
                                重拍
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className="p-4 bg-[#a8ff78] text-[#1a3630] border-none rounded-[12px] font-bold flex justify-center items-center gap-2 cursor-pointer"
                            >
                                {analyzing ? 'AI 分析中...' : '開始分析 ✨'}
                            </button>
                        </div>
                    )}

                    {result && (
                        <div className="bg-gradient-to-br from-[rgba(168,255,120,0.15)] to-[rgba(6,23,0,0.5)] border border-[#a8ff78] rounded-[16px] p-6 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="m-0 text-[#a8ff78]">分析完成</h3>
                                <span
                                    className="py-1 px-3 rounded-[20px] text-[0.85rem] font-bold text-[#1a3630]"
                                    style={{ background: result.ai_severity === 'severe' || result.ai_severity === 'moderate' ? '#ff9a9e' : '#a8ff78' }}
                                >
                                    {result.ai_severity === 'normal' && '正常'}
                                    {result.ai_severity === 'mild' && '輕度外翻'}
                                    {result.ai_severity === 'moderate' && '中度外翻'}
                                    {result.ai_severity === 'severe' && '重度外翻'}
                                </span>
                            </div>

                            <p className="text-white/90 leading-relaxed m-0 mb-6 text-[0.95rem]">
                                {result.ai_summary}
                            </p>

                            <button
                                onClick={handleSaveAndView}
                                disabled={saving}
                                className="w-full p-4 bg-[#a8ff78] text-[#1a3630] border-none rounded-[12px] font-bold cursor-pointer"
                            >
                                {saving ? '儲存中...' : '儲存紀錄並查看建議 ➔'}
                            </button>
                            <button
                                onClick={handleRetake}
                                disabled={saving}
                                className="w-full p-4 bg-transparent text-white border-none mt-2 cursor-pointer"
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
