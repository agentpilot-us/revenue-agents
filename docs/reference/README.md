# UI Reference — Target Company Page

This folder holds the **pixel reference** for the Target Company page and related UI.

## Files

- **TargetCompanyPage-Reference.jsx** — Working reference for the Target Company page with two fully themed tabs (Overview, Buying Groups). Uses the same design tokens as `app/agentpilot-tokens.css`.

## How to use

1. **Tokens** — All colors, spacing, and utilities come from `app/agentpilot-tokens.css` (imported in the root layout). Use `var(--ap-*)` or `.ap-*` classes when building or refactoring Target Company tabs.

2. **Overview tab** — Company header card (dark, ARR metrics), Objective Bar with progress, division cards grid (expansion badges, coverage bars, latest signal blocks, stage badges), recent signals feed with accent left borders.

3. **Buying Groups tab** — Two-column division strategy: left = value proposition / use case / estimated opportunity (filled or empty-state dashed), key initiative tags; right = contacts list with role badges and engagement status, missing personas alert with "Find Contacts" CTA.

4. **Shared patterns** — Division filter in tab bar, filter badges on tab labels, breadcrumb with division context, 6-tab bar with blue active state, card lift and border glow on hover.

Use Overview and Buying Groups as the visual reference when building or aligning **Contacts**, **Content**, **Engagement**, and **Signals** tabs — same surface tiers, card patterns, and spacing.
