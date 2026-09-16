# The shared UI package bundles its fonts and defines the Frost and Console themes

- **Date:** 2026-09-16
- **Type:** feature
- **Scope:** `ui`

[中文版](2026-09-16-theme-fonts-frost-console.zh.md)

`@prismshadow/penguin-ui` gained the fonts of all three themes and the token values of its two new
themes, Frost (`modern`, rounded and frosted, after sierra.ai) and Console (`geek`, square hairlines
and mono labels, after e2b.dev). Nothing in the Web App names a new theme or font yet, so the app
looks exactly as before.

## Fonts

- Eight fontsource packages, all SIL Open Font License 1.1: Mona Sans and JetBrains Mono (Primer,
  declared for the later Primer polish), Geist and Geist Mono (Frost), IBM Plex Sans, IBM Plex Sans
  Condensed and Commit Mono (Console), and Noto Sans SC for Chinese in every theme.
- `fonts/github.css`, `modern.css` and `geek.css` declare each theme's Latin faces by hand, latin and
  latin-ext only and woff2 only; `fonts/cjk.css` imports fontsource's Noto Sans SC stylesheet, 101
  `unicode-range` slices. A page downloads only the faces the active theme names and the Noto slices
  its text touches.
- A build carries about 0.44 MB of Latin faces and 4.5 MB of Noto Sans SC.
- `scripts/sync-font-licenses.mjs` mirrors each font package's licence into `fonts/LICENSES/`
  (`--check` reports drift), and the `penguinUi()` Vite plugin emits those texts into every build as
  `fonts-licenses/<package>.txt`.

## Themes

- `themes/modern.css` and `themes/geek.css` define all 187 tokens in light and dark, plus the gray and
  white re-pointing that carries the app's existing palette classes onto each theme's neutrals.
- Frost: warm off-white canvas and white cards, radii from 4 to 24 px with pill controls, a green
  accent, regular-weight display type, and translucent blurred overlays. Its dark mode is a warm
  near-black palette of our own, since sierra.ai has none.
- Console: black (or white) canvas, 1 px rules, radius 0 everywhere, an orange accent, condensed
  uppercase headings, mono uppercase button labels, and depth drawn with lines instead of shadows.
- Both themes carry the `done` and `info` tones. Every tone reads at 4.5:1 as text on its own tint
  and at 3:1 as a mark on every surface.
- Each theme implements the declared style hooks (`.ui-glass`, `.ui-wash`, `.ui-grid`, `.ui-ticks`,
  `.ui-eyebrow`, `.ui-display`, `.ui-live`, `.ui-frame`, `.ui-pill-hover`, `.ui-underline-nav`),
  leaving the ones it does not use as no-ops.
