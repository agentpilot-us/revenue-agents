/**
 * Dashboard layout & structure — single source of truth.
 * Every class string used in dashboard structural components lives here.
 * To tweak spacing, card styling, or sidebar appearance: change one line, it updates everywhere.
 *
 * Consumed by: layout.tsx, DashboardNav.tsx, DashboardShell.tsx,
 *              ThreeColumnLayout.tsx, StatusBar.tsx, ObjectiveBar.tsx
 */

export const DASHBOARD = {
  // ─── Layout (app/dashboard/layout.tsx) ─────────────────────────────────
  page: 'min-h-screen bg-background',
  sidebar: 'fixed left-0 top-0 z-40 h-full w-56 border-r border-border bg-sidebar',
  sidebarInner: 'flex h-full flex-col px-4 py-6',
  sidebarBrand: 'flex items-center gap-3 mb-6',
  sidebarBrandIcon:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-bold',
  sidebarBrandText: 'text-lg font-semibold text-foreground tracking-tight',
  main: 'pl-56',

  // ─── Shell (DashboardShell.tsx) ────────────────────────────────────────
  shell: 'min-h-screen bg-background text-foreground',
  gridOverlay:
    'fixed inset-0 pointer-events-none opacity-[0.03]',
  header:
    'sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70',
  activityFeed: 'border-t border-border bg-card/50',
  shellHeader:
    'sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70',
  shellFooter: 'border-t border-border bg-card/50',

  // ─── Nav (DashboardNav.tsx) ───────────────────────────────────────────
  sidebarNav: 'space-y-1',
  sidebarDivider: 'my-3 border-t border-border',
  sidebarFooter: 'mt-auto pt-3 space-y-1',
  sidebarNavItem:
    'flex items-center gap-3 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors border-l-2',
  sidebarNavItemActive:
    'border-primary bg-primary/10 text-foreground shadow-[inset_0_0_20px_rgba(59,130,246,0.08)]',
  sidebarNavItemDefault:
    'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  sidebarNavIcon: 'h-5 w-5 shrink-0',
  sidebarNavIconActive: 'text-primary',
  sidebarNavIconDefault: 'text-muted-foreground',
  nav: 'space-y-1',
  navGroup: 'space-y-1',
  navDivider: 'my-3 border-t border-border',
  navLink:
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
  navLinkActive:
    'border-l-2 border-primary bg-primary/10 text-foreground',
  navLinkInactive:
    'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent',
  navIcon: 'h-5 w-5 shrink-0',
  navIconActive: 'h-5 w-5 shrink-0 text-primary',
  navBadge: 'rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-card-foreground',

  // ─── Three-column layout ───────────────────────────────────────────────
  gridContainer: 'max-w-[1400px] mx-auto px-5 py-5',
  gridLayout: 'grid grid-cols-1 lg:grid-cols-12 gap-5',
  gridLeft: 'lg:col-span-4 space-y-5',
  gridCenter: 'lg:col-span-5 space-y-5',
  gridRight: 'lg:col-span-3 space-y-5',
  threeColWrapper: 'max-w-[1400px] mx-auto px-5 py-5',
  threeColGrid: 'grid grid-cols-1 lg:grid-cols-12 gap-5',
  threeColLeft: 'lg:col-span-4 space-y-5',
  threeColCenter: 'lg:col-span-5 space-y-5',
  threeColRight: 'lg:col-span-3 space-y-5',

  // ─── Status bar ────────────────────────────────────────────────────────
  statusBar:
    'flex flex-wrap items-center gap-4 px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
  statusBarSep: 'text-muted-foreground',
  statusBarItem: 'flex items-center gap-2',
  statusBarLabel: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider',
  statusBarValue: 'text-sm font-bold tabular-nums text-foreground',
  statusBarValueAccent: 'text-sm font-bold tabular-nums text-emerald-400',
  statusLabel: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider',
  statusValue: 'text-sm font-bold tabular-nums text-foreground',
  statusValueHighlight: 'text-sm font-bold tabular-nums text-emerald-400',
  statusSeparator: 'text-muted-foreground',

  // ─── Objective bar ────────────────────────────────────────────────────
  objectiveBar: 'px-4 py-3 border-b border-border bg-gradient-to-r from-card/90 to-card/70',
  objectiveBarInner: 'flex flex-wrap items-center gap-6',
  objectiveBarIcon: 'flex h-9 w-9 shrink-0 items-center justify-center text-lg',
  objectiveBarLabel: 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground',
  objectiveBarGoal: 'font-semibold text-foreground',
  objectiveBarStat: 'flex flex-col',
  objectiveBarStatValue: 'text-lg font-bold tabular-nums leading-tight',
  objectiveBarStatSub: 'text-sm font-normal text-muted-foreground',
  objectiveBarStatLabel: 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground',
  objectiveBarDivider: 'text-muted-foreground',
  objectiveBarProgress: 'flex flex-col gap-1 min-w-[120px]',
  objectiveBarProgressLabel: 'flex justify-between items-center text-xs text-muted-foreground',
  objectiveBarProgressTrack: 'h-1.5 w-full rounded-full bg-muted overflow-hidden',
  objectiveBarProgressFill:
    'h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all',
  objectiveGoal: 'font-semibold text-foreground',
  objectiveLanded: 'text-muted-foreground tabular-nums',
  objectiveStates: 'flex flex-wrap items-center gap-2',
  objectivePill: 'rounded-full px-2 py-0.5 text-xs font-medium',
  objectiveProgressTrack: 'mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden',
  objectiveProgressFill:
    'h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all',

  // ─── Cards (shared by dashboard sections) ──────────────────────────────
  card: 'rounded-lg border border-border bg-card/80 p-5',
  cardTight: 'rounded-lg border border-border bg-card/80 p-4',
  cardGradient:
    'rounded-lg border border-border bg-gradient-to-br from-card/90 to-primary/5 p-4',

  // ─── Dashboard card sections (HotSignals, NextBestAction, etc.) ────────
  sectionHeader: 'flex items-center justify-between gap-2 mb-4',
  sectionTitle: 'text-sm font-semibold uppercase tracking-wider text-foreground',
  sectionSubtitle: 'text-[10px] font-medium text-muted-foreground',
  sectionBadge: 'rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary',
  emptyStateText: 'text-sm text-muted-foreground',
  nbaCard:
    'rounded-lg border border-border border-l-4 bg-card/60 p-3 transition-colors',
  stageBadge: 'text-[10px] font-semibold uppercase tracking-wider',
  divisionCard:
    'relative rounded-lg border border-border bg-card/80 p-4 min-h-[200px] flex flex-col',
  divisionCardGrid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  expansionRibbon:
    'absolute top-0 right-0 rounded-bl-md bg-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary',
  progressTrack: 'h-1.5 w-full rounded-full bg-muted overflow-hidden',
  progressFill: 'h-full rounded-full transition-all min-w-[2px]',
  taskRow:
    'flex items-start gap-3 p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors',
  momentumRow: 'flex items-center justify-between py-2 border-b border-border last:border-b-0',
  momentumLabel: 'text-xs font-medium text-muted-foreground',
  momentumValue: 'text-sm font-bold tabular-nums text-foreground',
  momentumSub: 'text-[10px] text-muted-foreground mt-0.5',
  signalCard:
    'rounded-lg border border-border border-l-4 bg-card/60 p-3 transition-colors',
  btnPrimary:
    'inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
  btnSecondary:
    'inline-flex items-center justify-center rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors',
  btnGhost:
    'inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50',
} as const;

export type DashboardClasses = typeof DASHBOARD;

/** Primary nav items (top group): Dashboard through Analytics; include demo items when used */
export const PRIMARY_NAV_KEYS: string[] = [
  'My Day',
  'Strategic Account Plan',
  'Target Accounts',
  'Plays',
  'My Company',
  'Analytics',
  'Demo setup',
  'Waitlist',
];

/** Utility nav items (bottom group): Webhooks, Settings, Billing */
export const UTILITY_NAV_KEYS: string[] = ['Webhooks', 'Settings', 'Billing'];

/** Alias for convenience: import { dash } from '@/app/dashboard/dashboard-classes' */
export { DASHBOARD as dash };
