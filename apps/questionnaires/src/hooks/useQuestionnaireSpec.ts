'use client';
// Fetch the questionnaire spec from the backend. Returns the spec
// shape that the vibe-coded page renders.
//
//   const { spec, isLoading, error } = useQuestionnaireSpec(productId, key);

import { apiFetch } from '@vitera/lib';
import { useEffect, useState } from 'react';
import type { QuestionnaireMeta } from '../types/spec';

interface State {
  meta: QuestionnaireMeta | null;
  isLoading: boolean;
  error: string | null;
}

export function useQuestionnaireSpec(productId: string, key: string): State {
  const [state, setState] = useState<State>({
    meta: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!productId || !key) return;
    let cancelled = false;
    setState({ meta: null, isLoading: true, error: null });

    apiFetch(`/api/questionnaires/${productId}/${key}/spec`)
      .then(async (r: Response) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.message || body.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: QuestionnaireMeta) => {
        if (!cancelled) setState({ meta: data, isLoading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ meta: null, isLoading: false, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [productId, key]);

  return state;
}
