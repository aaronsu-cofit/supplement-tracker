'use client';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Shared help modal. Used by section headers on the product detail page
 * to explain key naming rules, where the thing is referenced, and how
 * it's typically used — so ops don't have to context-switch to the
 * manual.
 */
export default function HelpModal({ title, onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-start justify-center overflow-y-auto p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-xl p-5 flex flex-col gap-3 text-sm text-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold m-0">{title}</h4>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-3 max-h-[65vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Small inline trigger button — puts a "?" next to a section title. */
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs w-5 h-5 flex items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-400"
      title="使用說明"
      aria-label="使用說明"
    >
      ?
    </button>
  );
}
