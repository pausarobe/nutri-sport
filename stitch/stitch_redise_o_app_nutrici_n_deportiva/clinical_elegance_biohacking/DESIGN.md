---
name: Clinical Elegance & Biohacking
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#404944'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707974'
  outline-variant: '#bfc9c2'
  surface-tint: '#2c6952'
  primary: '#003626'
  on-primary: '#ffffff'
  primary-container: '#0b4f3a'
  on-primary-container: '#82c0a5'
  inverse-primary: '#95d3b8'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#00324f'
  on-tertiary: '#ffffff'
  tertiary-container: '#004971'
  on-tertiary-container: '#60baff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f0d3'
  primary-fixed-dim: '#95d3b8'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#0e513b'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  metric-val-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.03em
  metric-val-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-ui:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 2rem
  margin-mobile: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-performance clinical environment tailored for elite sports dietitians, athletic performance directors, and metabolic specialists. The aesthetic fuses medical precision with athletic dynamism: sterile yet organic, authoritative yet invigorating.

Key Tenets:
- **Clinical Rigor:** High typographic fidelity, tabular alignment, and disciplined visual organization instill diagnostic trust.
- **Metabolic Vitality:** Crisp botanical and deep forest greens project organic vitality, recovery, and peak human performance.
- **Architectural Air:** Deliberately generous whitespace, delicate surface delineation, and ethereal elevation keep dense anthropometric datasets scannable and fatigue-free.
- **Design Style:** A disciplined hybrid of **Modern Editorial Clinical** and **Air-Infused Neomorphism**, characterized by floating pure-white surfaces, hairline borders tinted with emerald tones, and soft directional ambient light.

## Colors

The palette operates in strict Light Mode to emulate diagnostic laboratory clarity while avoiding harsh sterile blues in favor of regenerative botanical pigments.

- **Primary (`#0B4F3A` - Deep Obsidian Emerald):** Used for structural anchors, high-level headers, primary action buttons, and dominant active states.
- **Secondary (`#10B981` - Botanical Sage):** Used for performance gains, positive trends, metabolic wellness indicators, and secondary interactive states.
- **Tertiary (`#0284C7` - Electric Cerulean):** Reserved for muscle mass, lean tissue indexes, and hydration biomarkers.
- **Neutral (`#0F172A` - Deep Slate):** Primary text and dense analytical figures.

### Functional & Anthropometric Accents
- **Canvas / Base Canvas:** `#F8FAF9` (warm botanical off-white preventing retinal fatigue).
- **Surface (Cards & Modals):** `#FFFFFF` pure white.
- **Hairline Borders:** `#E2E8F0` with contextual states using `#A7F3D0` (emerald-tinted structural edges).
- **Adipose / Body Fat Marker:** `#F43F5E` (Subtle Coral).
- **Skeletal / Mineral Density:** `#F59E0B` (Amber Ochre).
- **Visceral / Residual Mass:** `#64748B` (Warm Slate).

## Typography

The typographic hierarchy divides responsibilities cleanly between high-impact editorial presence and analytical clarity:

- **Primary Display & Headings:** `Plus Jakarta Sans` delivers a contemporary, geometric humanism that softens clinical intensity while maintaining authority.
- **Data, Metrics, & Interface:** `Inter` handles all data grids, medical chronologies, and operational copy. All numeric displays, anthropometric measurements, and timestamps must leverage tabular numerals (`tnum`, `font-variant-numeric: tabular-nums`) to preserve column alignment and rapid vertical scanning.
- **Metric Micro-Labels:** `label-caps` must always be rendered in full uppercase with `+0.06em` tracking to provide an unambiguous clinical label for adjacent numerical values.

## Layout & Spacing

The layout is built on a responsive 12-column grid prioritizing dynamic clinical dashboards and multi-panel diagnostic workflows.

- **Breakpoints:**
  - `Desktop (Wide)`: 1440px+ (fluid with `margin-desktop`, max-width containment at 1600px).
  - `Desktop (Standard)`: 1024px–1439px (12 columns, `gutter: 1.5rem`, `margin: 2rem`).
  - `Tablet`: 768px–1023px (8 columns, `gutter: 1rem`, collapsible side panels).
  - `Mobile`: <767px (4 columns, `gutter-sm: 1rem`, `margin-mobile: 1rem`).

- **Layout Structure:**
  - Fixed-width collapsible left navigation rail (64px collapsed, 260px expanded).
  - Main operational workspace utilizing continuous fluid flex and CSS Grid sub-layouts.
  - Multi-column metric displays collapse from 4 columns to 2 on tablet, and single-column stacked carousels on mobile.

