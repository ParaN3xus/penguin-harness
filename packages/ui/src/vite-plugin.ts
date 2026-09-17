/**
 * `penguinUi()` — the Vite plugin every consumer of this package installs.
 *
 * The package is source-only. The workspace injects workspace packages
 * (`injectWorkspacePackages: true`), so `node_modules/@prismshadow/penguin-ui` is a snapshot that
 * pnpm only re-syncs after an install or a `build` script — and this package has no build. The
 * alias therefore points every `@prismshadow/penguin-ui` specifier, JS and CSS alike
 * (`@tailwindcss/vite` resolves `@import` through Vite's resolver), at the live `src/` beside
 * this file, following the `exports` map in package.json.
 *
 * Import it by RELATIVE path from a vite/vitest config (`../ui/src/vite-plugin`), not by package
 * name: a config file is bundled by esbuild, which externalises anything resolved under
 * node_modules — so the package-name import would load this file from the stale snapshot, and as
 * a `.ts` file under node_modules, which Node refuses to strip types from.
 *
 * On a build it also emits the bundled fonts' licence texts (`src/fonts/LICENSES/*.txt`: mirrored
 * from the font packages by `scripts/sync-font-licenses.mjs`, and MiSans's transcribed from its
 * licensor) as `fonts-licenses/<name>.txt`, so every dist that carries the fonts — the served app,
 * the desktop bundle, the gallery — carries their licences beside them.
 *
 * Structural types only, so the package needs no `vite` dependency.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface PenguinUiAlias {
  find: RegExp;
  replacement: string;
}

/** The slice of Rollup's plugin context the licence emission uses. */
export interface PenguinUiEmitContext {
  emitFile(file: { type: "asset"; fileName: string; source: string }): string;
}

export interface PenguinUiPlugin {
  name: string;
  config: () => { resolve: { alias: PenguinUiAlias[] } };
  generateBundle: (this: PenguinUiEmitContext) => void;
}

/** Where the emitted licence texts land in a consumer's dist. */
export const FONT_LICENSES_DIR = "fonts-licenses";

/** The licence texts in `src/fonts/LICENSES/`, `{ fileName, source }` per font, sorted by file name. */
export function fontLicenseAssets(): { fileName: string; source: string }[] {
  const dir = new URL("./fonts/LICENSES/", import.meta.url);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".txt"))
    .sort()
    .map((file) => ({
      fileName: `${FONT_LICENSES_DIR}/${file}`,
      source: readFileSync(new URL(file, dir), "utf8"),
    }));
}

/** package.json `exports` subpath → file under src/. Keep the two in step. */
const EXACT_SUBPATHS: Readonly<Record<string, string>> = {
  "": "index.ts",
  "/theme.css": "theme.css",
  "/fonts.css": "fonts/index.css",
  "/boot": "boot.ts",
  "/vite": "vite-plugin.ts",
  "/fixtures": "fixtures/index.ts",
  "/testing": "testing/index.ts",
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** The alias entries on their own, for a config that cannot take the plugin (vitest). */
export function penguinUiAliases(): PenguinUiAlias[] {
  const src = fileURLToPath(new URL("./", import.meta.url));
  return [
    { find: /^@prismshadow\/penguin-ui\/themes\/(.+)$/, replacement: `${src}themes/$1` },
    ...Object.entries(EXACT_SUBPATHS).map(([subpath, file]) => ({
      find: new RegExp(`^@prismshadow\\/penguin-ui${escapeRegExp(subpath)}$`),
      replacement: `${src}${file}`,
    })),
  ];
}

export function penguinUi(): PenguinUiPlugin {
  return {
    name: "penguin:ui",
    config: () => ({ resolve: { alias: penguinUiAliases() } }),
    // Build only: Vite never calls generateBundle from the dev server.
    generateBundle() {
      for (const asset of fontLicenseAssets()) this.emitFile({ type: "asset", ...asset });
    },
  };
}
