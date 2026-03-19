import Link from 'next/link';

/**
 * Shared top app bar used across all service modules.
 *
 * Props:
 *   backHref     – where the back arrow navigates (default "/")
 *   title        – module title string
 *   accent       – CSS gradient string for the title text
 *   rightElement – optional JSX rendered on the right (e.g. an edit button)
 */
export default function AppHeader({ backHref = '/', title, accent, rightElement }) {
    const titleGradient = accent || 'linear-gradient(135deg, #7c5cfc, #5ce0d8)';

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(10, 10, 18, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 0.75rem',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.25rem',
        }}>
            {/* Back button */}
            <Link
                href={backHref}
                aria-label="返回"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 44,
                    height: 44,
                    color: 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    fontSize: '1.3rem',
                    flexShrink: 0,
                    borderRadius: 10,
                }}
            >
                ←
            </Link>

            {/* Title */}
            <h1 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.3px',
                background: titleGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                flex: 1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {title}
            </h1>

            {/* Right slot — same width as back button to keep title centred */}
            <div style={{
                minWidth: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexShrink: 0,
            }}>
                {rightElement || null}
            </div>
        </header>
    );
}
