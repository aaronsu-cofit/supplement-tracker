'use client';

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || '';
}

/**
 * Wrapper around fetch that:
 * 1. Prepends NEXT_PUBLIC_API_URL to relative paths
 * 2. Sends credentials (cookies) — auth_token cookie handles auth automatically
 */
export function apiFetch(path, options = {}) {
  const baseUrl = getApiUrl();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  return fetch(baseUrl + path, {
    ...options,
    headers,
    credentials: 'include',
  });
}
