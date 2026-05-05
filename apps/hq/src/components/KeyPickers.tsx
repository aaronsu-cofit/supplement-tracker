'use client';
import { useEffect, useState } from 'react';
import type { ContentItem, MissionTemplate } from '../types';

/** Dropdown for picking a content_key from the product's content
 *  library. Falls back to a manual text input if the user wants a key
 *  that doesn't exist yet (or for legacy values pointing at deleted /
 *  inactive items, which are surfaced with a ⚠ marker so ops knows).
 *
 *  Caller is responsible for fetching `items` once and passing them in
 *  — keeps this purely presentational and avoids N concurrent fetches
 *  across sibling forms. */
export function ContentKeyPicker({
  value, onChange, items, placeholder, allowEmpty = true, className,
}: {
  value: string;
  onChange: (v: string) => void;
  items: ContentItem[];
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
}) {
  const [manual, setManual] = useState(() => !!value && !items.some(i => i.key === value));
  useEffect(() => {
    if (value && !items.some(i => i.key === value)) setManual(true);
  }, [value, items]);
  return (
    <div className={`flex gap-1 items-stretch ${className ?? ''}`}>
      {manual ? (
        <input className="hq-input flex-1" placeholder={placeholder ?? 'content key'}
          value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <select className="hq-input flex-1" value={value} onChange={e => onChange(e.target.value)}>
          {allowEmpty && <option value="">— 選擇內容 —</option>}
          {items.filter(i => i.is_active).map(i => (
            <option key={i.id} value={i.key}>
              {(i.title || i.key)}{i.type !== 'text' ? ` · ${i.type}` : ''}
            </option>
          ))}
          {value && !items.some(i => i.key === value && i.is_active) && (
            <option value={value}>⚠ {value}（不在啟用清單）</option>
          )}
        </select>
      )}
      <button type="button" onClick={() => setManual(m => !m)}
        className="text-xs px-2 rounded border border-slate-300 bg-white hover:bg-slate-50 shrink-0"
        title={manual ? '改成下拉選擇' : '改成手動輸入'}>
        {manual ? '☰' : '✏'}
      </button>
    </div>
  );
}

/** Same shape as ContentKeyPicker but for Mission templates. */
export function MissionKeyPicker({
  value, onChange, items, placeholder, className,
}: {
  value: string;
  onChange: (v: string) => void;
  items: MissionTemplate[];
  placeholder?: string;
  className?: string;
}) {
  const [manual, setManual] = useState(() => !!value && !items.some(i => i.key === value));
  useEffect(() => {
    if (value && !items.some(i => i.key === value)) setManual(true);
  }, [value, items]);
  return (
    <div className={`flex gap-1 items-stretch ${className ?? ''}`}>
      {manual ? (
        <input className="hq-input flex-1" placeholder={placeholder ?? 'mission key'}
          value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <select className="hq-input flex-1" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— 選擇任務 —</option>
          {items.filter(i => i.is_active).map(i => (
            <option key={i.id} value={i.key}>
              {(i.name || i.key)} · {i.mission_type}
            </option>
          ))}
          {value && !items.some(i => i.key === value && i.is_active) && (
            <option value={value}>⚠ {value}（不在啟用清單）</option>
          )}
        </select>
      )}
      <button type="button" onClick={() => setManual(m => !m)}
        className="text-xs px-2 rounded border border-slate-300 bg-white hover:bg-slate-50 shrink-0"
        title={manual ? '改成下拉選擇' : '改成手動輸入'}>
        {manual ? '☰' : '✏'}
      </button>
    </div>
  );
}
