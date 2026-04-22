'use client';
import { useMemo, useState } from 'react';
import { FLEX_EXAMPLES, type FlexExample } from './flexExamples';

interface Props {
  onPick: (json: string) => void;
  onClose: () => void;
}

export default function FlexExamplePicker({ onPick, onClose }: Props) {
  const categories = useMemo(() => {
    const set = new Set(FLEX_EXAMPLES.map(e => e.category));
    return ['全部', ...Array.from(set)];
  }, []);
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [previewing, setPreviewing] = useState<FlexExample | null>(null);

  const filtered = activeCategory === '全部'
    ? FLEX_EXAMPLES
    : FLEX_EXAMPLES.filter(e => e.category === activeCategory);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-start justify-center overflow-y-auto p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-5 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold m-0">選用 Flex 範例</h4>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-slate-500 m-0">
          點一張卡片先預覽 JSON，「插入此範例」會替換目前的 flex 內容。圖片使用 LINE 官方示範 CDN，正式上線前請換成自己的 URL。
        </p>

        {/* Category tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                activeCategory === c
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
          {filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => setPreviewing(ex)}
              className={`text-left border rounded-lg p-3 transition-colors ${
                previewing?.id === ex.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-400 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-sm">{ex.title}</span>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {ex.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0">{ex.description}</p>
            </button>
          ))}
        </div>

        {/* Preview / insert */}
        {previewing && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{previewing.title}</div>
                <div className="text-xs text-slate-500">{previewing.description}</div>
              </div>
              <button
                onClick={() => {
                  onPick(previewing.json);
                  onClose();
                }}
                className="hq-btn-primary text-sm"
              >
                插入此範例
              </button>
            </div>
            <details>
              <summary className="text-xs text-slate-500 cursor-pointer">預覽 JSON</summary>
              <pre className="mt-2 text-[10px] font-mono bg-white border border-slate-200 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
                {previewing.json}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
