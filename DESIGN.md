# Design

## Theme

Dark. The primary surface is near-black with a subtle cool-blue undertone (`#06070a`). Secondary surfaces layer slightly lighter (`#0b0d11`, `#13151a`). Text is warm off-white (`#fffeea`), never pure white. The scene: a developer at a desk, monitor brightness moderate, scanning reference docs for protocol details. Dark reduces eye strain during long reading sessions and matches the Velora app identity.

## Color Strategy

**Restrained** — tinted neutrals carry the surface, one accent (gold) signals interactive elements and emphasis. The accent appears on active states, CTAs, search focus rings, and sidebar indicators but never on large surfaces.

### Palette

| Role | Token | Value | Usage |
|---|---|---|---|
| Background | `--velora-bg` | `#06070a` | Page background |
| Surface | `--velora-surface` | `#0b0d11` | Cards, sidebar, code blocks |
| Surface elevated | `--velora-surface-alt` | `#13151a` | Hover states, dropdowns, secondary panels |
| Surface muted | `--velora-muted` | `#16181f` | Muted backgrounds, disabled states |
| Text primary | `--velora-text` | `#fffeea` | Body text, headings |
| Text muted | `--velora-text-muted` | `rgba(255, 254, 234, 0.60)` | Secondary text, timestamps, metadata |
| Border | `--velora-border` | `rgba(255, 254, 234, 0.14)` | Card borders, dividers, input borders |
| Border strong | `--velora-border-strong` | `rgba(255, 254, 234, 0.22)` | Emphasized borders, active items |
| Accent | `--velora-accent` | `#f2d467` | Links (hover), active sidebar, focus rings, CTAs |
| Accent hover | `--velora-accent-hover` | `#ffea82` | Hover state for accent elements |
| Destructive | `--velora-error` | `#ff6b5d` | Error states, destructive actions |
| Success | `--velora-success` | `#5ee2a0` | Success indicators, completed states |
| Info | `--velora-info` | `#6ea8ff` | Informational callouts, scheduled states |

### Code Block Colors

Dark surface with slightly warmer tint. Syntax highlighting uses the palette above — gold for keywords, green for strings, blue for types, muted text for comments.

## Typography

### Font Stack

- **Primary (body, nav, UI):** `"Velora Geist", "Host Grotesk", ui-sans-serif, system-ui, sans-serif`
- **Heading (display titles, hero):** `"Velora Geist", ui-sans-serif, system-ui, sans-serif` — lighter weight (200-300) at large sizes creates Velora's signature airy feel
- **Monospace (code, CLI):** `"Velora Geist Mono", "Fira Code", ui-monospace, monospace`

### Scale

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | clamp(2.5rem, 5vw, 4rem) | 300 | 1.1 | Docs homepage hero |
| H1 | clamp(1.8rem, 3vw, 2.5rem) | 300 | 1.2 | Page titles |
| H2 | 1.5rem | 400 | 1.3 | Section headings |
| H3 | 1.15rem | 500 | 1.4 | Subsection headings |
| Body | 1rem | 400 | 1.7 | Paragraph text |
| Small | 0.85rem | 400 | 1.5 | Captions, metadata |
| Code | 0.9rem | 400 | 1.6 | Inline and block code |

Body line length capped at 70ch.

## Layout

### Docs Homepage

Card grid (2 columns) for collection discovery. Each card: title, description, article count. Cards use `--velora-surface` background with subtle border. No icons — text-forward, Bittensor-style organization. Section headings group related collections.

### Article Pages

Two-column layout: content (flexible, max 780px) + sticky table of contents sidebar (220px). Breadcrumbs above content. Article metadata (last updated, read time) below title.

### Sidebar Navigation

Persistent left sidebar (260px), dark surface background. Flat navigation list grouped by collection. Active item indicated by left accent bar (2px, gold) + text color change. Collapsible collection groups. Search at top of sidebar.

### Global

- No container max-width on the page shell — sidebar + content fill viewport
- Content area has `padding: 48px min(5vw, 72px)`
- Generous vertical spacing between sections (48-64px)

## Motion

No decorative animations in docs. Functional transitions only: sidebar open/close (150ms ease-out), search dropdown appear (100ms ease-out), hover state transitions (120ms). Respects `prefers-reduced-motion`.

## Components

### Sidebar Item
Padding 8px 16px. Text `--velora-text-muted`. Active: text `--velora-text`, left border 2px `--velora-accent`. Hover: text `--velora-text`.

### Card (Collection)
`--velora-surface` background, 1px `--velora-border`, border-radius 6px. Padding 28px. Hover: border brightens to `--velora-border-strong`, slight background lift.

### Code Block
`--velora-surface` background, border-radius 6px, padding 16px 20px. Copy button in top-right corner. Language badge top-left.

### Search Input
`--velora-surface` background, 1px `--velora-border`, border-radius 8px. Focus: `--velora-accent` ring at 0.15 opacity. Placeholder uses `--velora-text-muted`.

### Callout / Admonition
Left border 3px (info: `--velora-info`, warning: `--velora-accent`, danger: `--velora-error`). Tinted background using role color at 8% opacity. Used for tips, warnings, security notes.

### Table
Full-width, `--velora-border` cell borders. Header row: `--velora-surface` background, weight 500. Alternating rows not used (cleaner on dark).

### Breadcrumb
Small text, `--velora-text-muted`. Separator: `/`. Current page: `--velora-text`. Hover: `--velora-accent`.

## Anti-patterns (explicitly avoided)

- Pure black (`#000`) or pure white (`#fff`) anywhere
- Gradient text on headings
- Glassmorphism / blur effects on docs elements
- Side-stripe colored borders on callouts (use left border + tint)
- Identical icon+heading+text card grids (text-forward cards instead)
- Decorative animations or scroll-triggered effects
