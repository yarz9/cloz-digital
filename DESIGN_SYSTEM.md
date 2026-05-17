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

## Server state — TanStack Query (Phase 2.1, landed)

The app uses TanStack Query v5 for **all** server data fetching going
forward. Replace any new `useEffect(() => fetch(…))` with the hooks
in `src/hooks/queries/`.

### Where things live

```
src/
├── lib/
│   ├── queryClient.js       # The single shared QueryClient (defaults)
│   └── fetcher.js           # api.get / .post / .patch / .delete  + ApiError
└── hooks/
    └── queries/
        ├── keys.js          # qk.* — the only place query keys are spelled
        ├── persistence.js   # Persistence Center
        ├── serviceDesk.js   # Service Desk
        ├── portalClients.js # /api/portal-admin
        └── knowledge.js     # Knowledge Center
```

### Defaults (set once in `queryClient.js`)

| Option | Value | Why |
|---|---|---|
| `staleTime` | 30s | Reasonable for an internal dashboard |
| `gcTime` | 5 min | Keep recently-unmounted views warm |
| `retry` | 1 | One auto-retry on transient failure |
| `refetchOnWindowFocus` | false | Would be noisy across busy tabs |
| `refetchOnReconnect` | true | Re-sync after a flaky connection |
| Mutations `retry` | 0 | Don't double-create on the server |

Override per hook when a stream needs to be hotter (status pings every
30s, audit log every minute, etc.).

### Pattern — read

```jsx
import { useArticles } from '@/hooks/queries/knowledge'

function MyList() {
  const { data, isLoading, error } = useArticles({ category: 'sales' })
  if (isLoading) return <Loading />
  if (error)     return <ErrorBlock error={error} />
  return <List articles={data.articles} />
}
```

### Pattern — write (with cache invalidation)

```jsx
import { useTakeSnapshot } from '@/hooks/queries/persistence'
import { useToast } from '@/components/ui/Toast'

const toast = useToast()
const takeSnapshot = useTakeSnapshot()

await takeSnapshot.mutateAsync()  // invalidates snapshots + status automatically
toast.success('Snapshot created')

// disabled = takeSnapshot.isPending
```

### Pattern — optimistic update

`useCreateMarker` is the reference example:

```jsx
return useMutation({
  mutationFn: (vars) => api.post('/api/persistence/markers', vars),
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey: qk.persistence.markers() })
    const previous = qc.getQueryData(qk.persistence.markers())
    qc.setQueryData(qk.persistence.markers(), (old) => ({
      markers: [{ ...optimisticRow, _optimistic: true }, ...(old?.markers || [])]
    }))
    return { previous }
  },
  onError:   (_e, _v, ctx) => qc.setQueryData(qk.persistence.markers(), ctx.previous),
  onSettled: () => qc.invalidateQueries({ queryKey: qk.persistence.markers() }),
})
```

The UI dims `_optimistic` rows so the operator sees the row appear
instantly and knows the server hasn't yet confirmed.

### Adding hooks for a new module

1. Add the entity's key factory to `src/hooks/queries/keys.js`.
2. Create `src/hooks/queries/<module>.js` with one `useX` per read and
   one `useDoY` per mutation. Mirror the file structure of `persistence.js`.
3. Always invalidate the right scope on mutation `onSuccess`:
   - Detail-level update → invalidate the detail key **and** the list key.
   - List mutation → invalidate the `<module>.all` umbrella key.
4. Replace consumers' inline `fetch(...)` calls one component at a time.

### Showcase consumer

`src/features/management/Persistence.jsx` is fully migrated. Read it
as the canonical pattern for tabs, mutations, optimistic updates, and
toast integration.

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
