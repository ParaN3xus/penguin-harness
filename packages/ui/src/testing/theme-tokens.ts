/**
 * Reading a theme file (`src/themes/<id>.css`) the way the token contract describes it, for the
 * contract and contrast tests — and for anyone filling a theme who wants the list of what is
 * still missing without running the suite.
 *
 * A theme file is one `@layer ui-theme` block with a light rule and a dark rule on fixed
 * selectors (tokens.ts, `themes/github.css`):
 *
 *   default theme   light `:root, :root[data-theme="github"]`   dark `:root.dark, :root[data-theme="github"].dark`
 *   any other       light `:root[data-theme="<id>"]`             dark `:root[data-theme="<id>"].dark`
 *
 * Each rule declares every contract name, plus the gray bridge that re-points Tailwind's own
 * palette variables. Nothing else is a token.
 */
import { DEFAULT_THEME_ID, THEME_MODES, TOKEN_NAMES } from "../tokens";
import type { ThemeId, ThemeModeName } from "../tokens";
import { parseCssRules, selectorList } from "./css";
import type { CssDeclaration } from "./css";

/** The layer every theme block lives in, so a user accent preset (`@layer ui-accent`) beats it. */
export const THEME_LAYER = "@layer ui-theme";

/** Tailwind palette variables a theme may re-point: the gray bridge, plus white and black. */
export const BRIDGE_VARIABLE = /^--color-(?:white|black|gray-(?:50|[1-9]00|950))$/;

/** The eleven gray steps. A non-default theme re-points all of them in both modes (see below). */
export const GRAY_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Marker a stub theme file carries in its header comment until its tokens are written. */
export const STUB_MARKER = "Stub:";

const CONTRACT = new Set<string>(TOKEN_NAMES);

/** The canonical selector list of a theme's rule for one mode. */
export function themeSelectors(themeId: ThemeId, mode: ThemeModeName): string[] {
  const attr = `:root[data-theme="${themeId}"]`;
  const suffix = mode === "dark" ? ".dark" : "";
  return themeId === DEFAULT_THEME_ID
    ? [`:root${suffix}`, `${attr}${suffix}`]
    : [`${attr}${suffix}`];
}

export interface ThemeFileAnalysis {
  readonly themeId: ThemeId;
  /** Custom properties declared by the canonical rule(s) of each mode, name → value. */
  readonly modes: Readonly<Record<ThemeModeName, ReadonlyMap<string, string>>>;
  /** True once any rule in the file declares a `--ui-*` property. */
  readonly declaresTokens: boolean;
  /** True while the header still carries {@link STUB_MARKER} and nothing is declared. */
  readonly isStub: boolean;
  /** Shape problems: token declarations outside the canonical rules or layer, duplicates. */
  readonly structure: readonly string[];
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((s) => b.includes(s));

export function analyzeThemeFile(css: string, themeId: ThemeId): ThemeFileAnalysis {
  const rules = parseCssRules(css);
  const modes = { light: new Map<string, string>(), dark: new Map<string, string>() };
  const firstLine = { light: new Map<string, number>(), dark: new Map<string, number>() };
  const structure: string[] = [];
  let declaresTokens = false;

  for (const rule of rules) {
    const custom = rule.declarations.filter((d: CssDeclaration) => d.name.startsWith("--"));
    if (rule.declarations.some((d) => d.name.startsWith("--ui-"))) declaresTokens = true;
    if (custom.length === 0) continue;
    const selectors = selectorList(rule.selector);
    const mode = THEME_MODES.find((m) => sameSet(selectors, themeSelectors(themeId, m)));
    if (mode === undefined) {
      structure.push(
        `line ${rule.line}: \`${rule.selector}\` declares ${custom[0]!.name} — tokens belong in the ` +
          `canonical rules (${THEME_MODES.map((m) => `\`${themeSelectors(themeId, m).join(", ")}\``).join(" / ")})`,
      );
      continue;
    }
    if (rule.parents.length > 0 || rule.atRules.length !== 1 || rule.atRules[0] !== THEME_LAYER) {
      const where = [...rule.atRules, ...rule.parents].join(" › ") || "top level";
      structure.push(
        `line ${rule.line}: the ${mode} rule sits in ${where}; it must sit directly in \`${THEME_LAYER}\` ` +
          `so the user's accent presets (\`@layer ui-accent\`) override it`,
      );
    }
    for (const declaration of custom) {
      const seen = firstLine[mode].get(declaration.name);
      if (seen !== undefined) {
        structure.push(
          `line ${declaration.line}: ${declaration.name} is declared again for ${mode} (first at line ${seen}); the later one silently wins`,
        );
      } else firstLine[mode].set(declaration.name, declaration.line);
      modes[mode].set(declaration.name, declaration.value);
    }
  }

  return {
    themeId,
    modes,
    declaresTokens,
    isStub: !declaresTokens && css.includes(STUB_MARKER),
    structure,
  };
}

