'use client';
import { apiFetch } from '@vitera/lib';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FOOT_ZONES = [
    { id: 'big_toe', label: '大拇趾 (外翻處)' },
    { id: 'arch', label: '足弓' },
    { id: 'heel', label: '足跟 (足底筋膜)' },
    { id: 'ball', label: '前腳掌' },
    { id: 'ankle', label: '腳踝' },
    { id: 'other', label: '其他' }
];

export default function BonesAssessPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [zoneScores, setZoneScores] = useState({});
    const [otherLabel, setOtherLabel] = useState('');
    const [steps, setSteps] = useState('');
    const [standingHours, setStandingHours] = useState('');

    const toggleZone = (id) => {
        setZoneScores(prev => {
            const next = { ...prev };
            if (id in next) {
                delete next[id];
            } else {
                next[id] = 5; // Default mid score
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if ('other' in zoneScores && !otherLabel.trim()) {
            alert('您選擇了「其他」痛點，請填寫對應的部位名稱');
            return;
        }

        setIsSubmitting(true);

        try {
            const locationsArr = Object.entries(zoneScores).map(([id, score]) => {
                let name = FOOT_ZONES.find(z => z.id === id)?.label;
                if (id === 'other') name = `其他: ${otherLabel.trim()}`;
                return `${name}(${score}分)`;
            });
            const pain_locations = locationsArr.join(', ');

            const maxScore = Object.keys(zoneScores).length > 0
                ? Math.max(...Object.values(zoneScores))
                : 0;

            const payload = {
                pain_locations,
                nrs_pain_score: maxScore,
                steps_count: parseInt(steps) || 0,
                standing_hours: parseFloat(standingHours) || 0,
            };

            const res = await apiFetch('/api/footcare/assessments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                router.push('/bones');
            } else {
                const err = await res.json();
                alert('儲存失敗：' + (err.error || '未知錯誤'));
            }
        } catch (err) {
            console.error(err);
            alert('發生系統錯誤，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>📝 今日足部評估</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>紀錄您的疼痛情況與日常活動，以利追蹤復原進度。</p>
            </header>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Visual Mapping Proxy (Buttons) */}
                <section>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold' }}>📍 今日痛點 (可複選)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {FOOT_ZONES.map(zone => {
                            const isSelected = zone.id in zoneScores;
                            return (
                                <div
                                    key={zone.id}
                                    onClick={() => toggleZone(zone.id)}
                                    style={{
                                        border: `1px solid ${isSelected ? '#a8ff78' : 'rgba(255,255,255,0.2)'}`,
                                        background: isSelected ? 'rgba(168, 255, 120, 0.1)' : 'rgba(255,255,255,0.05)',
                                        color: isSelected ? '#a8ff78' : '#fff',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: isSelected ? 'bold' : 'normal'
                                    }}
                                >
                                    {zone.label}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Per-Zone NRS Sliders */}
                {Object.keys(zoneScores).length > 0 && (
                    <section>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold' }}>⚡ 各部位疼痛指數 (0-10)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(zoneScores).map(([id, score]) => {
                                const zone = FOOT_ZONES.find(z => z.id === id);
                                return (
                                    <div key={id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {id === 'other' ? (
                                            <input
                                                type="text"
                                                placeholder="請輸入痛點名稱 (如: 左腳背)"
                                                value={otherLabel}
                                                onChange={e => setOtherLabel(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none'
                                                }}
                                                required
                                            />
                                        ) : (
                                            <div style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#a8ff78', fontSize: '1.1rem' }}>{zone.label}</div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>0 (無痛)</span>
                                            <input
                                                type="range"
                                                min="0" max="10" step="1"
                                                value={score}
                                                onChange={(e) => setZoneScores(prev => ({ ...prev, [id]: parseInt(e.target.value) }))}
                                                style={{ flex: 1, accentColor: score > 3 ? '#ff9a9e' : '#a8ff78' }}
                                            />
                                            <span style={{ color: score > 3 ? '#ff9a9e' : '#a8ff78', fontSize: '1.25rem', fontWeight: 'bold', minWidth: '24px', textAlign: 'right' }}>
                                                {score}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Activity Logging */}
                <section style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>👣 今日步數</label>
                        <input
                            type="number"
                            placeholder="例如: 8500"
                            value={steps}
                            onChange={e => setSteps(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'
                            }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>⏱️ 行走/久站時數</label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="例如: 3.5"
                            value={standingHours}
                            onChange={e => setStandingHours(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '8px',
                                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'
                            }}
                        />
                    </div>
                </section>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        padding: '1rem',
                        background: isSubmitting ? '#555' : '#a8ff78',
                        color: isSubmitting ? '#aaa' : '#1a3630',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        marginTop: '1rem'
                    }}
                >
                    {isSubmitting ? '儲存中...' : '儲存評估'}
                </button>
            </form>
        </div>
    );
}
