# AeroScope — Design Tokens

Reference doc for UI agents. All tokens below are bound as CSS custom properties in `app/globals.css` and as Tailwind utilities via `tailwind.config.ts`. Use token names, never hardcoded hex.

## Themes

Set on `<html data-theme="dark">` or `<html data-theme="light">`. Default is `dark`. Both themes define the same token names; only the values differ.

## Palette — Dark (Mission Control, default)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0b0e13` | Page background |
| `--bg-1` | `#11151d` | Cards, navbar, topbar |
| `--bg-2` | `#161b26` | Inputs, secondary surfaces |
| `--bg-3` | `#1d2432` | Active nav item, chip default bg |
| `--bg-hover` | `#1a2130` | Hover state |
| `--line` | `#242c3a` | Dividers, borders |
| `--line-2` | `#2e3849` | Emphasized borders |
| `--text` | `#e6eaf2` | Primary text |
| `--text-2` | `#a8b2c5` | Secondary text |
| `--text-3` | `#6b7689` | Tertiary / muted |
| `--text-4` | `#4a5368` | Disabled / faint |
| `--accent` | `#ffb020` | **Signal amber** — primary CTA, brand mark, active tab |
| `--accent-2` | `#ffcc5c` | Hover state of accent |
| `--cyan` | `#4fd1c5` | Standards, radar/trace visuals |
| `--green` | `#58d68d` | OK, verified, fielded |
| `--red` | `#ff6b6b` | Danger, gaps, conflicts |
| `--magenta` | `#c8a2ff` | Components |
| `--blue` | `#6aa9ff` | Systems |

## Palette — Light (Corporate / Neo4j-ish)

Accent shifts to `#0052cc` (Neo4j blue), cyan to `#0694a2`. Background becomes off-white `#f5f6f8`. See `app/globals.css` for full light-theme block.

## Typography

- Sans: `"Geist", "Inter", system-ui, sans-serif`
- Mono: `"JetBrains Mono", "IBM Plex Mono", "Geist Mono", ui-monospace`
- Use `.mono` class or `font-mono` Tailwind utility for code, IDs, timestamps, telemetry-style labels.

## Radii

- `--r-sm` = 4px (chips, tight corners)
- `--r-md` = 6px (buttons, inputs, cards)
- `--r-lg` = 10px (modals, hero cards)

## Shadows

- `--shadow-1`: subtle elevation (cards)
- `--shadow-2`: heavy elevation (modals, popovers)
- `--shadow-glow`: focus / selected state (amber glow on dark, blue on light)

## Reusable classes (in `app/globals.css`)

- `.brand-mark` — 28×28 amber square with mono text (e.g., "AS")
- `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.sm` — buttons
- `.chip` + variants (`.id`, `.ok`, `.verified`, `.warn`, `.partial`, `.danger`, `.gap`, `.standard`, `.system`, `.component`) — requirement metadata badges
- `.input` — 40px text input with amber focus glow
- `.card`, `.card.pad` — bordered surfaces
- `.hstack`, `.vstack`, `.spacer` — layout utilities
- `.mono` — monospace text

## Design motifs (for login screen)

Login should blend two visual cues adapted from the reference mockups:

### "Radar scope" motif
- Concentric rings centered on a focal point (4 or 5 rings, stroke `--line-2`, fading outward)
- Cross-hair axes (horizontal + vertical lines, `--line` color)
- A rotating sweep line anchored at center, 90° wedge with gradient fade, animated `animation: radar-sweep 4s linear infinite` (keyframe already defined in globals.css)
- 3–5 "contact" dots placed at random positions inside rings, pulsing via `animation: pulse 2s ease-in-out infinite`
- Color: use `--cyan` for the sweep and rings, subtle against dark `--bg`

### "Flight path" motif
- 2–3 curved SVG paths tracing great-circle-style arcs across the background
- Dashed `stroke-dasharray` with slow `stroke-dashoffset` animation for motion feeling
- Waypoint dots at arc endpoints (use `--accent` amber)
- Optional small jet/aircraft glyph (generic silhouette, NOT any real aircraft model) at a waypoint

### How to combine
- Radar scope as the left 55%, Flight path as a subtle overlay behind the login form (right 45%), OR
- Radar scope as full-page background ambient, flight-path curves as foreground accents, glass-morphism login card centered
- Use amber `--accent` for primary CTA and one radar contact highlight; cyan `--cyan` for the radar rings and flight-path strokes
- NO Turkish text, NO real aircraft names, NO reference to DOORS in the brand (we are AeroScope)

## Layout grid (for dashboard)

- 56px topbar
- 240px left nav (`--nav-w`)
- Remaining: main content area
- Grid areas: `topbar topbar` / `nav main`

## ZERO TOLERANCE string list (must not appear anywhere)

Do not include `TAI`, `ANKA`, `Aksungur`, `KAAN`, `TOLUN`, `TUSAŞ`, `TUSAS`, `ASELSAN`, `ROKETSAN`, `BAYKAR`, `HAVELSAN`, `TEI`, `TB3`, `HURKUS`, `HURJET`, `GOKBEY`, `ATAK`, `Türk`, `TSK`, `MUM-T`, `Turkish Aerospace`, `İHA`, `LTAB`, `Link-16`, `STANAG 5516`, `Havacılık`, `Gereksinim`, `Oturum aç`, `Kullanıcı adı`, `Parola`, `Giriş yap` in code, comments, strings, filenames, or SVG contents. Run `npm run scrub-check` before committing.

Allowed fictional names: AeroSys Dynamics (company), Stratos-7, AeroLynx-X2, Skyrunner-T1, Nimbus-C3 (platforms). Real public standards are fine (DO-178C, ARP4754A, MIL-STD-1553B, DO-254, DO-160, ARINC 429, STANAG 4586).
