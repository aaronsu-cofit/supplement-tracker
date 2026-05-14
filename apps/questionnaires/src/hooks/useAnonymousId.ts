'use client';
// Stable per-device anonymous_id used when the user isn't (yet)
// authenticated via LIFF — e.g. when the questionnaire opens in a
// plain browser. Stored in localStorage; survives reloads but tied to
// the browser. Submissions include this as `anonymous_id` so the
// backend can save the row.
//
// Once we wire web → LINE linking, the same anonymous_id can be used
// to merge anonymous responses onto a real user_id later.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vitera_questionnaire_anonymous_id';

function makeId(): string {
  // crypto.randomUUID is widely supported; fall back to a short hex
  // string if running in an older WebView that doesn't have it.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'anon-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useAnonymousId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let existing = window.localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      existing = makeId();
      window.localStorage.setItem(STORAGE_KEY, existing);
    }
    setId(existing);
  }, []);

  return id;
}
