'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { LineOA, Scenario } from '../../../../types';
import ScenarioListEditor from './scenario/ScenarioListEditor';

interface Props {
  oaId: string;
  oa: LineOA | null;
}

export default function OaScenariosTab({ oaId, oa }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (preferId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/wizard/oa/${oaId}/scenarios`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { scenarios: Scenario[] };
      const list = data.scenarios ?? [];
      setScenarios(list);
      if (preferId && list.some(s => s.id === preferId)) setSelectedId(preferId);
      else if (list.length > 0 && !list.some(s => s.id === selectedId)) setSelectedId(list[0].id);
    } catch (err) {
      console.error('[oa/scenarios] load error', err);
      setError('無法載入劇本列表');
    } finally {
      setLoading(false);
    }
  }, [oaId, selectedId]);

  useEffect(() => { load(); }, [oaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNew = async () => {
    const name = window.prompt('新劇本名稱：');
    if (!name?.trim()) return;
    try {
      const res = await apiFetch(`/api/wizard/oa/${oaId}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增失敗');
      setSelectedId(data.scenario.id);
      load(data.scenario.id);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (s: Scenario) => {
    if (!window.confirm(`刪除劇本「${s.name}」？`)) return;
    try {
      const res = await apiFetch(`/api/wizard/scenarios/${s.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (selectedId === s.id) setSelectedId(null);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleToggleActive = async (s: Scenario) => {
    try {
      const res = await apiFetch(`/api/wizard/scenarios/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失敗');
      setScenarios(prev => prev.map(x => x.id === s.id ? { ...x, is_active: data.scenario.is_active } : x));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleEnrollAll = async (s: Scenario) => {
    if (!window.confirm(`將所有 LINE 使用者加入「${s.name}」？`)) return;
    try {
      const res = await apiFetch(`/api/wizard/scenarios/${s.id}/enroll-all`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加入失敗');
      alert(`已處理 ${data.enrolled} 位使用者`);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSaved = (updated: Scenario) => {
    setScenarios(prev => prev.map(x => x.id === updated.id ? updated : x));
  };

  const selected = scenarios.find(s => s.id === selectedId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scenario picker bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 flex-wrap shrink-0">
        <button onClick={handleNew}
          className="text-xs px-2.5 py-1 rounded-md bg-[rgba(124,58,237,0.1)] text-[#7c3aed] border border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.18)] transition-colors font-medium">
          + 新劇本
        </button>
        {loading && <span className="text-xs text-slate-400">載入中...</span>}
        {scenarios.map(s => {
          const isSelected = s.id === selectedId;
          return (
            <div key={s.id} className="flex items-center gap-1">
              <button onClick={() => setSelectedId(s.id)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-100 text-slate-900 border-slate-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'
                }`}>
                {s.name}
                {s.is_active && <span className="ml-1 text-emerald-600">●</span>}
              </button>
              {isSelected && (
                <button onClick={() => handleDelete(s)}
                  title="刪除劇本"
                  className="text-[11px] w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 hover:text-red-500 hover:border-red-300">
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {error && <div className="hq-alert hq-alert-error m-6">{error}</div>}
        {!loading && scenarios.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            此 OA 尚無劇本 — 點上方「+ 新劇本」開始
          </div>
        )}
        {selected && (
          <ScenarioListEditor
            key={selected.id}
            scenario={selected}
            productId={oa?.product_id ?? null}
            oaId={oaId}
            onSaved={handleSaved}
            onToggleActive={() => handleToggleActive(selected)}
            onEnrollAll={() => handleEnrollAll(selected)}
            onOpenInWizard={() => window.open(`/wizard?oa=${oaId}`, '_blank')}
          />
        )}
      </div>
    </div>
  );
}
