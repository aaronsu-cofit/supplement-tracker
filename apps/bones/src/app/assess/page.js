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
                router.push('/');
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
        <div className="p-6 max-w-[600px] mx-auto flex flex-col gap-8">
            <header>
                <h2 className="text-[1.5rem] font-bold m-0 mb-2">📝 今日足部評估</h2>
                <p className="text-white/60 m-0 text-[0.9rem]">紀錄您的疼痛情況與日常活動，以利追蹤復原進度。</p>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                {/* Visual Mapping Proxy (Buttons) */}
                <section>
                    <label className="block mb-3 font-bold">📍 今日痛點 (可複選)</label>
                    <div className="grid grid-cols-2 gap-3">
                        {FOOT_ZONES.map(zone => {
                            const isSelected = zone.id in zoneScores;
                            return (
                                <div
                                    key={zone.id}
                                    onClick={() => toggleZone(zone.id)}
                                    className={`p-4 rounded-[12px] text-center cursor-pointer transition-all duration-200 ${
                                        isSelected
                                            ? 'border border-[#a8ff78] bg-[rgba(168,255,120,0.1)] text-[#a8ff78] font-bold'
                                            : 'border border-white/20 bg-white/5 text-white font-normal'
                                    }`}
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
                        <label className="block mb-3 font-bold">⚡ 各部位疼痛指數 (0-10)</label>
                        <div className="flex flex-col gap-4">
                            {Object.entries(zoneScores).map(([id, score]) => {
                                const zone = FOOT_ZONES.find(z => z.id === id);
                                return (
                                    <div key={id} className="bg-black/20 p-5 rounded-[12px] border border-white/[0.05]">
                                        {id === 'other' ? (
                                            <input
                                                type="text"
                                                placeholder="請輸入痛點名稱 (如: 左腳背)"
                                                value={otherLabel}
                                                onChange={e => setOtherLabel(e.target.value)}
                                                className="w-full p-3 mb-4 rounded-[8px] border border-white/20 bg-white/5 text-white outline-none"
                                                required
                                            />
                                        ) : (
                                            <div className="font-bold mb-4 text-[#a8ff78] text-[1.1rem]">{zone.label}</div>
                                        )}

                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-white/50 text-[0.85rem]">0 (無痛)</span>
                                            <input
                                                type="range"
                                                min="0" max="10" step="1"
                                                value={score}
                                                onChange={(e) => setZoneScores(prev => ({ ...prev, [id]: parseInt(e.target.value) }))}
                                                className="flex-1"
                                                style={{ accentColor: score > 3 ? '#ff9a9e' : '#a8ff78' }}
                                            />
                                            <span className="text-[1.25rem] font-bold min-w-[24px] text-right" style={{ color: score > 3 ? '#ff9a9e' : '#a8ff78' }}>
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
                <section className="flex gap-4">
                    <div className="flex-1">
                        <label className="block mb-2 font-bold text-[0.9rem]">👣 今日步數</label>
                        <input
                            type="number"
                            placeholder="例如: 8500"
                            value={steps}
                            onChange={e => setSteps(e.target.value)}
                            className="w-full p-3 rounded-[8px] bg-black/20 border border-white/10 text-white outline-none"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block mb-2 font-bold text-[0.9rem]">⏱️ 行走/久站時數</label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="例如: 3.5"
                            value={standingHours}
                            onChange={e => setStandingHours(e.target.value)}
                            className="w-full p-3 rounded-[8px] bg-black/20 border border-white/10 text-white outline-none"
                        />
                    </div>
                </section>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`p-4 rounded-[12px] border-none font-bold text-[1.1rem] mt-4 transition-colors duration-200 ${
                        isSubmitting
                            ? 'bg-[#555] text-[#aaa] cursor-not-allowed'
                            : 'bg-[#a8ff78] text-[#1a3630] cursor-pointer'
                    }`}
                >
                    {isSubmitting ? '儲存中...' : '儲存評估'}
                </button>
            </form>
        </div>
    );
}
