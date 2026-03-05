'use client';

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || '';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vitera_auth_token');
}

/**
 * Wrapper around fetch that:
 * 1. Prepends NEXT_PUBLIC_API_URL to relative paths
 * 2. Adds Authorization: Bearer <token> header when token exists
 * 3. Sends credentials (cookies) for same-domain fallback
 */
export function apiFetch(path, options = {}) {
  const baseUrl = getApiUrl();
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(baseUrl + path, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/** Store auth token after login/register */
export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('vitera_auth_token', token);
  } else {
    localStorage.removeItem('vitera_auth_token');
  }
}

/** Clear auth token on logout */
export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('vitera_auth_token');
}
