'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import { useProductId } from '../../../../lib/productId';

interface SettingResponse {
  setting: {
    daily_target: number | null;
    reminder_enabled: boolean | null;
    reminder_time: string | null;
  };
  template_defaults: {
    daily_target: number | null;
    unit: string | null;
    reminder: { enabled?: boolean; time?: string } | null;
  };
}

interface Props { missionKey: string }

export default function HabitSettingsClient({ missionKey }: Props) {
  const productId = useProductId();
  const [data, setData] = useState<SettingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dailyTarget, setDailyTarget] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState<'default' | 'on' | 'off'>('default');
  const [reminderTime, setReminderTime] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/me/habits/${encodeURIComponent(missionKey)}/setting?product_id=${encodeURIComponent(productId)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json() as SettingResponse;
      setData(d);
      setDailyTarget(d.setting.daily_target != null ? String(d.setting.daily_target) : '');
      setReminderEnabled(
        d.setting.reminder_enabled === true ? 'on'
          : d.setting.reminder_enabled === false ? 'off'
          : 'default',
      );
      setReminderTime(d.setting.reminder_time ?? '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [productId, missionKey]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!productId) return;
    setSaving(true);
    setStatus(null);
    try {
      const body: Record<string, unknown> = { product_id: productId };
      const parsed = dailyTarget.trim() === '' ? null : parseInt(dailyTarget, 10);
      if (parsed !== null && (isNaN(parsed) || parsed < 1)) {
        throw new Error('每日目標需為 >= 1 的整數');
      }
      body.daily_target = parsed;
      body.reminder_enabled = reminderEnabled === 'default' ? null : reminderEnabled === 'on';
      body.reminder_time = reminderEnabled === 'on' && reminderTime ? reminderTime : null;

      const res = await apiFetch(`/api/me/habits/${encodeURIComponent(missionKey)}/setting`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setStatus('已儲存');
      load();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!productId) return <div className="card text-sm text-slate-500">找不到產品 ID。</div>;
  if (loading) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const { template_defaults: def } = data;

  return (
    <div className="flex flex-col gap-3">
      <div className="mt-1 flex items-center justify-between">
        <Link href={`/habits/${encodeURIComponent(missionKey)}?product_id=${encodeURIComponent(productId)}`}
          className="text-sm text-slate-500">← 回習慣</Link>
      </div>

      <header className="card">
        <h1 className="text-xl font-bold">個人化設定</h1>
        <p className="text-xs text-slate-500 mt-1 font-mono">{missionKey}</p>
      </header>

      {def.daily_target != null && (
        <section className="card flex flex-col gap-2">
          <h2 className="text-sm font-semibold">每日目標</h2>
          <p className="text-xs text-slate-500">
            預設：{def.daily_target}{def.unit ?? ''}。留空則沿用預設。
          </p>
          <div className="flex items-center gap-2">
            <input type="number" min={1}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder={`${def.daily_target}`}
              value={dailyTarget}
              onChange={e => setDailyTarget(e.target.value)} />
            {def.unit && <span className="text-sm text-slate-500">{def.unit}</span>}
          </div>
        </section>
      )}

      <section className="card flex flex-col gap-2">
        <h2 className="text-sm font-semibold">每日提醒</h2>
        <p className="text-xs text-slate-500">
          預設：{def.reminder?.enabled ? `開啟 (${def.reminder.time ?? '—'})` : '關閉'}
        </p>
        <div className="flex items-center gap-1">
          {([
            ['default', '跟隨預設'],
            ['on', '開啟'],
            ['off', '關閉'],
          ] as const).map(([k, label]) => (
            <button key={k}
              onClick={() => setReminderEnabled(k)}
              className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                reminderEnabled === k
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
        {reminderEnabled === 'on' && (
          <input type="time"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={reminderTime}
            onChange={e => setReminderTime(e.target.value)} />
        )}
      </section>

      {status && (
        <div className={`card text-sm ${status === '已儲存' ? 'text-emerald-700' : 'text-red-600'}`}>
          {status}
        </div>
      )}

      <button onClick={save} disabled={saving} className="btn-primary mt-2 disabled:opacity-50">
        {saving ? '儲存中...' : '儲存'}
      </button>
    </div>
  );
}
