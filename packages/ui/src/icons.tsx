/**
 * Inline SVG icon components — Lucide-compatible style (24x24 viewBox, stroke-based).
 * All icons include aria-hidden="true" since they are decorative alongside visible labels.
 */

const svgProps = (size) => ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    style: { display: 'block', flexShrink: 0 },
});

/** Check circle — used for the daily check-in tab */
export function IconCheckCircle({ size = 22 }) {
    return (
        <svg {...svgProps(size)}>
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

/** Pill / capsule — used for the supplements management tab */
export function IconPill({ size = 22 }) {
    return (
        <svg {...svgProps(size)}>
            <path d="m10.5 20.5-7-7a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7Z" />
            <path d="m8.5 8.5 7 7" />
        </svg>
    );
}

/** Clock — used for the history tab */
export function IconClock({ size = 22 }) {
    return (
        <svg {...svgProps(size)}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

/** Pencil — used for edit actions */
export function IconPencil({ size = 18 }) {
    return (
        <svg {...svgProps(size)}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

/** Trash — used for delete actions */
export function IconTrash({ size = 18 }) {
    return (
        <svg {...svgProps(size)}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}

/** Plus — used for add actions */
export function IconPlus({ size = 18 }) {
    return (
        <svg {...svgProps(size)}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

/** Camera — used for photo / AI scan actions */
export function IconCamera({ size = 18 }) {
    return (
        <svg {...svgProps(size)}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}
