# The shared UI package gains its test harness, and the web style guards scan both source roots

- **Date:** 2026-09-16
- **Type:** process
- **Scope:** `ui`, `web`

[中文版](2026-09-16-theme-w0-guards.zh.md)

The theme system's shared UI package (`@prismshadow/penguin-ui`) gained a Node-only test suite
that judges the theme files by their computed values, and the Web App's style-guard tests were
made to scan `packages/ui/src` beside `packages/web/src`, failing by name when either root yields
no files instead of passing over nothing as components move between the two.

## Package tests

- `token-contract`: every theme × mode (light, dark) declares every name in `tokens.ts`, inside
  `@layer ui-theme` on the canonical selectors, once each, with nothing outside the contract; a
  non-default theme also re-points all eleven gray steps.
- `contrast`: WCAG 2 ratios resolved from the theme CSS — text on every surface (4.5:1), tone inks
  on the page surfaces (3:1, `neutral` exempt), tone text on its tint and solid-badge labels
  (4.5:1), and the accent label on the theme accent and on every user preset (4.5:1). Shortfalls
  are recorded in an exception list that fails once an entry starts passing.
- `no-app-strings` and `no-theme-reads`: the package imports nothing from the web app's
  dictionaries, and nothing outside the theme machinery reads the theme id.
- `demo-coverage`: every component directory carries a `*.demo.tsx`, with an empty exemption list.
- `font-licenses`: every font dependency has its licence mirrored under `src/fonts/LICENSES/`,
  matching the installed package's text, and every font the stylesheets load comes from one.
- `boot-script`: `BOOT_SCRIPT` paints what `applyThemeAttributes` would for every combination of
  stored preferences, and `packages/web/index.html` carries it verbatim.
- A theme file that is still a stub, a package with no fonts or components yet, and an index.html
  with no inline script are reported as named skipped cases rather than passes.

## Test helpers

- `src/testing/` gained a source-root scanner with per-root file counts, a CSS rule reader, a
  theme-file analyzer that resolves `var()` through the theme cascade, colour parsing (hex, `rgb()`,
  `hsl()`, `oklch()`, `color-mix(in srgb, …)`) with WCAG contrast, and static-render helpers.
- `packages/ui` gained a `vitest.config.ts`; its `test` script no longer passes on an empty suite.

## Web guards

- `packages/web/test/helpers/roots.ts` names the two source roots and provides
  `expectEveryRootScanned`, `sourceFile` and `expectSingleHome`.
- The 21 style guards — `control-size`, `icon-scale`, `tone`, `disclosure-anchor`,
  `disclosure-body`, `company-click-targets`, `required-mark`, `info-popover`, `help-fold`,
  `title-reveal`, `session-activity`, `session-row-menu`, `company-beta`, `todo-notice`,
  `modal-focus`, `esc-layers`, `portal-panel-dismiss`, `context-menu`, `inner-html-stability`,
  `group-list`, `autofill` — scan both roots, assert each yielded files, and assert every module
  they read lives in exactly one place; files are named by repo-relative path.
- `GlyphIcon` draws its stroke from `--ui-icon-stroke` with a 1.7 fallback, and `icon-scale`
  asserts that and checks each theme's token against the line-family weights 1.7 / 1.6 / 1.4.
