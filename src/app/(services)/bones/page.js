'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthProvider';

export default function BonesDashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [assessments, setAssessments] = useState([]);
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login?redirect=/bones');
            return;
        }
        fetchData();
    }, [user, authLoading, router]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [assessRes, imagesRes] = await Promise.all([
                fetch('/api/footcare/assessments'),
                fetch('/api/footcare/images')
            ]);

            if (assessRes.ok) {
                const assessData = await assessRes.json();
                setAssessments(assessData || []);
            }
            if (imagesRes.ok) {
                const imgData = await imagesRes.json();
                setImages(imgData || []);
            }
        } catch (error) {
            console.error('Failed to fetch foot care data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(168,255,120,0.3)', borderTopColor: '#a8ff78', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#a8a8a8', fontSize: '0.9rem' }}>載入您的足部資料中...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const latestAssessment = assessments.length > 0 ? assessments[0] : null;

    return (
        <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '90px' }}>
            {/* Header Banner */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#fff' }}>
                        足踝照護中心
                    </h1>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>掌握足部健康，找回正確步態 👣</p>
                </div>
            </header>

            {/* AI Call to Action */}
            <Link href="/bones/scan" style={{ textDecoration: 'none' }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(82, 194, 52, 0.2), rgba(6, 23, 0, 0.4))',
                    border: '1px solid rgba(168, 255, 120, 0.3)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{ fontSize: '2.5rem' }}>📷</div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.25rem 0', color: '#a8ff78', fontSize: '1.1rem' }}>AI 拇趾外翻檢測</h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                            只要拍攝足部俯拍照，即可透過 AI 分析外翻角度與嚴重程度。
                        </p>
                    </div>
                </div>
            </Link>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Link href="/bones/assess" style={{ textDecoration: 'none' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px', padding: '1.25rem', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <div style={{ fontSize: '2rem' }}>📝</div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>今日痛點評估</h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>紀錄疼痛與活動力</p>
                    </div>
                </Link>

                <a href="#" onClick={(e) => { e.preventDefault(); alert('功能建置中：此按鈕未來將引導開啟 Habit Tracker App 進行足底復健打卡'); }} style={{ textDecoration: 'none' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px', padding: '1.25rem', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <div style={{ fontSize: '2rem' }}>🎯</div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>肌力復健處方</h3>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>前往 Habit Tracker</p>
                    </div>
                </a>
            </div>

            {/* Status Overview */}
            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📊</span> 近期狀態
                </h3>

                {latestAssessment ? (
                    <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>最新紀錄 {latestAssessment.date}</span>
                            <span style={{ color: latestAssessment.nrs_pain_score > 3 ? '#ff9a9e' : '#a8ff78', fontWeight: 'bold' }}>
                                疼痛指數: {latestAssessment.nrs_pain_score}/10
                            </span>
                        </div>
                        {latestAssessment.pain_locations && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {latestAssessment.pain_locations.split(',').map((loc, idx) => (
                                    <span key={idx} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        {loc} 📍
                                    </span>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>今日活動</div>
                                <div style={{ fontSize: '1.1rem', color: '#fff' }}>{latestAssessment.steps_count} 步</div>
                            </div>
                            <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>累積久站</div>
                                <div style={{ fontSize: '1.1rem', color: '#fff' }}>{latestAssessment.standing_hours} 小時</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '2rem',
                        border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center'
                    }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>目前尚無評估資料。<br />點擊上方「今日痛點評估」開始紀錄。</p>
                    </div>
                )}
            </div>

            {/* E-Commerce Teaser */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(168, 255, 120, 0.1), rgba(120, 255, 214, 0.1))',
                border: '1px solid rgba(168, 255, 120, 0.2)',
                borderRadius: '16px', padding: '1.25rem', marginTop: '1rem'
            }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#a8ff78', fontSize: '1rem' }}>🛍️ 專屬照護推薦</h3>
                <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    依據您的評估紀錄，建議使用夜間夾板或足弓支撐墊。現在結帳輸入 <strong style={{ color: '#fff' }}>CARE20</strong> 享專屬折扣。
                </p>
                <button style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
                    background: '#a8ff78', color: '#1a3630', fontWeight: 'bold', cursor: 'pointer'
                }}>
                    前往商城選購
                </button>
            </div>

            {/* Global Navigation */}
            <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', right: '1.5rem', zIndex: 100 }}>
                <Link href="/" style={{
                    display: 'block', padding: '1rem', background: 'rgba(20,20,20,0.85)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    color: '#fff', textAlign: 'center', borderRadius: '12px', textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold'
                }}>
                    ← 返回所有服務
                </Link>
            </div>
        </div>
    );
}
