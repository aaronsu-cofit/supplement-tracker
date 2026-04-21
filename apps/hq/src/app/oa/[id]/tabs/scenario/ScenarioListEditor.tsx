'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Scenario,
  ScenarioFlowNode,
  ScenarioNodeType,
  ContentItem,
  MissionTemplate,
} from '../../../../../types';
import { toListModel, fromListModel, genId, type DayGroup } from './listModel';
import {
  PushMessageEditor,
  AiSkillEditor,
  MenuChangeEditor,
  MissionAssignEditor,
  StreakIncrementEditor,
  SetAttributeEditor,
  nodeTypeLabel,
  nodeTypeIcon,
  summarizeNode,
} from './actionEditors';

interface Props {
  scenario: Scenario;
  productId: string | null;
  onSaved: (updated: Scenario) => void;
  onToggleActive: () => void;
  onEnrollAll: () => void;
  onOpenInWizard: () => void;
}

const ACTION_NODE_TYPES: Array<{ type: ScenarioNodeType; label: string }> = [
  { type: 'push-message-node', label: '訊息' },
  { type: 'mission-assign-node', label: '指派任務' },
  { type: 'streak-increment-node', label: '連續天數 +1' },
  { type: 'set-attribute-node', label: '設定屬性' },
  { type: 'ai-skill-node', label: 'AI 技能' },
  { type: 'menu-change-node', label: '切換選單' },
];

