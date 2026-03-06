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

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(baseUrl + path, {
    ...options,
    headers,
    credentials: 'include',
  });
}
