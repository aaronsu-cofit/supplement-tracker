'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';

interface DiaryEntry {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  diary: string | null;
  ai_feedback: string | null;
}

const MOOD_EMOJIS = ['', '😭', '🥺', '😐', '🙂', '🤩'];
const SLEEP_EMOJIS = ['', '😫', '🥱', '😐', '😴', '🛌'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(dateStr: string): { display: string; weekday: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const display = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return { display, weekday: `週${WEEKDAYS[d.getDay()]}` };
}

function EmojiDots({ val, emojis }: { val: number; emojis: string[] }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-base ${i <= val ? 'opacity-100' : 'opacity-20'}`}>
          {emojis[i]}
        </span>
      ))}
    </div>
  );
}

function EntryCard({ entry }: { entry: DiaryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const { display, weekday } = formatDate(entry.date);
  const previewText = entry.diary
    ? entry.diary.length > 40 ? entry.diary.slice(0, 40) + '...' : entry.diary
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button className="w-full text-left p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-semibold text-[#1E293B]">{display}</span>
            <span className="text-xs text-[#94A3B8] ml-2">{weekday}</span>
          </div>
          <span className="text-[#94A3B8] text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] w-8">心情</span>
            <EmojiDots val={entry.mood} emojis={MOOD_EMOJIS} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] w-8">睡眠</span>
            <EmojiDots val={entry.sleep} emojis={SLEEP_EMOJIS} />
          </div>
        </div>
        {previewText && !expanded && (
          <p className="text-xs text-[#94A3B8] mt-2 truncate">{previewText}</p>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#F1F5F9]">
          {entry.diary && (
            <div className="mt-3">
              <p className="text-xs font-medium text-[#64748B] mb-1">日記</p>
              <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">{entry.diary}</p>
            </div>
          )}
          {entry.ai_feedback && (
            <div className="mt-3 bg-gradient-to-br from-[#DCE8EF] to-[#E1F4F5] rounded-xl p-3">
              <p className="text-xs font-medium text-[#4A5D6E] mb-1">✨ AI 回饋</p>
              <p className="text-sm text-[#334155] leading-relaxed">「{entry.ai_feedback}」</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadEntries = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const res = await apiFetch(`/api/women/diary?page=${pageNum}&limit=20`);
      if (!res.ok) return;
      const data: { entries: DiaryEntry[]; total: number; hasMore: boolean } = await res.json();
      setEntries((prev) => append ? [...prev, ...data.entries] : data.entries);
      setHasMore(data.hasMore);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadEntries(1, false);
  }, [loadEntries]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadEntries(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page, loadEntries]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(currentMonth));
  const avgMood = monthEntries.length
    ? (monthEntries.reduce((s, e) => s + e.mood, 0) / monthEntries.length).toFixed(1)
    : null;
  const avgSleep = monthEntries.length
    ? (monthEntries.reduce((s, e) => s + e.sleep, 0) / monthEntries.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FA] to-[#E8F7F8] pb-10">
      <header className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link href="/progress" className="text-[#4A5D6E] text-sm font-medium">← 返回</Link>
        <h1 className="text-lg font-semibold text-[#1E293B]">完整歷史紀錄</h1>
        <div className="w-10" />
      </header>

      <div className="px-4 space-y-4">
        {(avgMood || avgSleep) && (
          <section className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-[#64748B] mb-3">本月平均</p>
            <div className="flex gap-6">
              {avgMood && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#4A5D6E]">{avgMood}</p>
                  <p className="text-xs text-[#94A3B8]">情緒分數</p>
                </div>
              )}
              {avgSleep && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#7ABFBF]">{avgSleep}</p>
                  <p className="text-xs text-[#94A3B8]">睡眠分數</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-[#94A3B8]">{monthEntries.length}</p>
                <p className="text-xs text-[#94A3B8]">紀錄天數</p>
              </div>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-sm text-[#64748B]">還沒有任何紀錄</p>
            <p className="text-xs text-[#94A3B8] mt-1">回到今日打卡，開始第一筆記錄吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-4" />

        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!hasMore && entries.length > 0 && (
          <p className="text-center text-xs text-[#94A3B8] py-2">
            已顯示全部 {entries.length} 筆紀錄
          </p>
        )}
      </div>
    </div>
  );
}
