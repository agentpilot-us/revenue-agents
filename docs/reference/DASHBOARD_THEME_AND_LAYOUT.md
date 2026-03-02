# Dashboard theme and layout

## Why the dashboard wasn’t picking up the color scheme

The app has a single source of truth for colors: **AgentPilot tokens** in `app/agentpilot-tokens.css`, wired into Tailwind via `app/globals.css` (`:root` / `.dark` map `--background`, `--foreground`, `--sidebar`, etc. to `var(--ap-*)`).

The dashboard was still using **hardcoded Tailwind classes** in the layout and shell instead of those semantic tokens:

- **`app/dashboard/layout.tsx`** — Root and sidebar used `bg-zinc-900`, `border-slate-700`, `text-slate-400`.
- **`app/components/dashboard/DashboardShell.tsx`** — Used `bg-zinc-900`, `text-slate-100`, `border-slate-700`.
- **`components/Navbar.tsx`** and **`app/dashboard/DashboardNav.tsx`** — Same zinc/slate palette.
- **Dashboard components** (ObjectiveBar, NextBestAction, TodaysTasks, AccountRadarGrid, StatusBar, etc.) — Same hardcoded slate/zinc.

So the **page background and shell** were not using `--background` / `--foreground` at all; they were on a separate “zinc” theme. That’s why the dashboard didn’t match the rest of the app.

**Fix:** Those files now use semantic tokens: `bg-background`, `bg-sidebar`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-sidebar-accent`, etc., so the dashboard uses the same theme as the tokens.

---

## Custom color and layout file for precise dashboard components

If you need **more precise layout and reusable dashboard primitives**, you can add a small dashboard-specific layer without replacing the global tokens.

### Option A: Dashboard layout constants (TypeScript)

Add a file that only defines **class names** (no new colors), so layout and spacing stay consistent:

- **`lib/dashboard/layout-classes.ts`** or **`app/dashboard/dashboard-classes.ts`**

```ts
// Dashboard layout — use semantic tokens; this file is only for consistency.
export const DASHBOARD_LAYOUT = {
  page: 'min-h-screen bg-background',
  sidebar: 'fixed left-0 top-0 z-40 h-full w-56 border-r border-border bg-sidebar',
  main: 'pl-56',
  shell: 'min-h-screen bg-background text-foreground',
  shellHeader: 'sticky top-0 z-10 border-b border-border bg-background',
  shellFooter: 'border-t border-border',
  card: 'rounded-lg border border-border bg-card/80 p-4',
  cardTight: 'rounded-lg border border-border bg-card/80 p-3',
} as const;
```

Then in layout/shell/components:

```tsx
import { DASHBOARD_LAYOUT } from '@/app/dashboard/dashboard-classes';
// ...
<div className={DASHBOARD_LAYOUT.page}>
  <aside className={DASHBOARD_LAYOUT.sidebar}>…
```

- **Pros:** One place to tweak dashboard layout/spacing; still uses semantic tokens from globals.
- **Cons:** You must remember to use the constant instead of inline classes.

### Option B: Dashboard-specific CSS (optional)

If you want **dashboard-only** spacing, grid, or utilities (e.g. a fixed sidebar width or a dashboard grid), you can add:

- **`app/dashboard/dashboard.css`** — Imported only in `app/dashboard/layout.tsx`.

```css
/* Dashboard layout — uses tokens from agentpilot-tokens.css */
.dashboard-page { min-height: 100vh; background: var(--ap-bg-page); }
.dashboard-sidebar { position: fixed; left: 0; top: 0; z-index: 40; width: 14rem; border-right: 1px solid var(--ap-border-default); background: var(--ap-bg-sidebar); }
.dashboard-main { padding-left: 14rem; }
.dashboard-card { border-radius: var(--ap-radius-xl); border: 1px solid var(--ap-border-default); background: var(--ap-bg-elevated-solid); padding: var(--ap-space-6); }
```

Then in the dashboard layout you use `className="dashboard-page"` etc. and keep Tailwind for one-off tweaks.

- **Pros:** Very precise control; all dashboard layout in one file; still uses `--ap-*` tokens.
- **Cons:** Two systems (Tailwind + this CSS); need to avoid duplicating token values.

### Option C: Keep current approach (recommended for now)

Use **semantic Tailwind classes** everywhere (`bg-background`, `bg-card`, `border-border`, etc.) and keep a single source of truth in `agentpilot-tokens.css` + `globals.css`. Add a **dashboard layout constants** file (Option A) only if you find yourself repeating the same long class strings (e.g. for cards or the shell) and want one place to change them.

**Summary:** The dashboard now picks up the color scheme because layout and shell use the same semantic tokens as the rest of the app. For more precise layout, add a small **dashboard-classes** (or `dashboard.css`) file that references those tokens and use it only for the dashboard shell and repeated layout patterns.
