# A local component gallery renders the shared UI package in every theme

- **Date:** 2026-09-16
- **Type:** process
- **Scope:** `ui-gallery`, `ui`, `tooling`, `ci`
- **PR:** [#764](https://github.com/Prism-Shadow/penguin-harness/pull/764)

[中文版](2026-09-16-theme-gallery.zh.md)

A new private package, `@prismshadow/penguin-ui-gallery`, is a Vite + React app that shows the shared UI
package's tokens, component demos and screen composites in each of the three themes (Primer, Frost,
Console), light and dark, at the 16 / 18 / 20 px root sizes and in English and Chinese. It is a local
dev tool started with `pnpm dev:gallery` on port 7372 and never ships with the product. Nothing in the
Web App changed.

## The gallery

- One long page in the order of the component partition: a sticky rail with the theme, mode, size and
  language switches, a side-by-side compare of the three themes, a reduced-motion switch and a
  scroll-spied section list; then numbered sections, each with a preview card, variant pills and a
  tokens / code drawer.
- Every view is addressable. The URL carries the theme, mode, size, language and each section's variant
  pick; every card shows a quotable breadcrumb such as `Console › Actions › Button › danger · sm · dark`,
  and every section has a copy-link button.
- Foundations pages are generated from `tokens.ts`: colour (swatches, resolved values and WCAG contrast,
  for the active theme or as a matrix across all six theme × mode pairs), typography with English and
  Chinese specimens, shape, elevation and glass, spacing and density with measured control heights,
  motion, the Web App's line icons at the theme's stroke, focus and selection, the style hooks on the
  markup their recipes expect, and the layering tiers. A coverage strip counts the tokens each theme
  and mode defines.
- Component demos are collected from `packages/ui/src/**/*.demo.tsx`; until a component has one, its
  section shows the planned exports, props, wave and the web code it replaces. `/embed` renders one
  section alone, `/screens/<name>` shows the full-page composites from `packages/ui/src/screens`, and
  `/fonts` shows each theme's families, the declared font faces and the licence texts.
- Chrome copy is in English and Chinese, local to the gallery.

## Package additions

- `packages/ui/src/catalog.ts` lists the gallery's groups and sections, and `packages/ui/src/demo.ts`
  defines the demo contract (`defineDemo`).

## Tooling

- `pnpm --filter @prismshadow/penguin-ui-gallery shots` writes Playwright screenshots of any sections ×
  themes × modes × languages through `/embed`.
- The root `pnpm dev:gallery` script starts the gallery; the manual-test skill lists it; CI runs the
  gallery's unit tests in the `rest` shard, and `pnpm -r build` builds it.
