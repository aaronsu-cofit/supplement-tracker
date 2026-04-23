/**
 * Resolve the active product_id for this LIFF session.
 *
 * Order of precedence:
 *   1. ?product_id=... URL param (useful for dev / per-install overrides)
 *   2. NEXT_PUBLIC_PRODUCT_ID env var (baked in at build time for a
 *      single-product LIFF deployment)
 *   3. null — screens render an empty state and link out to a help page
 *
 * Returns null on the server; always resolve after hydration.
 */
export function useProductId(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('product_id');
  if (fromQuery) return fromQuery;
  const env = process.env.NEXT_PUBLIC_PRODUCT_ID;
  return env && env.length > 0 ? env : null;
}
