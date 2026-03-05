'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';

export default function BonesHistoryPage() {
    const [images, setImages] = useState([]);

    useEffect(() => {
        apiFetch('/api/footcare/images')
            .then(r => r.ok ? r.json() : [])
            .then(data => setImages(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    const getSeverityLabel = (severity) => {
        const config = {
            normal: { text: '正常', color: '#a8ff78', bg: 'rgba(168, 255, 120, 0.1)' },
            mild: { text: '輕度', color: '#ffeb3b', bg: 'rgba(255, 235, 59, 0.1)' },
            moderate: { text: '中度', color: '#ff9a9e', bg: 'rgba(255, 154, 158, 0.1)' },
            severe: { text: '重度', color: '#ff4b4b', bg: 'rgba(255, 75, 75, 0.1)' },
        };
        return config[severity] || config.normal;
    };

    return (
        <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                    <Link href="/bones" style={{ color: '#a8ff78', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                        ← 返回中心
                    </Link>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0' }}>📸 檢測歷程追蹤</h2>
                </div>
            </header>

            {images.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>您目前還沒有任何拇趾外翻 AI 攝影檢測紀錄。</p>
                    <Link href="/bones/scan">
                        <button style={{
                            marginTop: '1.5rem', padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none',
                            background: '#a8ff78', color: '#1a3630', fontWeight: 'bold', cursor: 'pointer'
                        }}>
                            立即建立第一筆檢測
                        </button>
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {images.map(img => {
                        const style = getSeverityLabel(img.ai_severity);
                        const dateObj = new Date(img.logged_at);
                        const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

                        return (
                            <Link href={`/bones/result?id=${img.id}`} key={img.id} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    display: 'flex', gap: '1rem', background: 'var(--bg-card)',
                                    padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                                    alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer'
                                }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: `1px solid ${style.color}` }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.image_data} alt="History Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{dateStr}</span>
                                            <span style={{ background: style.bg, color: style.color, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                {style.text}
                                            </span>
                                        </div>
                                        <p style={{ color: '#fff', margin: 0, fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {img.ai_summary}
                                        </p>
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.3)', paddingLeft: '0.5rem' }}>
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
