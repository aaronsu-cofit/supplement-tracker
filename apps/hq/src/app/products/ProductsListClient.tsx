'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from '../../types';

interface AddForm {
  name: string;
  description: string;
}

const EMPTY: AddForm = { name: '', description: '' };

export default function ProductsListClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch('/api/products')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ products: Product[] }>;
      })
      .then(({ products: data }) => setProducts(data ?? []))
      .catch(err => {
        console.error('[products/list] error', err);
        setError('無法載入產品列表');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      setAddError('請填產品名稱');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch('/api/products', {
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
          <h2>產品</h2>
          <p>一個產品 = 一組可複用的內容庫、意圖規則、劇本設定。多個 LINE OA 可共用同一個產品。</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="hq-btn-primary text-sm px-3 py-1.5"
        >
          {showAdd ? '取消' : '+ 新增產品'}
        </button>
      </div>

      {showAdd && (
        <div className="hq-card p-4 flex flex-col gap-3 mb-6">
          <h3 className="font-semibold">新增產品</h3>
          <input className="hq-input" placeholder="產品名稱（必填）"
            value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          <input className="hq-input" placeholder="說明（選填）"
            value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button onClick={handleAdd} disabled={adding} className="hq-btn-primary">
            {adding ? '新增中...' : '確認新增'}
          </button>
        </div>
      )}

      {error && <div className="hq-alert hq-alert-error mb-4">{error}</div>}

      {loading ? (
        <div className="hq-card text-slate-500">載入中...</div>
      ) : products.length === 0 ? (
        <div className="hq-card text-slate-500 text-center">尚無產品 — 點右上方新增</div>
      ) : (
        <div className="hq-grid-3">
          {products.map(p => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="hq-card hover:border-slate-400 transition-colors cursor-pointer no-underline text-inherit flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900">{p.name}</h3>
                <span className={`hq-badge ${p.is_active ? 'hq-badge-green' : 'hq-badge-gray'}`}>
                  {p.is_active ? '啟用' : '停用'}
                </span>
              </div>
              <code className="text-xs text-slate-500 font-mono">#{p.id}</code>
              {p.description && <p className="text-sm text-slate-600">{p.description}</p>}
              <div className="mt-2 text-xs text-slate-400">
                綁定 OA：<span className="text-slate-600 font-semibold">{p.oa_count ?? 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
