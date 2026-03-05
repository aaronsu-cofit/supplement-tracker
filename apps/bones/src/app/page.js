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
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>

      <Link href="/bones/scan" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(82, 194, 52, 0.2), rgba(6, 23, 0, 0.4))', border: '1px solid rgba(168, 255, 120, 0.3)', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>📷</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#a8ff78', fontSize: '1.1rem' }}>AI 拇趾外翻檢測</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>只要拍攝足部俯拍照，即可透過 AI 分析外翻角度與嚴重程度。</p>
          </div>
        </div>
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Link href="/bones/assess" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '2rem' }}>📝</div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>今日痛點評估</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>紀錄疼痛與活動力</p>
          </div>
        </Link>
        <Link href="/bones/history" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '2rem' }}>📸</div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>檢測歷程追蹤</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>追蹤外翻角度變化</p>
          </div>
        </Link>
      </div>

      <div>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📊</span> 近期狀態
        </h3>
        {latestAssessment ? (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>最新紀錄 {latestAssessment.date}</span>
              <span style={{ color: latestAssessment.nrs_pain_score > 3 ? '#ff9a9e' : '#a8ff78', fontWeight: 'bold' }}>疼痛指數: {latestAssessment.nrs_pain_score}/10</span>
            </div>
            {latestAssessment.pain_locations && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {latestAssessment.pain_locations.split(',').map((loc, idx) => (
                  <span key={idx} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{loc.trim()} 📍</span>
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
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '2rem', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>目前尚無評估資料。<br />點擊上方「今日痛點評估」開始紀錄。</p>
          </div>
        )}
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(168, 255, 120, 0.1), rgba(120, 255, 214, 0.1))', border: '1px solid rgba(168, 255, 120, 0.2)', borderRadius: '16px', padding: '1.25rem', marginTop: '1rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#a8ff78', fontSize: '1rem' }}>🛍️ 專屬照護推薦</h3>
        <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>依據您的評估紀錄，建議使用夜間夾板或足弓支撐墊。現在結帳輸入 <strong style={{ color: '#fff' }}>CARE20</strong> 享專屬折扣。</p>
        <button style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#a8ff78', color: '#1a3630', fontWeight: 'bold', cursor: 'pointer' }}>前往商城選購</button>
      </div>
    </div>
  );
}
