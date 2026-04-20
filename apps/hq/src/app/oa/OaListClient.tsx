'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { LineOA } from '../../types';

interface AddForm {
  name: string;
  description: string;
  channel_access_token: string;
  channel_secret: string;
}

const EMPTY: AddForm = { name: '', description: '', channel_access_token: '', channel_secret: '' };

export default function OaListClient() {
  const [oas, setOas] = useState<LineOA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch('/api/line/oa')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ oas: LineOA[] }>;
      })
      .then(({ oas: data }) => setOas(data ?? []))
      .catch(err => {
        console.error('[oa/list] error', err);
        setError('無法載入 OA 列表');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.channel_access_token.trim()) {
      setAddError('請填 OA 名稱與 Channel Access Token');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch('/api/line/oa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setAddForm(EMPTY);
      setShowAdd(false);
      load();
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="hq-fade-in">
      <div className="hq-header flex items-center justify-between">
        <div>
          <h2>LINE OA</h2>
          <p>每個 OA 獨立管理 Rich Menu、劇本、AI agent 設定。</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="hq-btn-primary text-sm px-3 py-1.5"
        >
          {showAdd ? '取消' : '+ 新增 OA'}
        </button>
      </div>

      {showAdd && (
        <div className="hq-card p-4 flex flex-col gap-3 mb-6">
          <h3 className="font-semibold">新增 LINE OA</h3>
          <input className="hq-input" placeholder="OA 名稱（必填）"
            value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          <input className="hq-input" placeholder="說明（選填）"
            value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
          <input className="hq-input font-mono" type="password" placeholder="Channel Access Token"
            value={addForm.channel_access_token} onChange={e => setAddForm(p => ({ ...p, channel_access_token: e.target.value }))} />
          <input className="hq-input font-mono" type="password" placeholder="Channel Secret"
            value={addForm.channel_secret} onChange={e => setAddForm(p => ({ ...p, channel_secret: e.target.value }))} />
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button onClick={handleAdd} disabled={adding} className="hq-btn-primary">
            {adding ? '新增中...' : '確認新增'}
          </button>
        </div>
      )}

      {error && <div className="hq-alert hq-alert-error mb-4">{error}</div>}

      {loading ? (
        <div className="hq-card text-slate-500">載入中...</div>
      ) : oas.length === 0 ? (
        <div className="hq-card text-slate-500 text-center">尚無 OA — 點右上方新增</div>
      ) : (
        <div className="hq-grid-3">
          {oas.map(oa => (
            <Link
              key={oa.id}
              href={`/oa/${oa.id}`}
              className="hq-card hover:border-slate-400 transition-colors cursor-pointer no-underline text-inherit flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900">{oa.name}</h3>
                <span className={`hq-badge ${oa.is_active ? 'hq-badge-green' : 'hq-badge-gray'}`}>
                  {oa.is_active ? '啟用' : '停用'}
                </span>
              </div>
              <code className="text-xs text-slate-500 font-mono">#{oa.id}</code>
              {oa.description && <p className="text-sm text-slate-600">{oa.description}</p>}
              <div className="mt-2 text-xs text-slate-400 flex gap-2 flex-wrap">
                {oa.line_destination_id
                  ? <span className="text-emerald-600">✓ webhook</span>
                  : <span className="text-amber-600">✗ webhook 未配</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