export default function ScenarioListEditor({
  scenario,
  productId,
  onSaved,
  onToggleActive,
  onEnrollAll,
  onOpenInWizard,
}: Props) {
  const [days, setDays] = useState<DayGroup[]>(() =>
    toListModel(scenario.flow_nodes ?? [], scenario.flow_edges ?? []),
  );
  const [name, setName] = useState(scenario.name);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(days.map(d => d.dayNodeId)));
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [missions, setMissions] = useState<MissionTemplate[]>([]);

  // Reset when the selected scenario changes from outside
  useEffect(() => {
    setDays(toListModel(scenario.flow_nodes ?? [], scenario.flow_edges ?? []));
    setName(scenario.name);
    setExpanded(new Set((scenario.flow_nodes ?? []).filter(n => n.type === 'day-node').map(n => n.id)));
    setEditingActionId(null);
    setStatus(null);
  }, [scenario.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load product assets for dropdowns
  useEffect(() => {
    if (!productId) { setContentItems([]); setMissions([]); return; }
    apiFetch(`/api/products/${productId}/content`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setContentItems(d.items ?? []))
      .catch(() => {});
    apiFetch(`/api/products/${productId}/missions`)
      .then(r => r.ok ? r.json() : { missions: [] })
      .then(d => setMissions(d.missions ?? []))
      .catch(() => {});
  }, [productId]);

  const dirty = useMemo(() => {
    const base = fromListModel(toListModel(scenario.flow_nodes ?? [], scenario.flow_edges ?? []));
    const current = fromListModel(days);
    return (
      name !== scenario.name ||
      JSON.stringify(base.nodes) !== JSON.stringify(current.nodes) ||
      JSON.stringify(base.edges) !== JSON.stringify(current.edges)
    );
  }, [days, name, scenario]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus(null);
    try {
      const { nodes, edges } = fromListModel(days);
      const res = await apiFetch(`/api/wizard/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, flow_nodes: nodes, flow_edges: edges }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      onSaved(data.scenario);
      setStatus({ type: 'success', message: '已儲存' });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [days, name, scenario.id, onSaved]);

  const addDay = () => {
    const maxDay = days.reduce((m, d) => Math.max(m, d.day), -1);
    const newDay = maxDay + 1;
    const dayNodeId = genId('day');
    const next: DayGroup = { dayNodeId, day: newDay, label: `Day ${newDay}`, actions: [] };
    setDays([...days, next]);
    setExpanded(prev => new Set([...prev, dayNodeId]));
  };

  const updateDay = (idx: number, patch: Partial<DayGroup>) => {
    setDays(days.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const removeDay = (idx: number) => {
    const d = days[idx];
    if (!window.confirm(`刪除 ${d.label} 及其 ${d.actions.length} 個動作？`)) return;
    setDays(days.filter((_, i) => i !== idx));
  };

  const addAction = (dayIdx: number, type: ScenarioNodeType) => {
    const newNode: ScenarioFlowNode = {
      id: genId('act'),
      type,
      data: type === 'push-message-node' ? { type: 'text' } : {},
    };
    setDays(days.map((d, i) =>
      i === dayIdx ? { ...d, actions: [...d.actions, newNode] } : d,
    ));
    setEditingActionId(newNode.id);
  };

  const updateAction = (dayIdx: number, actionIdx: number, node: ScenarioFlowNode) => {
    setDays(days.map((d, i) => {
      if (i !== dayIdx) return d;
      const actions = [...d.actions];
      actions[actionIdx] = node;
      return { ...d, actions };
    }));
  };

  const removeAction = (dayIdx: number, actionIdx: number) => {
    setDays(days.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, actions: d.actions.filter((_, j) => j !== actionIdx) };
    }));
  };

  const renderEditor = (
    node: ScenarioFlowNode,
    dayIdx: number,
    actionIdx: number,
  ) => {
    const editorProps = {
      node,
      onChange: (n: ScenarioFlowNode) => updateAction(dayIdx, actionIdx, n),
      contentItems,
      missions,
    };
    switch (node.type) {
      case 'push-message-node': return <PushMessageEditor {...editorProps} />;
      case 'ai-skill-node': return <AiSkillEditor {...editorProps} />;
      case 'menu-change-node': return <MenuChangeEditor {...editorProps} />;
      case 'mission-assign-node': return <MissionAssignEditor {...editorProps} />;
      case 'streak-increment-node': return <StreakIncrementEditor {...editorProps} />;
      case 'set-attribute-node': return <SetAttributeEditor {...editorProps} />;
      default: return null;
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4 max-w-4xl">
      {/* Scenario header */}
      <div className="hq-card flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <input className="hq-input text-lg font-semibold max-w-sm"
            value={name} onChange={e => setName(e.target.value)} />
          <div className="flex items-center gap-2">
            <button onClick={onToggleActive}
              className={`text-xs px-3 py-1 rounded border transition-colors ${
                scenario.is_active
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {scenario.is_active ? '● 啟用中' : '停用中'}
            </button>
            <button onClick={onEnrollAll}
              className="text-xs px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
              全體加入
            </button>
            <button onClick={onOpenInWizard}
              className="text-xs px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
              title="切換到進階流程圖編輯器">
              流程圖 ⧉
            </button>
          </div>
        </div>
        {!productId && (
          <div className="hq-alert hq-alert-error text-xs">
            此 OA 尚未綁定產品；指派任務、連續天數、設定屬性等動作在排程時會被跳過。建議到設定頁綁定產品後再使用這些動作。
          </div>
        )}
        {status && (
          <div className={`hq-alert ${status.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'}`}>
            {status.message}
          </div>
        )}
      </div>

      {/* Days */}
      {days.length === 0 ? (
        <div className="hq-card text-center text-slate-500 py-8">
          尚無日程 — 點下方「+ 新增 Day」開始
        </div>
      ) : (
        days.map((day, dayIdx) => {
          const isOpen = expanded.has(day.dayNodeId);
          return (
            <div key={day.dayNodeId} className="hq-card flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setExpanded(prev => {
                    const next = new Set(prev);
                    if (next.has(day.dayNodeId)) next.delete(day.dayNodeId);
                    else next.add(day.dayNodeId);
                    return next;
                  })}
                    className="text-sm text-slate-500 hover:text-slate-900">
                    {isOpen ? '▼' : '▶'}
                  </button>
                  <span className="text-xs text-slate-500">Day</span>
                  <input type="number" className="hq-input text-sm w-20" value={day.day}
                    onChange={e => updateDay(dayIdx, { day: Number(e.target.value) || 0 })} />
                  <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="label"
                    value={day.label}
                    onChange={e => updateDay(dayIdx, { label: e.target.value })} />
                  <span className="text-xs text-slate-400">{day.actions.length} 動作</span>
                </div>
                <button onClick={() => removeDay(dayIdx)}
                  className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                  刪除 Day
                </button>
              </div>

              {isOpen && (
                <>
                  {day.actions.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-4">尚無動作</p>
                  ) : (
                    <ul className="flex flex-col gap-2 pl-4">
                      {day.actions.map((action, actionIdx) => {
                        const isEditing = editingActionId === action.id;
                        return (
                          <li key={action.id}
                            className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 flex flex-col gap-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{nodeTypeIcon(action.type)}</span>
                                <span className="text-xs font-semibold text-slate-600">
                                  {nodeTypeLabel(action.type)}
                                </span>
                                <span className="text-sm text-slate-700">{summarizeNode(action)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setEditingActionId(isEditing ? null : action.id)}
                                  className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                                  {isEditing ? '收合' : '編輯'}
                                </button>
                                <button onClick={() => removeAction(dayIdx, actionIdx)}
                                  className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                                  刪除
                                </button>
                              </div>
                            </div>
                            {isEditing && renderEditor(action, dayIdx, actionIdx)}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="flex items-center gap-2 flex-wrap pl-4">
                    <span className="text-xs text-slate-500">+ 新增動作：</span>
                    {ACTION_NODE_TYPES.map(t => (
                      <button key={t.type}
                        onClick={() => addAction(dayIdx, t.type)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
                        {nodeTypeIcon(t.type)} {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}

      {/* Footer controls */}
      <div className="flex items-center gap-2">
        <button onClick={addDay}
          className="text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
          + 新增 Day
        </button>
        <div className="flex-1" />
        {dirty && <span className="text-xs text-amber-600">未儲存的變更</span>}
        <button onClick={handleSave} disabled={saving || !dirty}
          className="hq-btn-primary text-sm disabled:opacity-50">
          {saving ? '儲存中…' : '儲存'}
        </button>
      </div>
    </div>
  );
}
