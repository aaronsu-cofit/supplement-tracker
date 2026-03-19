'use client';

import { apiFetch } from '@vitera/lib';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, MapPin, Activity, Clock, Timer, ChevronLeft } from 'lucide-react';

interface FootZone {
  id: string;
  label: string;
}

type ZoneScores = Record<string, number>;

const FOOT_ZONES: FootZone[] = [
  { id: 'big_toe', label: '大拇趾（外翻處）' },
  { id: 'arch', label: '足弓' },
  { id: 'heel', label: '足跟（足底筋膜）' },
  { id: 'ball', label: '前腳掌' },
  { id: 'ankle', label: '腳踝' },
  { id: 'other', label: '其他部位' },
];

export default function BonesAssessPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoneScores, setZoneScores] = useState<ZoneScores>({});
  const [otherLabel, setOtherLabel] = useState('');
  const [steps, setSteps] = useState('');
  const [standingHours, setStandingHours] = useState('');

  const toggleZone = (id: string) => {
    setZoneScores(prev => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = 5;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/');
      } else {
        const err: { error?: string } = await res.json();
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
    <div className="p-5 max-w-[600px] mx-auto flex flex-col gap-7">
      <header>
        <Link href="/" className="flex items-center gap-1 text-blue-600 no-underline text-[0.88rem] mb-3 hover:text-blue-700 transition-colors w-fit">
          <ChevronLeft size={16} />
          返回中心
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center">
            <ClipboardList size={20} className="text-blue-600" />
          </div>
          <h2 className="text-[1.35rem] font-bold m-0 text-slate-800">今日足部評估</h2>
        </div>
        <p className="text-slate-400 m-0 text-[0.88rem] leading-relaxed pl-[52px]">紀錄疼痛情況與日常活動，以利追蹤復原進度。</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-7">

        {/* 痛點選擇 */}
        <section>
          <label className="flex items-center gap-2 mb-3 font-semibold text-[0.88rem] text-slate-600">
            <MapPin size={15} className="text-blue-500" />
            今日痛點（可複選）
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {FOOT_ZONES.map(zone => {
              const isSelected = zone.id in zoneScores;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => toggleZone(zone.id)}
                  className={`p-3.5 rounded-[12px] text-center cursor-pointer transition-all duration-200 text-[0.9rem] min-h-[44px] border font-medium ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  {zone.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 疼痛指數滑桿 */}
        {Object.keys(zoneScores).length > 0 && (
          <section>
            <label className="flex items-center gap-2 mb-3 font-semibold text-[0.88rem] text-slate-600">
              <Activity size={15} className="text-blue-500" />
              各部位疼痛指數（0–10）
            </label>
            <div className="flex flex-col gap-3">
              {Object.entries(zoneScores).map(([id, score]) => {
                const zone = FOOT_ZONES.find(z => z.id === id);
                return (
                  <div key={id} className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm">
                    {id === 'other' ? (
                      <input
                        type="text"
                        placeholder="請輸入痛點名稱（如：左腳背）"
                        value={otherLabel}
                        onChange={e => setOtherLabel(e.target.value)}
                        className="w-full p-3 mb-4 rounded-[8px] border border-slate-300 bg-white text-slate-900 outline-none text-[0.9rem] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                        required
                      />
                    ) : (
                      <div className="font-semibold mb-4 text-slate-700 text-[0.95rem]">{zone?.label}</div>
                    )}

                    <div className="flex justify-between items-center gap-4">
                      <span className="text-slate-400 text-[0.8rem] shrink-0">無痛</span>
                      <input
                        type="range"
                        min="0" max="10" step="1"
                        value={score}
                        onChange={(e) => setZoneScores(prev => ({ ...prev, [id]: parseInt(e.target.value) }))}
                        className="flex-1"
                        style={{ accentColor: score > 3 ? '#dc2626' : '#059669' }}
                      />
                      <span
                        className="text-[1.15rem] font-bold min-w-[28px] text-right tabular-nums"
                        style={{ color: score > 3 ? '#dc2626' : '#059669' }}
                      >
                        {score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 活動紀錄 */}
        <section className="flex gap-3">
          <div className="flex-1">
            <label className="flex items-center gap-1.5 mb-2 font-semibold text-[0.85rem] text-slate-600">
              <Clock size={14} className="text-blue-500" />
              今日步數
            </label>
            <input
              type="number"
              placeholder="例如：8500"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              className="w-full p-3 rounded-[10px] bg-white border border-slate-300 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors min-h-[44px] text-[0.9rem] placeholder:text-slate-300"
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center gap-1.5 mb-2 font-semibold text-[0.85rem] text-slate-600">
              <Timer size={14} className="text-blue-500" />
              行走／久站時數
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="例如：3.5"
              value={standingHours}
              onChange={e => setStandingHours(e.target.value)}
              className="w-full p-3 rounded-[10px] bg-white border border-slate-300 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors min-h-[44px] text-[0.9rem] placeholder:text-slate-300"
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`p-4 rounded-[12px] border-none font-semibold text-[1rem] transition-colors duration-200 min-h-[52px] ${
            isSubmitting
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? '儲存中...' : '儲存今日評估'}
        </button>
      </form>
    </div>
  );
}
