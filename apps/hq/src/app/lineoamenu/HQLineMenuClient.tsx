'use client';
import { apiFetch } from '@vitera/lib';
import { useState, useEffect, useCallback } from 'react';
import type { LineOA, LineTemplate, Zone, ActionStatus } from '../../types';

interface OAEditForm {
  name: string;
  description: string;
  channel_access_token: string;
}

const DEFAULT_ZONES: Zone[] = [
  { id: 'A', position: '左上', label: '', uri: '' },
  { id: 'B', position: '右上', label: '', uri: '' },
  { id: 'C', position: '左下', label: '', uri: '' },
  { id: 'D', position: '右下', label: '', uri: '' },
];
const EMPTY_ADD_FORM: OAEditForm = { name: '', description: '', channel_access_token: '' };

export default function HQLineMenuClient() {
  // ── OA list state ──────────────────────────────────────────────────────────
  const [oaList, setOaList] = useState<LineOA[]>([]);
  const [isLoadingOAs, setIsLoadingOAs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<OAEditForm>(EMPTY_ADD_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingOAId, setEditingOAId] = useState<string | null>(null);
  const [editOAForm, setEditOAForm] = useState<OAEditForm>({ name: '', description: '', channel_access_token: '' });
  const [isSavingOA, setIsSavingOA] = useState(false);
  const [selectedOA, setSelectedOA] = useState<LineOA | null>(null);

  // ── Template list state ────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<LineTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // ── Template editor state ──────────────────────────────────────────────────
  const [editingTemplate, setEditingTemplate] = useState<LineTemplate | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateImageFile, setTemplateImageFile] = useState<File | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [isRemovingMenu, setIsRemovingMenu] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus | null>(null);

  // ── User menu assignment state ─────────────────────────────────────────────
  const [assignments, setAssignments] = useState<{
    id: number;
    user_id: string;
    template_id: number | null;
    template_name: string | null;
    source: string;
    assigned_at: string;
  }[]>([]);
  const [evalUserId, setEvalUserId] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  // ── Load OAs ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchOAs = async () => {
      setIsLoadingOAs(true);
      setLoadError(null);
      try {
        const res = await apiFetch('/api/line/oa');
        const data = await res.json();
        if (!cancelled) setOaList(data.oas || []);
      } catch {
        if (!cancelled) setLoadError('無法載入 LINE OA 列表');
      } finally {
        if (!cancelled) setIsLoadingOAs(false);
      }
    };
    fetchOAs();
    return () => { cancelled = true; };
  }, []);

  // ── Load templates when OA selected ───────────────────────────────────────
  const fetchTemplates = useCallback(async (oaId: string) => {
    setIsLoadingTemplates(true);
    try {
      const res = await apiFetch(`/api/line/oa/${oaId}/templates`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  const loadAssignments = useCallback(async (oaId: string) => {
    try {
      const res = await apiFetch(`/api/menu/assignments/${oaId}`);
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      setAssignments([]);
    }
  }, []);

  const handleSelectOA = (oa: LineOA) => {
    setSelectedOA(oa);
    setEditingOAId(null);
    setEditingTemplate(null);
    setTemplateImageFile(null);
    setActionStatus(null);
    setShowNewTemplateForm(false);
    setNewTemplateName('');
    setAssignments([]);
    setEvalUserId('');
    fetchTemplates(oa.id);
    loadAssignments(oa.id);
  };

  const handleEvaluate = async () => {
    if (!selectedOA || !evalUserId.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await apiFetch('/api/menu/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oa_id: selectedOA.id, user_line_id: evalUserId.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionStatus({ type: 'error', message: data.error || '評估失敗' });
        return;
      }
      setActionStatus({ type: 'success', message: '已評估並分配選單' });
      await loadAssignments(selectedOA.id);
    } catch {
      setActionStatus({ type: 'error', message: '評估失敗，請確認 OA ID 設定正確' });
    } finally {
      setIsEvaluating(false);
    }
  };

  // ── OA CRUD ────────────────────────────────────────────────────────────────
  const handleAddOA = async () => {
    if (!addForm.name.trim() || !addForm.channel_access_token.trim()) {
      setAddError('名稱與 Channel Access Token 為必填');
      return;
    }
    setIsAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch('/api/line/oa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || '新增失敗'); return; }
      setOaList(prev => [data.oa, ...prev]);
      setAddForm(EMPTY_ADD_FORM);
      setShowAddForm(false);
    } catch {
      setAddError('網路錯誤');
    } finally {
      setIsAdding(false);
    }
  };

  const startEditOA = (oa: LineOA) => {
    setEditingOAId(oa.id);
    setEditOAForm({ name: oa.name, description: oa.description || '', channel_access_token: '' });
    setSelectedOA(null);
    setEditingTemplate(null);
  };

  const handleSaveOAEdit = async (id: string) => {
    setIsSavingOA(true);
    try {
      const payload = {
        name: editOAForm.name,
        description: editOAForm.description,
        ...(editOAForm.channel_access_token && { channel_access_token: editOAForm.channel_access_token }),
      };
      const res = await apiFetch(`/api/line/oa/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return;
      setOaList(prev => prev.map(o => o.id === id ? { ...o, ...data.oa } : o));
      setEditingOAId(null);
    } catch { /* ignore */ } finally {
      setIsSavingOA(false);
    }
  };

  const handleToggleActive = async (oa: LineOA) => {
    const res = await apiFetch(`/api/line/oa/${oa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !oa.is_active }),
    });
    const data = await res.json();
    if (res.ok) {
      setOaList(prev => prev.map(o => o.id === oa.id ? { ...o, ...data.oa } : o));
      if (selectedOA?.id === oa.id) setSelectedOA(prev => prev ? { ...prev, ...data.oa } : null);
    }
  };

  const handleDeleteOA = async (id: string) => {
    if (!confirm('確定要刪除此 LINE OA 設定？此操作無法復原。')) return;
    await apiFetch(`/api/line/oa/${id}`, { method: 'DELETE' });
    setOaList(prev => prev.filter(o => o.id !== id));
    if (selectedOA?.id === id) { setSelectedOA(null); setTemplates([]); }
  };

  // ── Template CRUD ──────────────────────────────────────────────────────────
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !selectedOA) return;
    setIsCreatingTemplate(true);
    try {
      const res = await apiFetch(`/api/line/oa/${selectedOA.id}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTemplateName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setTemplates(prev => [data.template, ...prev]);
      setNewTemplateName('');
      setShowNewTemplateForm(false);
      // Open editor for the new template
      setEditingTemplate({ ...data.template, zones: data.template.zones || DEFAULT_ZONES.map(z => ({ ...z })) });
      setTemplateImageFile(null);
      setActionStatus(null);
    } catch { /* ignore */ } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleEditTemplate = (template: LineTemplate) => {
    setEditingTemplate({ ...template, zones: template.zones?.map(z => ({ ...z })) ?? DEFAULT_ZONES.map(z => ({ ...z })) });
    setTemplateImageFile(null);
    setActionStatus(null);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !selectedOA) return;
    setIsSavingTemplate(true);
    try {
      const res = await apiFetch(`/api/line/oa/${selectedOA.id}/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingTemplate.name, zones: editingTemplate.zones }),
      });
      const data = await res.json();
      if (!res.ok) { setActionStatus({ type: 'error', message: data.error || '儲存失敗' }); return; }
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data.template : t));
      setEditingTemplate(data.template);
      setActionStatus({ type: 'success', message: '模板設定已儲存' });
    } catch {
      setActionStatus({ type: 'error', message: '網路錯誤' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeployTemplate = async () => {
    if (!editingTemplate || !selectedOA) return;
    if (!templateImageFile) {
      setActionStatus({ type: 'error', message: '請先上傳選單圖片（2500×1686）' });
      return;
    }
    for (const z of editingTemplate.zones) {
      if (!z.uri.trim()) {
        setActionStatus({ type: 'error', message: `請填入「${z.position}（${z.id}）」的 LIFF URI` });
        return;
      }
    }
    setIsDeploying(true);
    setActionStatus(null);

    // Save zones first, then deploy
    try {
      const saveRes = await apiFetch(`/api/line/oa/${selectedOA.id}/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingTemplate.name, zones: editingTemplate.zones }),
      });
      if (!saveRes.ok) { setActionStatus({ type: 'error', message: '儲存設定失敗' }); return; }

      const formData = new FormData();
      formData.append('image', templateImageFile);
      const res = await apiFetch(`/api/line/oa/${selectedOA.id}/templates/${editingTemplate.id}/deploy`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(prev => prev.map(t =>
          t.id === editingTemplate.id ? data.template : { ...t, is_active: false }
        ));
        setEditingTemplate(data.template);
        setActionStatus({ type: 'success', message: `Rich Menu 已部署並啟用！ID: ${data.richMenuId}` });
        setTemplateImageFile(null);
      } else {
        setActionStatus({ type: 'error', message: data.error || '部署失敗' });
      }
    } catch {
      setActionStatus({ type: 'error', message: '網路連線錯誤' });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleActivateTemplate = async (template: LineTemplate) => {
    if (!selectedOA) return;
    setIsActivating(template.id);
    setActionStatus(null);
    try {
      const res = await apiFetch(`/api/line/oa/${selectedOA.id}/templates/${template.id}/activate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(prev => prev.map(t =>
          t.id === template.id ? data.template : { ...t, is_active: false }
        ));
        if (editingTemplate?.id === template.id) setEditingTemplate(data.template);
        setActionStatus({ type: 'success', message: `「${template.name}」已切換為啟用選單` });
      } else {
        setActionStatus({ type: 'error', message: data.error || '切換失敗' });
      }
    } catch {
      setActionStatus({ type: 'error', message: '網路連線錯誤' });
    } finally {
      setIsActivating(null);
    }
  };

  const handleRemoveRichMenu = async () => {
    if (!selectedOA || !confirm('確定要移除此 LINE OA 的預設 Rich Menu？使用者將看不到任何選單。')) return;
    setIsRemovingMenu(true);
    setActionStatus(null);
    try {
      const res = await apiFetch(`/api/line/oa/${selectedOA.id}/richmenu`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTemplates(prev => prev.map(t => ({ ...t, is_active: false })));
        if (editingTemplate) setEditingTemplate(prev => prev ? { ...prev, is_active: false } : null);
        setActionStatus({ type: 'success', message: 'Rich Menu 已移除，使用者目前看不到任何選單' });
      } else {
        setActionStatus({ type: 'error', message: data.error || '移除失敗' });
      }
    } catch {
      setActionStatus({ type: 'error', message: '網路連線錯誤' });
    } finally {
      setIsRemovingMenu(false);
    }
  };

  const handleDeleteTemplate = async (template: LineTemplate) => {
    if (!selectedOA || !confirm(`確定要刪除模板「${template.name}」？`)) return;
    await apiFetch(`/api/line/oa/${selectedOA.id}/templates/${template.id}`, { method: 'DELETE' });
    setTemplates(prev => prev.filter(t => t.id !== template.id));
    if (editingTemplate?.id === template.id) setEditingTemplate(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="hq-fade-in">
      <h2 className="hq-section-title">
        <span className="hq-dot-green"></span>
        LINE OA 選單管理
      </h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: OA List ── */}
        <div className="lg:w-[320px] flex-shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="hq-muted-text text-sm">共 {oaList.length} 個帳號</span>
            <button
              onClick={() => { setShowAddForm(v => !v); setAddError(null); }}
              className="hq-btn-primary text-sm px-3 py-1.5"
            >
              {showAddForm ? '取消' : '+ 新增 OA'}
            </button>
          </div>

          {showAddForm && (
            <div className="hq-card p-4 flex flex-col gap-3">
              <h4 className="font-semibold text-sm">新增 LINE OA</h4>
              <input className="hq-input text-sm" placeholder="OA 名稱（必填）"
                value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
              <input className="hq-input text-sm" placeholder="說明（選填）"
                value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
              <input className="hq-input text-sm font-mono" placeholder="Channel Access Token（必填）" type="password"
                value={addForm.channel_access_token} onChange={e => setAddForm(p => ({ ...p, channel_access_token: e.target.value }))} />
              {addError && <p className="text-xs text-red-400">{addError}</p>}
              <button onClick={handleAddOA} disabled={isAdding} className="hq-btn-primary text-sm">
                {isAdding ? <><span className="hq-spinner"></span> 新增中...</> : '確認新增'}
              </button>
            </div>
          )}

          {isLoadingOAs ? (
            <div className="hq-card flex items-center gap-2 p-4 hq-muted-text text-sm">
              <span className="hq-spinner"></span> 載入中...
            </div>
          ) : loadError ? (
            <div className="hq-alert hq-alert-error">{loadError}</div>
          ) : oaList.length === 0 ? (
            <div className="hq-card p-4 hq-muted-text text-sm text-center">尚未新增任何 LINE OA</div>
          ) : (
            oaList.map(oa => (
              <div
                key={oa.id}
                className={`hq-card cursor-pointer transition-all ${selectedOA?.id === oa.id && editingOAId === null ? 'ring-2 ring-[var(--hq-cyan)]' : ''}`}
                onClick={() => editingOAId !== oa.id && handleSelectOA(oa)}
              >
                {editingOAId === oa.id ? (
                  <div className="flex flex-col gap-2 p-1" onClick={e => e.stopPropagation()}>
                    <input className="hq-input text-sm" value={editOAForm.name}
                      onChange={e => setEditOAForm(p => ({ ...p, name: e.target.value }))} placeholder="OA 名稱" />
                    <input className="hq-input text-sm" value={editOAForm.description}
                      onChange={e => setEditOAForm(p => ({ ...p, description: e.target.value }))} placeholder="說明（選填）" />
                    <input className="hq-input text-sm font-mono" type="password" value={editOAForm.channel_access_token}
                      onChange={e => setEditOAForm(p => ({ ...p, channel_access_token: e.target.value }))} placeholder="新 Token（留空=不變）" />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveOAEdit(oa.id)} disabled={isSavingOA} className="hq-btn-primary text-xs px-2 py-1">
                        {isSavingOA ? '儲存中...' : '儲存'}
                      </button>
                      <button onClick={() => setEditingOAId(null)} className="text-xs hq-muted-text hover:text-white">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">
                        {oa.name}
                        <span className="ml-2 font-mono text-[10px] text-white/40">#{oa.id}</span>
                      </span>
                      <span className={`hq-badge hq-badge-${oa.is_active ? 'green' : 'gray'} shrink-0`}>
                        {oa.is_active ? '啟用' : '停用'}
                      </span>
                    </div>
                    {oa.description && <p className="hq-muted-text text-xs">{oa.description}</p>}
                    <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => startEditOA(oa)} className="text-xs hq-muted-text hover:text-white">編輯</button>
                      <button onClick={() => handleToggleActive(oa)} className="text-xs hq-muted-text hover:text-white">
                        {oa.is_active ? '停用' : '啟用'}
                      </button>
                      <button onClick={() => handleDeleteOA(oa.id)} className="text-xs text-red-400 hover:text-red-300 ml-auto">刪除</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Right: Template Manager ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {!selectedOA ? (
            <div className="hq-card flex flex-col items-center justify-center py-16 hq-muted-text text-sm gap-2">
              <span className="text-3xl">👈</span>
              <p>請從左側選擇一個 LINE OA 帳號</p>
            </div>
          ) : (
            <>
              {/* OA Header */}
              <div className="hq-card flex items-center justify-between">
                <div>
                  <h3 className="font-bold">
                    {selectedOA.name}
                    <span className="ml-2 font-mono text-xs font-normal text-white/40">#{selectedOA.id} — 把這個數字填進 <code className="bg-white/5 px-1 rounded">LINE_OA_ID</code></span>
                  </h3>
                  {selectedOA.description && <p className="hq-muted-text text-xs mt-0.5">{selectedOA.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {templates.some(t => t.is_active) && selectedOA.is_active && (
                    <button
                      onClick={handleRemoveRichMenu}
                      disabled={isRemovingMenu}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {isRemovingMenu ? '移除中...' : '移除 Rich Menu'}
                    </button>
                  )}
                  <span className={`hq-badge hq-badge-${selectedOA.is_active ? 'green' : 'gray'}`}>
                    {selectedOA.is_active ? '啟用中' : '已停用'}
                  </span>
                </div>
              </div>

              {/* Global action status */}
              {actionStatus && !editingTemplate && (
                <div className={`hq-alert ${actionStatus.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'}`}>
                  {actionStatus.message}
                </div>
              )}

              {/* Templates List */}
              <div className="hq-card flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">選單模板</h4>
                  <button
                    onClick={() => { setShowNewTemplateForm(v => !v); setNewTemplateName(''); }}
                    className="hq-btn-primary text-sm px-3 py-1.5"
                  >
                    {showNewTemplateForm ? '取消' : '+ 新增模板'}
                  </button>
                </div>

                {showNewTemplateForm && (
                  <div className="flex gap-2">
                    <input
                      className="hq-input text-sm flex-1"
                      placeholder="模板名稱（例：傷口護理選單）"
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateTemplate()}
                    />
                    <button onClick={handleCreateTemplate} disabled={isCreatingTemplate || !newTemplateName.trim()} className="hq-btn-primary text-sm px-3">
                      {isCreatingTemplate ? '建立中...' : '建立'}
                    </button>
                  </div>
                )}

                {isLoadingTemplates ? (
                  <div className="flex items-center gap-2 hq-muted-text text-sm py-2">
                    <span className="hq-spinner"></span> 載入模板...
                  </div>
                ) : templates.length === 0 ? (
                  <p className="hq-muted-text text-sm text-center py-4">尚未建立任何選單模板</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {templates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isEditing={editingTemplate?.id === template.id}
                        isActivating={isActivating === template.id}
                        oaActive={selectedOA.is_active}
                        onEdit={() => handleEditTemplate(template)}
                        onActivate={() => handleActivateTemplate(template)}
                        onDelete={() => handleDeleteTemplate(template)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Template Editor */}
              {editingTemplate && (
                <TemplateEditor
                  template={editingTemplate}
                  oaActive={selectedOA.is_active}
                  imageFile={templateImageFile}
                  isDeploying={isDeploying}
                  isSaving={isSavingTemplate}
                  actionStatus={actionStatus}
                  onChangeName={name => setEditingTemplate(prev => prev ? { ...prev, name } : null)}
                  onChangeZone={(idx, field, value) =>
                    setEditingTemplate(prev => prev ? ({
                      ...prev,
                      zones: prev.zones.map((z, i) => i === idx ? { ...z, [field]: value } : z),
                    }) : null)
                  }
                  onImageChange={file => { setTemplateImageFile(file); setActionStatus(null); }}
                  onSave={handleSaveTemplate}
                  onDeploy={handleDeployTemplate}
                  onClose={() => { setEditingTemplate(null); setActionStatus(null); }}
                />
              )}

              {/* User Menu Assignments */}
              <div className="hq-card flex flex-col gap-4">
                <h4 className="font-semibold text-sm">用戶選單分配</h4>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="輸入 LINE User ID（U開頭）"
                    value={evalUserId}
                    onChange={e => setEvalUserId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEvaluate()}
                    className="hq-input text-sm flex-1"
                  />
                  <button
                    onClick={handleEvaluate}
                    disabled={isEvaluating || !evalUserId.trim()}
                    className="hq-btn-primary text-sm px-3"
                  >
                    {isEvaluating ? <><span className="hq-spinner"></span> 評估中...</> : '手動評估'}
                  </button>
                </div>

                {assignments.length === 0 ? (
                  <p className="hq-muted-text text-sm text-center py-2">尚無分配紀錄</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {assignments.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-2 bg-[var(--hq-bg-main)] rounded-lg px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-white/70 truncate max-w-[180px]" title={a.user_id}>{a.user_id}</span>
                        <span className={`hq-badge ${
                          a.source === 'rule' ? 'hq-badge-green' :
                          a.source === 'ai' ? 'hq-badge-purple' : 'hq-badge-gray'
                        }`}>{a.source}</span>
                        <span className="text-white/70 truncate max-w-[160px]" title={a.template_name ?? ''}>
                          {a.template_name ?? (a.template_id != null ? `#${a.template_id}` : '無選單')}
                        </span>
                        <span className="hq-muted-text whitespace-nowrap">
                          {new Date(a.assigned_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────
interface TemplateCardProps {
  template: LineTemplate;
  isEditing: boolean;
  isActivating: boolean;
  oaActive: boolean;
  onEdit: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, isEditing, isActivating, oaActive, onEdit, onActivate, onDelete }: TemplateCardProps) {
  const zones = template.zones || DEFAULT_ZONES;
  return (
    <div className={`rounded-lg border transition-all ${isEditing ? 'border-[var(--hq-cyan)] bg-[var(--hq-bg-main)]' : 'border-white/10 bg-[var(--hq-bg-main)]'} p-3 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{template.name}</span>
        <div className="flex items-center gap-2">
          {template.is_active && (
            <span className="hq-badge hq-badge-green">啟用中</span>
          )}
          {template.line_rich_menu_id && !template.is_active && (
            <span className="hq-badge hq-badge-gray text-xs">已部署</span>
          )}
        </div>
      </div>

      {/* Mini zone preview */}
      <div className="grid grid-cols-2 gap-1">
        {zones.map(z => (
          <div key={z.id} className="rounded bg-[var(--hq-bg-card)] border border-white/5 px-2 py-1.5 flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-[var(--hq-cyan)]">{z.id} · {z.position}</span>
            <span className="text-xs text-white/70 truncate">{z.label || <span className="text-white/30">未設定</span>}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={onEdit} className="text-xs hq-muted-text hover:text-white">
          {isEditing ? '編輯中...' : '編輯'}
        </button>
        {template.line_rich_menu_id && !template.is_active && oaActive && (
          <button
            onClick={onActivate}
            disabled={isActivating}
            className="text-xs text-[var(--hq-cyan)] hover:text-white disabled:opacity-50"
          >
            {isActivating ? '切換中...' : '切換啟用'}
          </button>
        )}
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 ml-auto">刪除</button>
      </div>
    </div>
  );
}

// ── Template Editor ────────────────────────────────────────────────────────
interface TemplateEditorProps {
  template: LineTemplate;
  oaActive: boolean;
  imageFile: File | null;
  isDeploying: boolean;
  isSaving: boolean;
  actionStatus: ActionStatus | null;
  onChangeName: (name: string) => void;
  onChangeZone: (idx: number, field: string, value: string) => void;
  onImageChange: (file: File | null) => void;
  onSave: () => void;
  onDeploy: () => void;
  onClose: () => void;
}

function TemplateEditor({ template, oaActive, imageFile, isDeploying, isSaving, actionStatus, onChangeName, onChangeZone, onImageChange, onSave, onDeploy, onClose }: TemplateEditorProps) {
  const zones = template.zones || DEFAULT_ZONES;
  return (
    <div className="hq-card flex flex-col gap-4 border-2 border-[var(--hq-cyan)]/40">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-[var(--hq-cyan)]">編輯模板</h4>
        <button onClick={onClose} className="text-xs hq-muted-text hover:text-white">關閉</button>
      </div>

      {/* Template name */}
      <input
        className="hq-input text-sm"
        placeholder="模板名稱"
        value={template.name}
        onChange={e => onChangeName(e.target.value)}
      />

      {/* Zone grid preview */}
      <div>
        <p className="text-xs hq-muted-text mb-2">四宮格區塊設定（2500×1686）</p>
        <div className="grid grid-cols-2 gap-2 bg-[var(--hq-bg-main)] rounded-lg p-3 mb-3">
          {zones.map(z => (
            <div key={z.id} className="rounded-lg bg-[var(--hq-bg-card)] border border-white/10 flex flex-col items-center justify-center py-3 gap-1">
              <span className="text-xs font-mono text-[var(--hq-cyan)]">區塊 {z.id}</span>
              <span className="text-xs hq-muted-text">{z.position}</span>
              {z.label && <span className="text-xs font-medium text-center px-2">{z.label}</span>}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {zones.map((z, i) => (
            <div key={z.id} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">
                <span className="hq-env-tag mr-2">區塊 {z.id} · {z.position}</span>
              </label>
              <input
                className="hq-input text-sm"
                placeholder="顯示標籤（選填）"
                value={z.label}
                onChange={e => onChangeZone(i, 'label', e.target.value)}
              />
              <input
                className="hq-input text-sm font-mono"
                placeholder="LIFF URI（必填）"
                value={z.uri}
                onChange={e => onChangeZone(i, 'uri', e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action status */}
      {actionStatus && (
        <div className={`hq-alert ${actionStatus.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'}`}>
          {actionStatus.message}
        </div>
      )}

      {/* Image upload + actions */}
      <div className="flex flex-col gap-3">
        <p className="text-xs hq-muted-text">上傳 2500×1686 JPG/PNG 圖片以部署新選單</p>
        {template.line_rich_menu_id && (
          <p className="text-xs text-[var(--hq-cyan)]/70">
            已存在部署紀錄（ID: {template.line_rich_menu_id.slice(0, 12)}...），上傳新圖片可重新部署
          </p>
        )}
        <div className="hq-upload-row">
          <label className="hq-file-label flex-1">
            <span className="hq-file-label-text">
              {imageFile ? imageFile.name : '選擇圖片（2500×1686 JPG/PNG）'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hq-file-input"
              onChange={e => onImageChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={onSave} disabled={isSaving} className="hq-btn-secondary text-sm flex-1">
            {isSaving ? '儲存中...' : '儲存設定'}
          </button>
          <button
            onClick={onDeploy}
            disabled={isDeploying || !oaActive || !imageFile}
            className="hq-btn-primary text-sm flex-1"
          >
            {isDeploying
              ? <><span className="hq-spinner"></span> 部署中...</>
              : !oaActive
                ? '帳號已停用'
                : !imageFile
                  ? '請先上傳圖片'
                  : '部署並啟用'}
          </button>
        </div>
      </div>
    </div>
  );
}
