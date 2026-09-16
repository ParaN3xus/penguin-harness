/**
 * Everything the gallery discovers on disk, via Vite globs (resolved at build time, so adding a
 * file needs no registration):
 *
 * - demos: every `*.demo.tsx` under `packages/ui/src`, eager, checked against the catalog;
 * - demo sources: the same files as text, lazy, for the code drawer;
 * - icon sources: the Web App modules that declare line-icon paths, as text (see icon-registry.ts);
 * - font licences: `packages/ui/src/fonts/LICENSES/*.txt`, lazy, for `/fonts`.
 *
 * Screens have their own registry in `screens/index.ts`.
 */
import { CATALOG_SECTIONS } from "../../ui/src/catalog";
import type { Demo } from "../../ui/src/demo";
import { collectDemos } from "./lib/demos";
import { extractIconPaths, extractIconSizes } from "./lib/icon-registry";

const demoModules = import.meta.glob<{ demo?: Demo }>("../../ui/src/**/*.demo.tsx", {
  eager: true,
});

export const DEMOS = collectDemos(
  demoModules,
  CATALOG_SECTIONS.map(({ section }) => section),
);

const demoSources = import.meta.glob<string>("../../ui/src/**/*.demo.tsx", {
  query: "?raw",
  import: "default",
});

export async function loadDemoSource(path: string): Promise<string | null> {
  const load = demoSources[path];
  return load ? load() : null;
}

/** Glob path → repo-relative path, for display. */
export function repoPath(globPath: string): string {
  return globPath.replace(/^(\.\.\/)+/, "packages/");
}

const iconSources = import.meta.glob<string>(
  [
    "../../web/src/components/ui/icons.tsx",
    "../../web/src/components/ui/group-list.tsx",
    "../../web/src/components/ui/session-row-menu.tsx",
    "../../web/src/lib/stat-icons.ts",
  ],
  { query: "?raw", import: "default", eager: true },
);

export const WEB_ICONS = extractIconPaths(
  Object.fromEntries(Object.entries(iconSources).map(([path, text]) => [repoPath(path), text])),
);

const iconScale = import.meta.glob<string>("../../web/src/lib/icon-scale.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const WEB_ICON_SIZES = extractIconSizes(Object.values(iconScale)[0] ?? "");

export const FONT_LICENSES = import.meta.glob<string>("../../ui/src/fonts/LICENSES/*.txt", {
  query: "?raw",
  import: "default",
});
