'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';

const MOOD_EMOJIS = [
  { val: 1, label: '極差', emoji: '😭' },
  { val: 2, label: '偏低', emoji: '🥺' },
  { val: 3, label: '普通', emoji: '😐' },
  { val: 4, label: '不錯', emoji: '🙂' },
  { val: 5, label: '極佳', emoji: '🤩' },
];

const SLEEP_EMOJIS = [
  { val: 1, label: '極差', emoji: '😫' },
  { val: 2, label: '難入眠', emoji: '🥱' },
  { val: 3, label: '普通', emoji: '😐' },
  { val: 4, label: '穩定', emoji: '😴' },
  { val: 5, label: '深層', emoji: '🛌' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface DiaryEntry {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  diary: string | null;
  ai_feedback: string | null;
}

function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }));
  }
  return dates;
}

export default function ProgressPage() {
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [diaryText, setDiaryText] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [chartEntries, setChartEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [todayRes, chartRes] = await Promise.all([
          apiFetch('/api/women/diary/today'),
          apiFetch('/api/women/diary?limit=7'),
        ]);
        if (todayRes.ok) {
          const today: DiaryEntry | null = await todayRes.json();
          if (today) {
            setMood(today.mood);
            setSleep(today.sleep);
            setDiaryText(today.diary ?? '');
            setAiFeedback(today.ai_feedback ? `「${today.ai_feedback}」` : '');
            setIsSaved(true);
          }
        }
        if (chartRes.ok) {
          const { entries } = await chartRes.json();
          setChartEntries(entries);
        }
      } finally {
        setIsLoadingToday(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!mood || !sleep) {
      alert('請完成今日的情緒與睡眠評分喔！');
      return;
    }
    setIsSaved(true);
    setIsAnalyzing(true);
    setAiFeedback('');

    try {
      const res = await apiFetch('/api/women/diary', {
        method: 'POST',
        body: JSON.stringify({ mood, sleep, diary: diaryText }),
      });
      if (!res.ok) throw new Error('API error');
      const entry: DiaryEntry = await res.json();
      setAiFeedback(entry.ai_feedback ? `「${entry.ai_feedback}」` : '');
      const chartRes = await apiFetch('/api/women/diary?limit=7');
      if (chartRes.ok) {
        const { entries } = await chartRes.json();
        setChartEntries(entries);
      }
    } catch {
      setIsSaved(false);
      setAiFeedback('「謝謝妳願意記錄今天的心情。每一天的書寫，都是對自己最好的陪伴。」');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const last7Dates = getLastNDates(7);
  const entryByDate = Object.fromEntries(
    chartEntries.map((e) => [e.date.split('T')[0], e])
  );
  const chartData = last7Dates.map((dateStr) => ({
    dateStr,
    label: WEEKDAYS[new Date(dateStr + 'T12:00:00').getDay()],
    entry: entryByDate[dateStr] ?? null,
  }));

  if (isLoadingToday) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FA] to-[#E8F7F8] pb-8">
      <header className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link href="/" className="text-[#4A5D6E] text-sm font-medium">← 返回</Link>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#1E293B]">我的安定進度</h1>
          <p className="text-xs text-[#64748B] mt-0.5">每天記錄一點點，看見自己的變化</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="px-4 space-y-4">
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-[#1E293B] mb-4">📅 今日狀態打卡</h2>

          <div className="mb-4">
            <p className="text-sm text-[#64748B] mb-2">現在的情緒狀態如何？</p>
            <div className="flex justify-between">
              {MOOD_EMOJIS.map((item) => (
                <button
                  key={item.val}
                  onClick={() => !isSaved && setMood(item.val)}
                  disabled={isSaved}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    mood === item.val ? 'bg-[#DCE8EF] scale-110 shadow-sm' : 'hover:bg-[#F0F6FA]'
                  } ${isSaved ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] text-[#64748B]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-[#64748B] mb-2">昨晚的睡眠品質如何？</p>
            <div className="flex justify-between">
              {SLEEP_EMOJIS.map((item) => (
                <button
                  key={item.val}
                  onClick={() => !isSaved && setSleep(item.val)}
                  disabled={isSaved}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    sleep === item.val ? 'bg-[#E1F4F5] scale-110 shadow-sm' : 'hover:bg-[#F0F6FA]'
                  } ${isSaved ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] text-[#64748B]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-[#64748B] mb-2">有什麼想對自己說的嗎？(AI 小日記)</p>
            <textarea
              value={diaryText}
              onChange={(e) => setDiaryText(e.target.value)}
              disabled={isSaved}
              placeholder="寫下今天的開心、煩躁、身體不適，或是任何想抒發的心情..."
              className="w-full rounded-xl border border-[#DCE8EF] bg-[#F8FBFD] px-4 py-3 text-sm text-[#334155] placeholder-[#94A3B8] resize-none focus:outline-none focus:border-[#4A5D6E] disabled:opacity-70 disabled:cursor-default"
              rows={3}
            />
          </div>

          {!isSaved ? (
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-[#4A5D6E] text-white text-sm font-medium hover:bg-[#3d4f5e] transition-colors"
            >
              儲存紀錄並獲取 AI 分析
            </button>
          ) : (
            <div className="text-center text-sm text-[#4A5D6E] font-medium py-2">
              ✅ 今日紀錄已完成
            </div>
          )}
        </section>

        {isAnalyzing && (
          <section className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm text-[#64748B]">AI 正在生成專屬回覆...</span>
          </section>
        )}

        {aiFeedback && !isAnalyzing && (
          <section className="bg-gradient-to-br from-[#DCE8EF] to-[#E1F4F5] rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">✨</span>
              <div>
                <p className="text-xs font-medium text-[#4A5D6E] mb-1">女人療心室給妳的悄悄話</p>
                <p className="text-sm text-[#334155] leading-relaxed">{aiFeedback}</p>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#1E293B]">📊 最近 7 天趨勢</h2>
            <Link href="/progress/history" className="text-xs text-[#4A5D6E] font-medium">
              查看完整歷史 →
            </Link>
          </div>

          <div className="flex items-end justify-between gap-1 h-24">
            {chartData.map(({ dateStr, label, entry }) => (
              <div key={dateStr} className="flex flex-col items-center gap-1 flex-1">
                <div className="flex gap-0.5 items-end h-16">
                  <div className="w-3 bg-[#E2E8F0] rounded-t-sm overflow-hidden flex items-end">
                    {entry && (
                      <div
                        className="w-full bg-[#4A5D6E] rounded-t-sm transition-all"
                        style={{ height: `${(entry.mood / 5) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="w-3 bg-[#E2E8F0] rounded-t-sm overflow-hidden flex items-end">
                    {entry && (
                      <div
                        className="w-full bg-[#7ABFBF] rounded-t-sm transition-all"
                        style={{ height: `${(entry.sleep / 5) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8]">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#4A5D6E]" />
              <span className="text-[10px] text-[#64748B]">情緒</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#7ABFBF]" />
              <span className="text-[10px] text-[#64748B]">睡眠</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
