'use client';

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

    // Start Camera Stream
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
        // Ensure DOM is updated before attaching stream
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        }, 50);
    };

    // Secondary guarantee to play video once metadata is loaded
    const handleLoadedMetadata = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
            } catch (playErr) {
                console.error("Video play error on metadata load:", playErr);
            }
        }
    };

    // Remove old onCanPlay as it might fire too late or inconsistently on iOS First Load
    // const handleCanPlay = async () => ...

    // Stop Camera Stream
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    // Capture Image from Video
    const captureFromVideo = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas to match video actual dimensions
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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        startCamera(); // Restart camera on retake
    };

    const handleAnalyze = async () => {
        if (!preview) return;
        setAnalyzing(true);
        setError(null);

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: preview, mode: 'hallux_valgus' }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || '分析失敗，請重試');
                return;
            }

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

            // If the Gemini model returned the extra coordinates from the new prompt, save them
            if (result.left_toe || result.right_toe) {
                payload.ai_details = {
                    left_toe: result.left_toe,
                    right_toe: result.right_toe
                };
            }

            const res = await fetch('/api/footcare/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedImage = await res.json();
                router.push(`/bones/result?id=${savedImage.id}`);
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
        <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header>
                <Link href="/bones" style={{ color: '#a8ff78', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem', display: 'inline-block' }}>
                    ← 返回中心
                </Link>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>📷 AI 拇趾外翻檢測</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>請脫掉襪子，將手機移至足部正上方垂直往下拍攝。</p>
            </header>

            {!preview ? (
                <div style={{
                    borderRadius: '16px',
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>請拍攝雙腳正上方俯拍照</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>確保光線明亮，請將雙腳對齊下方參考線</p>

                    {/* Custom WebRTC Camera Area */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '400px', // Taller for better camera view
                        background: '#000',
                        borderRadius: '16px',
                        marginBottom: '1.5rem',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}>
                        {!isCameraActive ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ fontSize: '3rem', opacity: 0.5 }}>📷</div>
                                <button onClick={startCamera} style={{
                                    padding: '0.8rem 1.5rem', background: '#a8ff78', color: '#1a3630',
                                    border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(168, 255, 120, 0.3)'
                                }}>
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
                                    style={{
                                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                                        objectFit: 'cover', zIndex: 1,
                                        transform: 'translateZ(0)',
                                        WebkitTransform: 'translateZ(0)',
                                        backgroundColor: '#000'
                                    }}
                                />

                                {/* Glowing Foot Guideline SVG Overlaying the Video */}
                                <svg viewBox="0 0 200 240" style={{
                                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                                    stroke: 'rgba(168, 255, 120, 0.9)', strokeWidth: '2', fill: 'none',
                                    strokeDasharray: '4 4', zIndex: 5, pointerEvents: 'none',
                                    filter: 'drop-shadow(0 0 4px rgba(168, 255, 120, 0.5))'
                                }}>
                                    {/* Left Foot Rough Outline */}
                                    <path d="M70,40 C50,40 40,80 40,110 C40,150 45,180 50,190 C55,200 65,205 75,200 C85,195 90,170 90,140 C90,100 85,40 70,40 Z" />
                                    {/* Right Foot Rough Outline */}
                                    <path d="M130,40 C150,40 160,80 160,110 C160,150 155,180 150,190 C145,200 135,205 125,200 C115,195 110,170 110,140 C110,100 115,40 130,40 Z" />
                                    {/* Alignment Markers */}
                                    <line x1="100" y1="20" x2="100" y2="220" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 6" strokeWidth="1" />
                                    <line x1="40" y1="120" x2="160" y2="120" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 6" strokeWidth="1" />
                                </svg>

                                {/* Shutter Button */}
                                <div style={{
                                    position: 'absolute', bottom: '20px', left: '0', right: '0',
                                    display: 'flex', justifyContent: 'center', zIndex: 10
                                }}>
                                    <button onClick={captureFromVideo} style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.2)', border: '4px solid #fff',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}>
                                        <div style={{ width: '48px', height: '48px', background: '#fff', borderRadius: '50%' }} />
                                    </button>
                                </div>
                            </>
                        )}
                        {/* Hidden Canvas for extracting image */}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>

                    {error && (
                        <div style={{ padding: '0.8rem', background: 'rgba(255, 99, 132, 0.1)', color: '#ff6384', borderRadius: '8px', border: '1px solid rgba(255, 99, 132, 0.3)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {/* Native Camera Fallback */}
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.8rem 1.5rem', background: 'rgba(168, 255, 120, 0.1)', color: '#a8ff78',
                            border: '1px solid rgba(168, 255, 120, 0.3)', borderRadius: '24px', cursor: 'pointer',
                            fontSize: '0.9rem'
                        }} onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.capture = 'environment';
                            input.onchange = handleCapture;
                            input.click();
                        }}>
                            <span>📱</span>
                            <span>一般相機拍照</span>
                        </label>

                        {/* Gallery Input Fallback */}
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.8rem 1.5rem', background: 'rgba(255, 255, 255, 0.05)', color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px', cursor: 'pointer',
                            fontSize: '0.9rem'
                        }} onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = handleCapture;
                            input.click();
                        }}>
                            <span>🖼️</span>
                            <span>從相簿選取</span>
                        </label>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#000',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                    </div>

                    {error && (
                        <div style={{ padding: '1rem', background: 'rgba(255, 99, 132, 0.1)', color: '#ff6384', borderRadius: '8px', border: '1px solid #ff6384' }}>
                            {error}
                        </div>
                    )}

                    {!result && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button
                                onClick={handleRetake}
                                disabled={analyzing}
                                style={{
                                    padding: '1rem', background: 'rgba(255,255,255,0.1)', color: '#fff',
                                    border: 'none', borderRadius: '12px', fontWeight: 'bold'
                                }}
                            >
                                重拍
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                style={{
                                    padding: '1rem', background: '#a8ff78', color: '#1a3630',
                                    border: 'none', borderRadius: '12px', fontWeight: 'bold',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                {analyzing ? 'AI 分析中...' : '開始分析 ✨'}
                            </button>
                        </div>
                    )}

                    {result && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(168, 255, 120, 0.15), rgba(6, 23, 0, 0.5))',
                            border: '1px solid #a8ff78',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            animation: 'fadeIn 0.5s ease-out'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, color: '#a8ff78' }}>分析完成</h3>
                                <span style={{
                                    background: result.ai_severity === 'severe' || result.ai_severity === 'moderate' ? '#ff9a9e' : '#a8ff78',
                                    color: '#1a3630', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
                                }}>
                                    {result.ai_severity === 'normal' && '正常'}
                                    {result.ai_severity === 'mild' && '輕度外翻'}
                                    {result.ai_severity === 'moderate' && '中度外翻'}
                                    {result.ai_severity === 'severe' && '重度外翻'}
                                </span>
                            </div>

                            <p style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
                                {result.ai_summary}
                            </p>

                            <button
                                onClick={handleSaveAndView}
                                disabled={saving}
                                style={{
                                    width: '100%', padding: '1rem', background: '#a8ff78', color: '#1a3630',
                                    border: 'none', borderRadius: '12px', fontWeight: 'bold'
                                }}
                            >
                                {saving ? '儲存中...' : '儲存紀錄並查看建議 ➔'}
                            </button>
                            <button
                                onClick={handleRetake}
                                disabled={saving}
                                style={{
                                    width: '100%', padding: '1rem', background: 'transparent', color: '#fff',
                                    border: 'none', marginTop: '0.5rem'
                                }}
                            >
                                取消重新掃描
                            </button>
                        </div>
                    )}
                </div>
            )}
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
