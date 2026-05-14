'use client';
// Submit a completed questionnaire to the backend. Handles both LIFF-
// authenticated (cookie carries auth_token; backend resolves user_id)
// and anonymous flows (anonymous_id is included in the body — the
// backend's softAuth allows it).
//
//   const { submit, isSubmitting, error, result } = useSubmitResponse(productId, key);
//   await submit({ q1: 'a', q2: ['x', 'y'] });

import { apiFetch } from '@vitera/lib';
import { useCallback, useState } from 'react';
import type { Answers, SubmitResult } from '../types/spec';
import { useAnonymousId } from './useAnonymousId';

interface State {
  submit: (answers: Answers) => Promise<SubmitResult>;
  isSubmitting: boolean;
  error: string | null;
  result: SubmitResult | null;
}

export function useSubmitResponse(productId: string, key: string): State {
  const anonymousId = useAnonymousId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const submit = useCallback(
    async (answers: Answers): Promise<SubmitResult> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/questionnaires/${productId}/${key}/responses`, {
          method: 'POST',
          body: JSON.stringify({ answers, anonymous_id: anonymousId }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Surface server-side validation detail when available.
          const detail = Array.isArray(data.validation)
            ? data.validation.map((v: { field: string; message: string }) => v.message).join('; ')
            : data.message || data.error || `HTTP ${res.status}`;
          throw new Error(detail);
        }
        setResult(data as SubmitResult);
        return data as SubmitResult;
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [productId, key, anonymousId],
  );

  return { submit, isSubmitting, error, result };
}
