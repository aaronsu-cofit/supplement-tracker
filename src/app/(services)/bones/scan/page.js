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

    const handleCapture = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setResult(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPreview(ev.target.result);
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
            const res = await fetch('/api/footcare/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_data: preview,
                    ai_severity: result.ai_severity,
                    ai_summary: result.ai_summary
                })
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
                    border: '2px dashed rgba(168, 255, 120, 0.4)',
                    borderRadius: '16px',
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🦶</div>
                    <p style={{ color: '#fff', fontWeight: 'bold' }}>請拍攝雙腳正上方俯拍照</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '2rem' }}>確保光線明亮，雙腳平放於地面</p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCapture}
                        id="camera-input"
                        style={{ display: 'none' }}
                    />

                    <label htmlFor="camera-input" style={{
                        display: 'inline-block',
                        padding: '1rem 2rem',
                        background: '#a8ff78',
                        color: '#1a3630',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        width: '80%'
                    }}>
                        開啟相機 / 相簿
                    </label>
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
