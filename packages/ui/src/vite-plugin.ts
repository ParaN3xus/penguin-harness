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
 * Structural types only, so the package needs no `vite` dependency.
 */
import { fileURLToPath } from "node:url";

export interface PenguinUiAlias {
  find: RegExp;
  replacement: string;
}

export interface PenguinUiPlugin {
  name: string;
  config: () => { resolve: { alias: PenguinUiAlias[] } };
}

/** package.json `exports` subpath → file under src/. Keep the two in step. */
const EXACT_SUBPATHS: Readonly<Record<string, string>> = {
  "": "index.ts",
  "/theme.css": "theme.css",
  "/fonts.css": "fonts/index.css",
  "/boot": "boot.ts",
  "/vite": "vite-plugin.ts",
  "/fixtures": "fixtures/index.ts",
  "/screens": "screens/index.ts",
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
  };
}
