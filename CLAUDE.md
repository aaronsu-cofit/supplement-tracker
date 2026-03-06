# Vitera Monorepo — AI Development Guidelines

## Styling Convention: Tailwind CSS v4

All apps in this monorepo use **Tailwind CSS v4**. Follow these rules when writing or modifying UI code.

### Setup (already in place for all apps)

Every app has:
- `postcss.config.mjs` with `@tailwindcss/postcss` plugin
- `@import "tailwindcss"` at the top of `globals.css`
- `tailwindcss` and `@tailwindcss/postcss` in `devDependencies`

To add to a new app:
```bash
pnpm add tailwindcss @tailwindcss/postcss --filter @vitera/<app-name> --save-dev
```

### Core Rules

1. **Never use inline `style={{}}` props** unless the value is genuinely dynamic at runtime and cannot be expressed as a static Tailwind class.
2. **Never use `const styles = {}`** JavaScript style objects. Replace with Tailwind `className` strings.
3. **Never inject `<style>` tags** in JSX for keyframe animations or static rules. Put them in `globals.css` under `@layer utilities` or `@keyframes`.

### Tailwind v4 CSS Configuration

Tailwind v4 is **CSS-first** — no `tailwind.config.js`. All custom tokens go in `globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand-purple: #7c5cfc;
  --color-brand-teal: #5ce0d8;
}

@layer utilities {
  .bg-brand-gradient {
    background: linear-gradient(135deg, #7c5cfc, #5ce0d8);
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
```

Colors defined in `@theme` automatically enable opacity modifier syntax: `bg-brand-purple/30`, `text-brand-teal/60`.

### Handling Dynamic Values

**When to use Tailwind classes (preferred):**
- Conditional state: use a ternary in `className`
  ```jsx
  className={`px-4 py-2 rounded ${isActive ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60'}`}
  ```
- Discrete lookup maps (e.g., severity levels, status labels):
  ```js
  const SEVERITY_CLASSES = {
    normal:   'bg-[rgba(168,255,120,0.1)] text-[#a8ff78] border-[#a8ff78]',
    moderate: 'bg-[rgba(255,154,158,0.1)] text-[#ff9a9e] border-[#ff9a9e]',
  };
  // Usage: className={SEVERITY_CLASSES[item.severity]}
  ```

**When inline styles are acceptable (rare exceptions):**
- `accentColor` on `<input type="range">` (no Tailwind equivalent)
- `radial-gradient()` or `conic-gradient()` with runtime color variables
- `animationDelay` with computed values (e.g., `style={{ animationDelay: `${index * 0.1}s` }}`)
- `WebkitTransform` for GPU acceleration on video elements
- Complex SVG `filter` values (`drop-shadow` with dynamic color)
- CSS transitions with `cubic-bezier` + `delay` that Tailwind can't express statically

### Arbitrary Values

Use Tailwind's `[...]` syntax for non-standard values:
```jsx
className="bg-[#a8ff78] text-[#1a3630] border-[rgba(168,255,120,0.3)]"
className="shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
className="w-[280px] h-[400px]"
```

### App-Specific Color Tokens (wounds app)

The wounds app defines named colors in its `globals.css` `@theme` block:
- `w-pink`, `w-coral`, `w-blue`, `w-green`, `w-orange`, `w-red`
- Use like: `bg-w-pink`, `text-w-green/60`, `border-w-pink/30`

### Existing CSS Class Systems

Apps `supplements`, `hq`, `bones`, `intimacy`, `portal` have a shared CSS class system in `globals.css` (`.page-container`, `.spinner`, `.btn-primary`, `.glass-card`, etc.). These CSS classes remain valid — Tailwind and the existing CSS coexist. Continue using those classes where appropriate, and use Tailwind for new code and for replacing inline styles.

### Workflow for Removing Inline Styles

1. Read the file first
2. Identify all `style={{}}` props
3. For static values → replace with Tailwind `className`
4. For conditional values → use ternary in `className` or a lookup map
5. For truly dynamic values → keep as inline `style`
6. Remove any `const styles = {}` objects after migration
7. Remove `<style>` tags and move rules to `globals.css`
