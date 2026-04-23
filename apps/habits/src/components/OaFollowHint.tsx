'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'habits.oa-hint.dismissed';

/**
 * Small banner reminding users to add the LINE OA as a friend so they
 * receive push notifications (mission_notify, badge_notify, scheduler
 * push). Rendered only when NEXT_PUBLIC_OA_FRIEND_URL is set; user can
 * dismiss and the choice persists in localStorage.
 */
export default function OaFollowHint() {
  const [hidden, setHidden] = useState(true);
  const url = process.env.NEXT_PUBLIC_OA_FRIEND_URL;

  useEffect(() => {
    if (!url) return;
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY) === '1';
      setHidden(dismissed);
    } catch {
      setHidden(false);
    }
  }, [url]);

  if (!url || hidden) return null;

  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <div className="card flex items-center gap-3 border-[var(--color-accent)]"
      style={{ borderWidth: 1, background: 'linear-gradient(135deg, #ede7fe 0%, #e0f7f5 100%)' }}>
      <div className="shrink-0 text-2xl">💌</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">加入 LINE 官方帳號</p>
        <p className="text-[11px] text-slate-600 mt-0.5">加好友才能收到任務完成通知、徽章與每日提醒</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <a href={url} target="_blank" rel="noreferrer" className="btn-primary text-xs">加好友</a>
        <button onClick={dismiss} className="text-[10px] text-slate-400 hover:text-slate-600">
          稍後再說
        </button>
      </div>
    </div>
  );
}
