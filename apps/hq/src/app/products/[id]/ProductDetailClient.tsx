'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ProductWithOAs } from '../../../types';
import ProductContentSection from './ProductContentSection';
import ProductIntentSection from './ProductIntentSection';
import ProductMissionSection from './ProductMissionSection';
import ProductBadgeSection from './ProductBadgeSection';
import ProductJourneySection from './ProductJourneySection';

interface Props {
  id: string;
}

type TabKey = 'settings' | 'content' | 'missions' | 'badges' | 'journey' | 'intents';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'settings', label: '基本' },
  { key: 'content', label: '內容庫' },
  { key: 'missions', label: '任務' },
  { key: 'badges', label: '徽章' },
  { key: 'journey', label: 'Journey' },
  { key: 'intents', label: '意圖規則' },
];

export default function ProductDetailClient({ id }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const rawTab = params.get('tab') as TabKey | null;
  const activeTab: TabKey = TABS.some(t => t.key === rawTab) ? (rawTab as TabKey) : 'settings';

  const [product, setProduct] = useState<ProductWithOAs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/api/products/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ product: ProductWithOAs }>;
      })
      .then(({ product: data }) => {
        setProduct(data);
        setName(data.name);
        setDescription(data.description || '');
        setIsActive(data.is_active);
      })
      .catch(err => {
        console.error('[product/detail] error', err);
        setError('無法載入產品');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setStatus({ type: 'success', message: '已儲存' });
      load();
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (product.oas.length > 0) {
      setStatus({ type: 'error', message: '仍有 OA 綁定此產品，請先解除綁定' });
      return;
    }
    if (!window.confirm(`確定要刪除「${product.name}」？`)) return;
    try {
      const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '刪除失敗');
      router.push('/products');
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  };

  if (loading) return <div className="hq-card text-slate-500">載入中...</div>;
  if (error || !product) return <div className="hq-alert hq-alert-error">{error || '找不到產品'}</div>;

  return (
    <div className="hq-fade-in flex flex-col gap-4 max-w-4xl">
      <div className="hq-header flex items-center justify-between">
        <div>
          <h2>{product.name}</h2>
          <p className="font-mono text-xs">#{product.id}</p>
        </div>
        <Link href="/products" className="text-sm text-slate-500 hover:text-slate-900">← 回列表</Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-1 -mt-2">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/products/${id}?tab=${t.key}`}
            scroll={false}
            className={`text-sm px-4 py-2 border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {status && activeTab === 'settings' && (
        <div className={`hq-alert ${status.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'}`}>
          {status.message}
        </div>
      )}

      {activeTab === 'settings' && (
        <>
          <div className="hq-card flex flex-col gap-3">
            <h3 className="font-semibold text-lg">基本資訊</h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">產品名稱</label>
              <input className="hq-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">說明</label>
              <input className="hq-input" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>啟用</span>
            </label>
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving} className="hq-btn-primary">
                {saving ? '儲存中...' : '儲存'}
              </button>
              <button
                onClick={handleDelete}
                className="text-sm px-3 py-1.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50"
              >
                刪除
              </button>
            </div>
          </div>

          <div className="hq-card flex flex-col gap-3">
            <h3 className="font-semibold text-lg">綁定的 LINE OA（{product.oas.length}）</h3>
            {product.oas.length === 0 ? (
              <p className="text-sm text-slate-500">尚無 OA 綁定此產品。至 OA 設定頁即可綁定。</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {product.oas.map(oa => (
                  <li key={oa.id} className="flex items-center justify-between border-b border-slate-100 last:border-0 py-2">
                    <div className="flex items-center gap-2">
                      <span>{oa.name}</span>
                      <span className={`hq-badge ${oa.is_active ? 'hq-badge-green' : 'hq-badge-gray'}`}>
                        {oa.is_active ? '啟用' : '停用'}
                      </span>
                    </div>
                    <Link href={`/oa/${oa.id}`} className="text-xs text-slate-500 hover:text-slate-900">
                      前往 →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {activeTab === 'content' && <ProductContentSection productId={id} />}
      {activeTab === 'missions' && <ProductMissionSection productId={id} />}
      {activeTab === 'badges' && <ProductBadgeSection productId={id} />}
      {activeTab === 'journey' && <ProductJourneySection productId={id} />}
      {activeTab === 'intents' && <ProductIntentSection productId={id} />}
    </div>
  );
}
