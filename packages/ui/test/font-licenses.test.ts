/**
 * Every font the package ships carries its licence (A-architecture §5).
 *
 * The fonts are bundled into the Web App's `dist/` — and from there into the server tarball and the
 * desktop app — so the OFL's condition travels with them: the licence text has to ship beside the
 * font files. The package mirrors each font dependency's licence into `src/fonts/LICENSES/`
 * (`scripts/sync-font-licenses.mjs`), and the Vite plugin emits that directory into every consumer's
 * build. What decays is the mirror: a font added without its text, a text left behind after its
 * font was dropped, a copy that no longer matches the package it came from, or a `@font-face` that
 * names a file the package does not have. Each is checked here.
 *
 * Naming: a dependency `@fontsource[-variable]/<family>` mirrors to `LICENSES/<family>.txt`, the
 * text normalized the way the sync script writes it (LF endings, no trailing spaces, one final
 * newline). Fonts arrive as dependencies only; a font binary checked into the package is refused.
 *
 * Until the package ships a font, the checks have nothing to hold and say so as a skipped case.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceRoots, stripCssComments } from "../src/testing";
import { PACKAGE_DIR, REPO_ROOT, SRC_DIR } from "./helpers/paths";

const FONTS_DIR = join(SRC_DIR, "fonts");
const LICENSES_DIR = join(FONTS_DIR, "LICENSES");
const NODE_MODULES = join(PACKAGE_DIR, "node_modules");
const FONT_PACKAGE = /^@fontsource(?:-variable)?\/([a-z0-9-]+)$/;
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)$/i;
/** The licences a bundled font may carry. */
const KNOWN_LICENSE = /SIL OPEN FONT LICENSE|Apache License|Permission is hereby granted/i;
const LICENSE_FILES = ["LICENSE", "LICENSE.txt", "LICENSE.md", "OFL.txt"];

