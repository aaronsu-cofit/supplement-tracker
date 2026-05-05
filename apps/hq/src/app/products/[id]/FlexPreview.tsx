'use client';
/**
 * Best-effort LINE Flex Message preview. Interprets the common subset
 * of the Flex spec (bubble / carousel / box / text / image / button /
 * separator / spacer / icon / filler) so ops can eyeball what users
 * will see without opening the LINE Flex Simulator.
 *
 * Not pixel-accurate — Tailwind / browser rendering will diverge from
 * LINE's native renderer at the edges (spacing, font weight, link
 * underlines). Good enough for review; for byte-perfect verification,
 * use the official simulator.
 */

interface FlexComponent {
  type: string;
  text?: string;
  contents?: FlexComponent[];
  layout?: string;
  url?: string;
  spacing?: string;
  margin?: string;
  size?: string;
  weight?: string;
  color?: string;
  align?: string;
  wrap?: boolean;
  flex?: number;
  action?: { type?: string; label?: string; uri?: string; data?: string };
  style?: string;
  height?: string;
  aspectRatio?: string;
  aspectMode?: string;
  position?: string;
  offsetTop?: string;
  offsetBottom?: string;
}

interface FlexBubble {
  type: 'bubble';
  size?: string;
  header?: FlexComponent;
  hero?: FlexComponent;
  body?: FlexComponent;
  footer?: FlexComponent;
  styles?: { header?: { backgroundColor?: string }; hero?: { backgroundColor?: string }; body?: { backgroundColor?: string }; footer?: { backgroundColor?: string } };
}

interface FlexCarousel {
  type: 'carousel';
  contents?: FlexBubble[];
}

const SIZE_TO_PX: Record<string, number> = {
  xxs: 11, xs: 12, sm: 13, md: 14, lg: 16, xl: 18, xxl: 22, '3xl': 26, '4xl': 30, '5xl': 36,
};

const SPACING_TO_PX: Record<string, number> = {
  none: 0, xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 20,
};

const WEIGHT_TO_CSS: Record<string, string> = {
  regular: '400', bold: '700',
};

function ComponentRenderer({ c }: { c: FlexComponent | undefined }): React.ReactElement | null {
  if (!c) return null;
  switch (c.type) {
    case 'text': {
      const fontSize = c.size ? SIZE_TO_PX[c.size] ?? 14 : 14;
      const fontWeight = c.weight ? WEIGHT_TO_CSS[c.weight] ?? '400' : '400';
      const textAlign = c.align as 'left' | 'center' | 'right' | undefined;
      return (
        <span style={{
          fontSize,
          fontWeight,
          color: c.color || '#111827',
          textAlign,
          whiteSpace: c.wrap ? 'pre-wrap' : 'nowrap',
          overflow: c.wrap ? 'visible' : 'hidden',
          textOverflow: c.wrap ? 'clip' : 'ellipsis',
          display: 'block',
          flex: c.flex,
          marginTop: c.margin ? SPACING_TO_PX[c.margin] ?? 0 : undefined,
        }}>
          {c.text ?? ''}
        </span>
      );
    }
    case 'box': {
      const isHorizontal = c.layout === 'horizontal' || c.layout === 'baseline';
      const gap = c.spacing ? SPACING_TO_PX[c.spacing] ?? 0 : 0;
      return (
        <div style={{
          display: 'flex',
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: c.layout === 'baseline' ? 'baseline' : undefined,
          gap,
          flex: c.flex,
          marginTop: c.margin ? SPACING_TO_PX[c.margin] ?? 0 : undefined,
        }}>
          {(c.contents ?? []).map((child, i) => <ComponentRenderer key={i} c={child} />)}
        </div>
      );
    }
    case 'image': {
      const aspect = c.aspectRatio ? c.aspectRatio.replace(':', '/') : '1.51 / 1';
      return (
        <div style={{ width: '100%', aspectRatio: aspect, overflow: 'hidden', background: '#f1f5f9' }}>
          {c.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.url} alt=""
              style={{
                width: '100%', height: '100%',
                objectFit: c.aspectMode === 'cover' ? 'cover' : 'contain',
              }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 11 }}>(image)</div>
          )}
        </div>
      );
    }
    case 'button': {
      const isPrimary = c.style === 'primary';
      const isLink = c.style === 'link';
      const bg = isPrimary ? '#06c755' : isLink ? 'transparent' : '#ffffff';
      const fg = isPrimary ? '#ffffff' : isLink ? '#06c755' : '#111827';
      const border = isPrimary || isLink ? 'none' : '1px solid #d1d5db';
      return (
        <div style={{
          background: bg, color: fg, border, borderRadius: 6,
          padding: '8px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600,
          cursor: 'default',
          marginTop: c.margin ? SPACING_TO_PX[c.margin] ?? 0 : undefined,
        }}>
          {c.action?.label ?? 'Button'}
        </div>
      );
    }
    case 'separator':
      return <hr style={{ border: 0, borderTop: `1px solid ${c.color || '#e5e7eb'}`, margin: '4px 0' }} />;
    case 'spacer':
      return <div style={{ height: c.size ? SIZE_TO_PX[c.size] ?? 8 : 8 }} />;
    case 'icon':
      return c.url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={c.url} alt="" style={{ width: 16, height: 16, display: 'inline-block', verticalAlign: 'middle' }} />
        : null;
    case 'filler':
      return <div style={{ flex: 1 }} />;
    default:
      return <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>[{c.type}]</div>;
  }
}

function Bubble({ bubble }: { bubble: FlexBubble }) {
  const widthByBubbleSize: Record<string, number> = {
    nano: 120, micro: 160, kilo: 260, mega: 300, giga: 400,
  };
  const w = bubble.size ? widthByBubbleSize[bubble.size] ?? 280 : 280;
  return (
    <div style={{
      width: w,
      borderRadius: 12,
      overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      flex: '0 0 auto',
    }}>
      {bubble.header && (
        <div style={{ padding: 12, background: bubble.styles?.header?.backgroundColor }}>
          <ComponentRenderer c={bubble.header} />
        </div>
      )}
      {bubble.hero && (
        <div style={{ background: bubble.styles?.hero?.backgroundColor }}>
          <ComponentRenderer c={bubble.hero} />
        </div>
      )}
      {bubble.body && (
        <div style={{ padding: 12, background: bubble.styles?.body?.backgroundColor }}>
          <ComponentRenderer c={bubble.body} />
        </div>
      )}
      {bubble.footer && (
        <div style={{ padding: 12, background: bubble.styles?.footer?.backgroundColor }}>
          <ComponentRenderer c={bubble.footer} />
        </div>
      )}
    </div>
  );
}

export default function FlexPreview({ body, altText }: { body: string; altText?: string | null }) {
  let parsed: FlexBubble | FlexCarousel;
  try {
    parsed = JSON.parse(body);
  } catch {
    return (
      <div style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', padding: 8, borderRadius: 6 }}>
        ⚠ JSON 解析失敗
      </div>
    );
  }

  return (
    <div style={{
      background: '#83b8e8',
      padding: 16,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontFamily: '-apple-system, "Noto Sans TC", sans-serif' }}>
        模擬 LINE 顯示{altText ? ` · altText：${altText}` : ''}
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {parsed.type === 'bubble' && <Bubble bubble={parsed} />}
        {parsed.type === 'carousel' && (parsed.contents ?? []).map((b, i) => <Bubble key={i} bubble={b} />)}
        {parsed.type !== 'bubble' && parsed.type !== 'carousel' && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>不支援的最外層 type：{(parsed as { type: string }).type}</div>
        )}
      </div>
    </div>
  );
}