/** Contract problems for one mode: missing names, names outside the contract, bad values. */
export function contractProblems(analysis: ThemeFileAnalysis, mode: ThemeModeName): string[] {
  const declared = analysis.modes[mode];
  const problems: string[] = [];
  const missing = TOKEN_NAMES.filter((name) => !declared.has(name));
  if (missing.length > 0) {
    problems.push(`missing ${missing.length} of ${TOKEN_NAMES.length}: ${missing.join(", ")}`);
  }
  for (const [name, value] of declared) {
    if (name.startsWith("--ui-") && !CONTRACT.has(name)) {
      problems.push(`${name} is not in tokens.ts — add it to the contract or remove it`);
    } else if (!name.startsWith("--ui-") && !BRIDGE_VARIABLE.test(name)) {
      problems.push(
        `${name} is neither a contract token nor a bridged Tailwind palette variable (${BRIDGE_VARIABLE})`,
      );
    }
    if (value === "") problems.push(`${name} has an empty value`);
    for (const ref of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const target = ref[1]!;
      if (target.startsWith("--ui-") && !CONTRACT.has(target)) {
        problems.push(`${name} reads ${target}, which is not a contract token`);
      }
    }
  }
  if (analysis.themeId !== DEFAULT_THEME_ID) {
    // The default theme's rules match every <html> (`:root`, `:root.dark`), so a gray step this
    // theme leaves alone renders in the default theme's value — the palette classes the app
    // still spells would mix two themes on one screen.
    const grays = GRAY_STEPS.filter((step) => !declared.has(`--color-gray-${step}`));
    if (grays.length > 0) {
      problems.push(
        `the gray bridge is incomplete — re-point ${grays.map((s) => `--color-gray-${s}`).join(", ")}`,
      );
    }
  }
  return problems;
}

/**
 * The value a custom property resolves to for `mode` of a theme, following the cascade the
 * selectors produce: the mode's own rule, then (dark only) the same theme's light rule, which the
 * dark `<html>` also matches, then the default theme's rules, which match every `<html>`.
 * `var()` references are substituted recursively, fallbacks honoured. `null` when unresolvable.
 */
export function resolveThemeValue(
  name: string,
  mode: ThemeModeName,
  theme: ThemeFileAnalysis,
  defaultTheme: ThemeFileAnalysis,
): string | null {
  const scopes: ReadonlyMap<string, string>[] = [];
  const push = (analysis: ThemeFileAnalysis) => {
    scopes.push(analysis.modes[mode]);
    if (mode === "dark") scopes.push(analysis.modes.light);
  };
  push(theme);
  if (defaultTheme !== theme) push(defaultTheme);

  const lookup = (key: string) => {
    for (const scope of scopes) {
      const value = scope.get(key);
      if (value !== undefined) return value;
    }
    return undefined;
  };

  /** Replaces every `var()` in `value`, left to right; `depth` counts reference hops (cycle guard). */
  const substitute = (value: string, depth: number): string | null => {
    if (depth > 32) return null;
    let out = value;
    for (;;) {
      const at = out.indexOf("var(");
      if (at === -1) return out;
      let parens = 0;
      let end = -1;
      for (let i = at + 3; i < out.length; i++) {
        if (out[i] === "(") parens++;
        else if (out[i] === ")" && --parens === 0) {
          end = i;
          break;
        }
      }
      if (end === -1) return null;
      const inner = out.slice(at + 4, end);
      const comma = inner.indexOf(",");
      const ref = (comma === -1 ? inner : inner.slice(0, comma)).trim();
      const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
      const found = lookup(ref);
      const replacement =
        found !== undefined
          ? substitute(found, depth + 1)
          : fallback !== undefined
            ? substitute(fallback, depth + 1)
            : null;
      if (replacement === null) return null;
      out = out.slice(0, at) + replacement + out.slice(end + 1);
    }
  };

  const raw = lookup(name);
  return raw === undefined ? null : substitute(raw, 0);
}