## Elevation & Depth

Visual hierarchy avoids heavy drop shadows, relying on ethereal layered depths and perimeter light barriers.

- **Surface Treatment:** All cards use pure `#FFFFFF` resting against the `#F8FAF9` warm botanical base canvas.
- **Hairline Perimeter Strokes:** Surfaces are framed by a 1px solid stroke (`#E2E8F0` or `#E7EFEA`) to maintain boundary legibility in high-ambient-light clinical setups.
- **Shadow Scale:**
  - *Tier 1 (Resting Cards, Table Containers):* `0px 1px 3px rgba(11, 79, 58, 0.03), 0px 4px 16px rgba(15, 23, 42, 0.03)`
  - *Tier 2 (Hovered Cards, Dropdowns, Segmented Toggles):* `0px 4px 6px -1px rgba(11, 79, 58, 0.04), 0px 12px 24px -4px rgba(11, 79, 58, 0.06)`
  - *Tier 3 (Modals, Slide-overs, Floating Drawers):* `0px 20px 35px -5px rgba(15, 23, 42, 0.08), 0px 8px 16px -6px rgba(15, 23, 42, 0.03)`
- **Atmospheric Halos:** Selected patient profiles and active biomarker cards utilize a subtle radial focus ring: `0 0 0 3px rgba(16, 185, 129, 0.15)`.

## Shapes

The interface balances soft ergonomics with diagnostic structure:

- **Base Radius (0.5rem / 8px):** Applied to form fields, nested metric cells, dropdown items, and table action bars.
- **Large Radius (`rounded-lg`, 1rem / 16px):** Applied to standard metric cards, interactive segmented groups, and contextual panels.
- **Extra Large Radius (`rounded-xl`, 1.5rem / 24px):** Applied to primary card containers, anthropometric overview canvases, athlete hero summary blocks, and modal windows.
- **Pill (`rounded-full`):** Exclusively reserved for status chips, navigation tabs, filter segments, and micro action buttons.

## Components

### Buttons & Interactive Controls
- **Primary Button:** `#0B4F3A` solid background, text `#FFFFFF`, subtle inner top border (`rgba(255, 255, 255, 0.15)`), `0.5rem` radius or pill-shaped for quick actions. Hover shifts to `#0F5132` with light lift elevation.
- **Secondary / Outline Button:** `#FFFFFF` background, 1px border `#CBD5E1`, text `#0F172A`. Hover shifts border to `#10B981` with soft emerald wash background (`#F0FDF4`).
- **Segmented Filter Controls:** Encased in a pill-shaped container (`#F1F5F9`). Active state is an elevated pure-white pill with `0px 2px 4px rgba(0,0,0,0.06)` and `#0B4F3A` bold text.

### Anthropometric & Biomarker Cards
- Pure white container with `rounded-xl` corners, 1px border `#E2E8F0`.
- Top header incorporates an uppercase micro-label (`label-caps`), an optional informational tooltip icon, and an athletic status badge.
- Dominant stat displays in `metric-val-lg` using tabular figures, accompanied by a baseline difference indicator (e.g., `-1.4 kg` in `#10B981` pill chip).
- Dynamic progress bar with 4px height, muted gray track, and color-coded accent fills (Electric Cerulean for Skeletal Muscle Mass, Subtle Coral for Body Fat %).

### Athlete Profile Header
- Wide card container with subtle dual-layer background: vertical linear gradation from `#F0FDF4` (5%) to pure `#FFFFFF`.
- High-resolution circular avatar (64px or 80px) bordered by a 2px ring in `#10B981`.
- Alongside the athlete’s name, display a metadata row: age, sport, playing position, and readiness score rendered as high-contrast pill tags.

### Data Tables
- Flush, borderless cell aesthetic with a 1px horizontal separator (`#F1F5F9`).
- Table header: `#F8FAF9` background, `label-caps` styling in `#64748B`, height 40px.
- Row hover: Subtle transition to `#F9FBF9`.
- Direct data integration: In-line sparklines and target range progress meters directly embedded in numeric columns.

### Form Inputs & Checkboxes
- **Text Inputs:** Height 42px, radius `0.5rem`, border 1px solid `#CBD5E1`, background `#FFFFFF`. Active focus transitions border to `#10B981` with a `0 0 0 3px rgba(16, 185, 129, 0.12)` glow.
- **Checkboxes & Radios:** Curved square (`4px` radius) or circle, border `#94A3B8`. Checked state fills `#0B4F3A` with a crisp white glyph.