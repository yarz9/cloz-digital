# Cloz Digital — Design System v1

A premium, CSS-only motion system + reusable primitives + global UX
features (command palette, toasts, shortcuts). Lives in
`src/styles/premium.css` + `src/components/ui/`.

Honest scope: this is the **foundation** for an incremental Lovable /
Linear-grade overhaul. It does not migrate every page in the codebase
to the new look. Adopt it page by page using the utilities below.

---

## Where things live

```
src/
├── styles/
│   └── premium.css           # Tokens, keyframes, .button-premium, .card-premium, etc.
├── components/
│   ├── Markdown.jsx          # Markdown renderer (legal + KB)
│   ├── ErrorBoundary.jsx
│   ├── EmptyState.jsx
│   └── ui/
│       ├── Button.jsx        # <Button variant="primary|secondary|subtle|danger|link" />
│       ├── Card.jsx          # <Card sheen glow />, <CardHeader />, <StatCard />
│       ├── Badge.jsx         # <Badge tone="accent|success|warning|error|muted|glow" />
│       ├── Skeleton.jsx      # <Skeleton />, <SkeletonText />, <SkeletonCard />
│       ├── Spinner.jsx       # <Spinner size={16} />
│       ├── Toast.jsx         # <ToastProvider /> + useToast()
│       ├── CommandPalette.jsx # ⌘K palette + registerActions()
│       └── ShortcutsHelp.jsx # `?` overlay
└── main.jsx                  # Wraps the app with all providers
```

---

## Motion tokens

Defined in `:root` in `premium.css`:

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 120ms | Tiny state changes (focus, color flicks) |
| `--motion-base` | 200ms | Default for hover/lift/scale |
| `--motion-slow` | 320ms | Reveals, drawer slides |
| `--motion-glide` | 500ms | Sheens, marquees |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | General-purpose ease-out |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Small overshoot |
| `--ease-emphasis` | `cubic-bezier(0.16, 1, 0.3, 1)` | Hero reveals |

All keyframes respect `prefers-reduced-motion: reduce` — they collapse to 1ms.

## Gradients

| Variable | Use |
|---|---|
| `--grad-accent` | Diagonal accent → light accent (buttons, pills) |
| `--grad-text` | Vertical white → gray (headlines, big stat values) |
| `--grad-premium` | Animated blue → purple → blue (hero text, premium labels) |
| `--grad-glow` | Radial glow used by `.bg-glow::before` |

## Shadows

| Variable | Use |
|---|---|
| `--shadow-glow-sm` | Hover lift on cards/buttons |
| `--shadow-glow-md` | Card-premium hover state |
| `--shadow-glow-lg` | Hero CTAs, command palette, drawers |

---

## Utility classes

| Class | Effect |
|---|---|
| `text-gradient` | Animated blue→purple→blue text gradient |
| `text-gradient-static` | Subtle white→gray text gradient (no animation) |
| `text-gradient-accent` | Diagonal accent text gradient |
| `bg-glow` | Adds an ambient radial behind the element |
| `section-glow` | Big halo positioned at the top of a section |
| `glass-panel` | Semi-transparent surface + backdrop blur |
| `glass-elevated` | Heavier glass for drawers, palettes |
| `card-premium` | The default card. Hover = lift + glow + border-accent |
| `card-premium with-sheen` | Adds a diagonal sheen sweep on hover |
| `button-premium` | Primary CTA — gradient, lift, glow |
| `button-premium ghost` | Secondary CTA — neutral surface |
| `hover-lift` | Add to any element to get the standard lift behaviour |
| `shimmer-loader` | Animated skeleton placeholder |
| `focus-ring` | Accessible accent-colored focus halo |
| `scroll-reveal` / `.is-visible` | Pair for IntersectionObserver-driven reveals |
| `kbd` | Small keycap (`<kbd className="kbd">⌘</kbd>`) |

## Animation classes

| Class | Use |
|---|---|
| `animate-fade-up` | 8px translate + fade (most reveals) |
| `animate-fade-in` | Opacity only |
| `animate-scale-in` | 0.96 → 1 + opacity (modals, palettes) |
| `animate-slide-in-right` | Toasts, side panels |
| `animate-slide-in-left` | Same, other direction |
| `animate-glow-pulse` | Slow halo pulse (status dots, ambient lights) |
| `animate-marquee` | Use with `.marquee` and `width: max-content` |
| `stagger-1` … `stagger-6` | Cascading reveal delays (60ms each step) |