const manifest = JSON.parse(readFileSync(join(PACKAGE_DIR, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
};
const fontDependencies = Object.keys(manifest.dependencies ?? {}).filter((name) =>
  FONT_PACKAGE.test(name),
);
const family = (dependency: string) => FONT_PACKAGE.exec(dependency)![1]!;

interface FontReference {
  /** The stylesheet's repo-relative id. */
  readonly file: string;
  /** As written in `url()` or `@import`. */
  readonly specifier: string;
  /** The npm package the reference lands in (`@fontsource-variable/geist`); null for our own files. */
  readonly dependency: string | null;
  /** Absolute path of the target inside the installed package; null for our own files. */
  readonly target: string | null;
}

/**
 * Every `url()` and `@import` in the fonts CSS, placed: a bare `@scope/name/…` specifier, or a
 * relative path that climbs into `node_modules/@scope/name/…`, lands in that package; a relative
 * path to one of our own sheets lands in none.
 */
function fontReferences(): FontReference[] {
  if (!existsSync(FONTS_DIR)) return [];
  const scan = scanSourceRoots({ fonts: FONTS_DIR }, { repoRoot: REPO_ROOT, extensions: [".css"] });
  const refs: FontReference[] = [];
  const place = (file: { id: string; path: string }, specifier: string) => {
    if (specifier.startsWith("data:")) return;
    const bare = specifier.startsWith(".") ? null : /^(@[^/]+\/[^/]+)/.exec(specifier)?.[1];
    if (bare !== null) {
      refs.push({
        file: file.id,
        specifier,
        dependency: bare ?? null,
        target: bare === undefined ? null : join(NODE_MODULES, specifier),
      });
      return;
    }
    const target = resolve(dirname(file.path), specifier.replace(/[?#].*$/, ""));
    const [scope, name] = relative(NODE_MODULES, target).split(sep);
    const dependency =
      scope !== undefined && scope.startsWith("@") && name !== undefined
        ? `${scope}/${name}`
        : null;
    refs.push({
      file: file.id,
      specifier,
      dependency,
      target: dependency === null ? null : target,
    });
  };
  for (const file of scan.files) {
    const css = stripCssComments(file.text);
    for (const m of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/g)) place(file, m[2]!.trim());
    for (const m of css.matchAll(/@import\s+(["'])([^"']+)\1/g)) place(file, m[2]!.trim());
  }
  return refs;
}

/** Font binaries checked into the package itself (node_modules excluded). */
function vendoredFonts(dir = PACKAGE_DIR, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) vendoredFonts(path, out);
    else if (FONT_FILE.test(name)) out.push(path.slice(PACKAGE_DIR.length));
  }
  return out;
}

/** The licence file inside an installed dependency, or undefined. */
function installedLicense(dependency: string): string | undefined {
  const dir = join(NODE_MODULES, dependency);
  const file = LICENSE_FILES.map((name) => join(dir, name)).find((path) => existsSync(path));
  return file === undefined ? undefined : readFileSync(file, "utf8");
}

/** The sync script's normalization: LF endings, no trailing spaces, one final newline. */
const normalize = (text: string) =>
  `${text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd()}\n`;

describe("font licences", () => {
  const references = fontReferences();
  const vendored = vendoredFonts();
  const mirrored = existsSync(LICENSES_DIR)
    ? readdirSync(LICENSES_DIR).filter((name) => name.endsWith(".txt"))
    : [];
  const shipsFonts =
    fontDependencies.length > 0 ||
    references.some((ref) => ref.dependency !== null) ||
    vendored.length > 0 ||
    mirrored.length > 0;

  if (!shipsFonts) {
    it.skip("src/fonts — PENDING, the package ships no font yet: licences not checked", () => {});
    return;
  }

  it("are mirrored for every font dependency", () => {
    const missing = fontDependencies
      .filter((dependency) => !mirrored.includes(`${family(dependency)}.txt`))
      .map((dependency) => `${dependency} → src/fonts/LICENSES/${family(dependency)}.txt`);
    expect(missing, "Run `pnpm --filter @prismshadow/penguin-ui sync:font-licenses`.").toEqual([]);
  });

  it("are not kept for fonts the package no longer depends on", () => {
    const families = new Set(fontDependencies.map(family));
    expect(mirrored.filter((name) => !families.has(name.replace(/\.txt$/, "")))).toEqual([]);
  });

  it("match the licence each dependency ships, and are a licence a bundled font may carry", () => {
    const problems: string[] = [];
    for (const dependency of fontDependencies) {
      const copy = join(LICENSES_DIR, `${family(dependency)}.txt`);
      if (!existsSync(copy)) continue; // reported above
      const text = readFileSync(copy, "utf8");
      if (!KNOWN_LICENSE.test(text)) problems.push(`${dependency}: not a recognised font licence`);
      const upstream = installedLicense(dependency);
      if (upstream === undefined) {
        problems.push(`${dependency}: no licence file in the installed package`);
      } else if (normalize(upstream) !== text) {
        problems.push(`${dependency}: the mirrored text has drifted from the package's own`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("cover every font the stylesheets load, which must exist in its package", () => {
    const problems: string[] = [];
    for (const { file, specifier, dependency, target } of references) {
      if (dependency === null) continue; // one of our own sheets
      if (!fontDependencies.includes(dependency)) {
        problems.push(`${file}: ${specifier} is from ${dependency}, not a font dependency`);
      } else if (!mirrored.includes(`${family(dependency)}.txt`)) {
        problems.push(`${file}: ${specifier} is from ${dependency}, whose licence is not mirrored`);
      } else if (target === null || !existsSync(target)) {
        problems.push(`${file}: ${specifier} does not exist in the installed package`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("finds the font files the stylesheets load — the scan is exercised on the real sheets", () => {
    // A reference pattern that stopped matching would pass the check above over nothing.
    expect(references.filter((ref) => ref.dependency !== null).length).toBeGreaterThan(0);
  });

  it("arrive as dependencies, never as binaries checked into the package", () => {
    expect(vendored).toEqual([]);
  });
});
