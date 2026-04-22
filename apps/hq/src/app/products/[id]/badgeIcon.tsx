import type { CSSProperties } from 'react';

/**
 * Detect which rendering mode a badge icon string wants. Anything that
 * starts with `http://`, `https://`, or `data:` is treated as an image
 * source (`<img>`); anything else is treated as text (emoji, short text
 * label). Null/empty returns 'empty'.
 */
export function badgeIconKind(icon: string | null | undefined): 'image' | 'text' | 'empty' {
  if (!icon) return 'empty';
  const trimmed = icon.trim();
  if (!trimmed) return 'empty';
  if (/^(https?:\/\/|data:)/i.test(trimmed)) return 'image';
  return 'text';
}

interface Props {
  icon: string | null | undefined;
  /** Pixel size. Defaults to 20 (slightly larger than inline text). */
  size?: number;
  /** Emoji fallback if icon is empty. Default '🏅'. */
  fallback?: string;
  className?: string;
}

/**
 * Unified badge icon renderer. Uses `<img>` for URLs and data URIs,
 * plain text for emoji/labels. Keeps sizing consistent across the
 * badge list, user info panel, and user detail page.
 */
export function BadgeIcon({ icon, size = 20, fallback = '🏅', className }: Props) {
  const kind = badgeIconKind(icon);
  if (kind === 'image') {
    const style: CSSProperties = { width: size, height: size, objectFit: 'contain' };
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={icon as string} alt="" style={style} className={`inline-block rounded ${className ?? ''}`} />
    );
  }
  const text = kind === 'text' ? (icon as string) : fallback;
  const fontSize = Math.round(size * 0.9);
  return (
    <span className={`inline-block leading-none ${className ?? ''}`} style={{ fontSize }}>
      {text}
    </span>
  );
}