---

## Primitives

### Button

```jsx
import { Button } from '@/components/ui/Button'
import { ArrowRight, Save, Trash2 } from 'lucide-react'

<Button variant="primary" iconRight={ArrowRight}>Get started</Button>
<Button variant="secondary" icon={Save} loading={saving}>Save</Button>
<Button variant="danger" icon={Trash2}>Delete</Button>
<Button variant="subtle" onClick={…}>Cancel</Button>
<Button variant="link">Learn more</Button>
```

### Card / StatCard

```jsx
import { Card, CardHeader, StatCard } from '@/components/ui/Card'

<Card sheen glow>
  <CardHeader eyebrow="Revenue" icon={DollarSign} title="This month" />
  …
</Card>

<StatCard label="MRR" value="3,200 BAM" trend="+12%" sub="vs last month" icon={TrendingUp} />
```

### Toasts

```jsx
import { useToast } from '@/components/ui/Toast'

const toast = useToast()
toast.success('Saved')
toast.error('Could not save', { description: 'Network error.', duration: 6000 })
toast.info('FYI', { action: { label: 'Undo', onClick: () => doUndo() } })
```

### Command Palette

```jsx
// Global ⌘K already works on every page (registered in main.jsx).
// To add page-specific actions:

import { useCommandPalette } from '@/components/ui/CommandPalette'
import { useEffect } from 'react'

useEffect(() => {
  return registerActions([
    { id: 'kb.new', label: 'New article', group: 'Create', icon: Plus, perform: () => openNew() },
    { id: 'kb.export', label: 'Export KB', group: 'Data', perform: () => download() },
  ])
}, [])
```

The palette ships with ~25 default actions covering every Management
route + a few common workflows. They are filtered using a tiny
order-preserving fuzzy match.

### Shortcuts overlay

Press `?` anywhere (outside an input). Add new entries to
`SHORTCUTS` in `src/components/ui/ShortcutsHelp.jsx`.

### Skeleton / Spinner / Badge

```jsx
<Skeleton className="h-4 w-1/3" />
<SkeletonText lines={4} />
<SkeletonCard />
<Spinner size={20} />
<Badge tone="success" dot>online</Badge>
```

---

## Roll-out plan (incremental)

The new look + UX is opt-in. Adopt it page-by-page:

1. **Replace bespoke inline buttons** with `<Button variant="primary">` /
   `button-premium` class. Removes ~10 duplicated style snippets per page.
2. **Wrap stat tiles** in `<StatCard>` or `<Card glow>`. Apply
   `hover-lift` where missing.
3. **Add `animate-fade-up` + `stagger-*`** to the first few elements in
   any new view for a polished initial render.
4. **Replace alert() / browser confirms** with `useToast()`.
5. **Add page-specific actions** to the command palette via
   `useCommandPalette().registerActions()` in a `useEffect`. This
   becomes the most powerful keyboard UX in the app.
6. **Skeletons** in place of `<Loader2 className="animate-spin" />` for
   list rendering — feels much faster.

---

## What is NOT in v1 (and the honest reason)

The original prompt asked for shadcn/ui + TanStack Query + TanStack
Table + React Hook Form + Zod + Tiptap-everywhere + dnd kit + Uppy +
TypeScript migration. Each of those would touch hundreds of files
and is its own focused project. The system above is the **shared
foundation** that all of them will sit on top of when they land.

A reasonable sequence for the follow-on work:

1. **TanStack Query** wrapping all `fetch('/api/…')` calls. High
   leverage, low UI risk. Probably the next thing to ship.
2. **React Hook Form + Zod** on the largest forms first (PortalClients
   onboarding, Contact, Mail compose).
3. **TanStack Table** on the CRM + Inquiries + Billing tables.
4. **shadcn/ui** primitives migrated in piece by piece (Dialog, Sheet,
   Tooltip) — no big-bang install.
5. **TypeScript** — incremental via `// @ts-check` JSDoc first, then
   `.tsx` file by file.

Update this doc as each layer lands.
