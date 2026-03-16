'use client';
import { apiFetch } from '@vitera/lib';
import { useState, useEffect } from 'react';

const DEFAULT_ZONES = [
  { id: 'A', position: '左上', label: '', uri: '' },
  { id: 'B', position: '右上', label: '', uri: '' },
  { id: 'C', position: '左下', label: '', uri: '' },
  { id: 'D', position: '右下', label: '', uri: '' },
];

const EMPTY_ADD_FORM = { name: '', description: '', channel_access_token: '' };

export default function HQLineMenuClient() {
  const [oaList, setOaList] = useState([]);
  const [isLoadingOAs, setIsLoadingOAs] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Selected OA & rich menu config
  const [selectedOA, setSelectedOA] = useState(null);
  const [zones, setZones] = useState(DEFAULT_ZONES.map(z => ({ ...z })));
  const [imageFile, setImageFile] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState(null);

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

  const handleSelectOA = (oa) => {
    setSelectedOA(oa);
    setZones(DEFAULT_ZONES.map(z => ({ ...z })));
    setImageFile(null);
    setDeployStatus(null);
    setEditingId(null);
  };

  // ─── Add OA ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
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

  // ─── Edit OA ────────────────────────────────────────────────────────
  const startEdit = (oa) => {
    setEditingId(oa.id);
    setEditForm({ name: oa.name, description: oa.description || '', channel_access_token: '' });
    setSelectedOA(null);
  };

  const handleSaveEdit = async (id) => {
    setIsSavingEdit(true);
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description,
        ...(editForm.channel_access_token && { channel_access_token: editForm.channel_access_token }),
      };
      const res = await apiFetch(`/api/line/oa/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return;
      setOaList(prev => prev.map(o => o.id === id ? { ...o, ...data.oa } : o));
      setEditingId(null);
    } catch { /* ignore */ } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleActive = async (oa) => {
    const res = await apiFetch(`/api/line/oa/${oa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !oa.is_active }),
    });
    const data = await res.json();
    if (res.ok) {
      setOaList(prev => prev.map(o => o.id === oa.id ? { ...o, ...data.oa } : o));
      if (selectedOA?.id === oa.id) setSelectedOA(prev => ({ ...prev, ...data.oa }));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除此 LINE OA 設定？此操作無法復原。')) return;
    await apiFetch(`/api/line/oa/${id}`, { method: 'DELETE' });
    setOaList(prev => prev.filter(o => o.id !== id));
    if (selectedOA?.id === id) setSelectedOA(null);
  };

  // ─── Deploy rich menu ───────────────────────────────────────────────
  const handleDeploy = async () => {
    if (!imageFile) { setDeployStatus({ type: 'error', message: '請先上傳選單圖片（2500×1686）' }); return; }
    for (const z of zones) {
      if (!z.uri.trim()) { setDeployStatus({ type: 'error', message: `請填入「${z.position}（${z.id}）」的 LIFF URI` }); return; }
    }

    setIsDeploying(true);
    setDeployStatus(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('zones', JSON.stringify(zones.map(z => ({ label: z.label, uri: z.uri }))));

      const res = await apiFetch(`/api/line/oa/${selectedOA.id}/richmenu`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setDeployStatus({ type: 'success', message: `Rich Menu 已成功部署！ID: ${data.richMenuId}` });
      } else {
        setDeployStatus({ type: 'error', message: data.error || '部署失敗' });
      }
    } catch {
      setDeployStatus({ type: 'error', message: '網路連線錯誤' });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="hq-fade-in">
      <h2 className="hq-section-title">
        <span className="hq-dot-green"></span>
        LINE OA 選單管理
      </h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: OA List ── */}
        <div className="lg:w-[340px] flex-shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="hq-muted-text text-sm">共 {oaList.length} 個帳號</span>
            <button
              onClick={() => { setShowAddForm(v => !v); setAddError(null); }}
              className="hq-btn-primary text-sm px-3 py-1.5"
            >
              {showAddForm ? '取消' : '+ 新增 OA'}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="hq-card p-4 flex flex-col gap-3">
              <h4 className="font-semibold text-sm">新增 LINE OA</h4>
              <input
                className="hq-input text-sm"
                placeholder="OA 名稱（必填）"
                value={addForm.name}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
              />
              <input
                className="hq-input text-sm"
                placeholder="說明（選填）"
                value={addForm.description}
                onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
              />
              <input
                className="hq-input text-sm font-mono"
                placeholder="Channel Access Token（必填）"
                type="password"
                value={addForm.channel_access_token}
                onChange={e => setAddForm(p => ({ ...p, channel_access_token: e.target.value }))}
              />
              {addError && <p className="text-xs text-red-400">{addError}</p>}
              <button onClick={handleAdd} disabled={isAdding} className="hq-btn-primary text-sm">
                {isAdding ? <><span className="hq-spinner"></span> 新增中...</> : '確認新增'}
              </button>
            </div>
          )}

          {/* OA list */}
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
                className={`hq-card cursor-pointer transition-all ${selectedOA?.id === oa.id && editingId === null ? 'ring-2 ring-[var(--hq-cyan)]' : ''}`}
                onClick={() => editingId !== oa.id && handleSelectOA(oa)}
              >
                {editingId === oa.id ? (
                  /* Edit form inline */
                  <div className="flex flex-col gap-2 p-1" onClick={e => e.stopPropagation()}>
                    <input
                      className="hq-input text-sm"
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="OA 名稱"
                    />
                    <input
                      className="hq-input text-sm"
                      value={editForm.description}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="說明（選填）"
                    />
                    <input
                      className="hq-input text-sm font-mono"
                      type="password"
                      value={editForm.channel_access_token}
                      onChange={e => setEditForm(p => ({ ...p, channel_access_token: e.target.value }))}
                      placeholder="新 Token（留空=不變）"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(oa.id)} disabled={isSavingEdit} className="hq-btn-primary text-xs px-2 py-1">
                        {isSavingEdit ? '儲存中...' : '儲存'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs hq-muted-text hover:text-white">取消</button>
                    </div>
                  </div>
                ) : (
                  /* OA card display */
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{oa.name}</span>
                      <span className={`hq-badge hq-badge-${oa.is_active ? 'green' : 'gray'}`}>
                        {oa.is_active ? '啟用' : '停用'}
                      </span>
                    </div>
                    {oa.description && <p className="hq-muted-text text-xs">{oa.description}</p>}
                    <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => startEdit(oa)} className="text-xs hq-muted-text hover:text-white">編輯</button>
                      <button onClick={() => handleToggleActive(oa)} className="text-xs hq-muted-text hover:text-white">
                        {oa.is_active ? '停用' : '啟用'}
                      </button>
                      <button onClick={() => handleDelete(oa.id)} className="text-xs text-red-400 hover:text-red-300 ml-auto">刪除</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Right: Rich menu configurator ── */}
        <div className="flex-1 min-w-0">
          {!selectedOA ? (
            <div className="hq-card flex flex-col items-center justify-center py-16 hq-muted-text text-sm gap-2">
              <span className="text-3xl">👈</span>
              <p>請從左側選擇一個 LINE OA 帳號</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="hq-card flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{selectedOA.name}</h3>
                  {selectedOA.description && <p className="hq-muted-text text-xs mt-0.5">{selectedOA.description}</p>}
                </div>
                <span className={`hq-badge hq-badge-${selectedOA.is_active ? 'green' : 'gray'}`}>
                  {selectedOA.is_active ? '啟用中' : '已停用'}
                </span>
              </div>

              {/* Zone grid preview + inputs */}
              <div className="hq-card flex flex-col gap-4">
                <h4 className="font-semibold text-sm">四宮格區塊設定（2500×1686）</h4>

                {/* Visual 2x2 preview */}
                <div className="grid grid-cols-2 gap-2 bg-[var(--hq-bg-main)] rounded-lg p-3">
                  {zones.map(z => (
                    <div
                      key={z.id}
                      className="rounded-lg bg-[var(--hq-bg-card)] border border-white/10 flex flex-col items-center justify-center py-4 gap-1"
                    >
                      <span className="text-xs font-mono text-[var(--hq-cyan)]">區塊 {z.id}</span>
                      <span className="text-xs hq-muted-text">{z.position}</span>
                      {z.label && <span className="text-xs font-medium text-center px-2">{z.label}</span>}
                    </div>
                  ))}
                </div>

                {/* Zone inputs */}
                <div className="flex flex-col gap-3">
                  {zones.map((z, i) => (
                    <div key={z.id} className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold">
                        <span className="hq-env-tag mr-2">區塊 {z.id} · {z.position}</span>
                      </label>
                      <input
                        className="hq-input text-sm"
                        placeholder="顯示標籤（選填，例：記錄傷口）"
                        value={z.label}
                        onChange={e => setZones(prev => prev.map((item, idx) => idx === i ? { ...item, label: e.target.value } : item))}
                      />
                      <input
                        className="hq-input text-sm font-mono"
                        placeholder="LIFF URI（必填，例：https://liff.line.me/xxxxx/record）"
                        value={z.uri}
                        onChange={e => setZones(prev => prev.map((item, idx) => idx === i ? { ...item, uri: e.target.value } : item))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Image upload + deploy */}
              <div className="hq-card flex flex-col gap-4">
                <h4 className="font-semibold text-sm">圖片上傳與發布</h4>
                <p className="hq-muted-text text-xs">上傳 2500×1686 像素的 JPG/PNG 圖片作為選單背景</p>

                {deployStatus && (
                  <div className={`hq-alert ${deployStatus.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'}`}>
                    {deployStatus.message}
                  </div>
                )}

                <div className="hq-upload-row">
                  <label className="hq-file-label">
                    <span className="hq-file-label-text">
                      {imageFile ? imageFile.name : '選擇圖片（2500×1686 JPG/PNG）'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hq-file-input"
                      onChange={e => { setImageFile(e.target.files[0]); setDeployStatus(null); }}
                    />
                  </label>

                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying || !selectedOA.is_active}
                    className="hq-btn-primary"
                  >
                    {isDeploying
                      ? <><span className="hq-spinner"></span> 部署中...</>
                      : !selectedOA.is_active
                        ? '帳號已停用'
                        : '發布 Rich Menu'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
