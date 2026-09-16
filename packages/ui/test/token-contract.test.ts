/**
 * The token contract (src/tokens.ts): every theme × mode defines every name, and nothing else is
 * a token.
 *
 * Components read tokens by name and never ask which theme is active, so a name one theme leaves
 * out does not fail loudly anywhere — the property is simply unset, the utility that reads it
 * computes to its initial value, and a surface turns transparent or a label falls back to the
 * browser's serif in that one theme and mode only. The theme files are parsed here and diffed
 * against the contract so that gap is a named test failure instead of a screenshot someone has to
 * notice.
 *
 * A theme file that does not exist yet, or is still the skeleton's stub (its header says `Stub:`
 * and it declares no `--ui-*` property), is reported as a skipped, named case — never as a pass.
 * The moment a file declares a single token, the whole contract applies to it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, THEME_IDS, THEME_MODES, TOKEN_GROUPS, TOKEN_NAMES } from "../src/tokens";
import type { ThemeId } from "../src/tokens";
import { analyzeThemeFile, contractProblems } from "../src/testing";
import type { ThemeFileAnalysis } from "../src/testing";
import { SRC_DIR } from "./helpers/paths";

type ThemeState =
  | { id: ThemeId; file: string; status: "filled"; analysis: ThemeFileAnalysis }
  | { id: ThemeId; file: string; status: "pending"; reason: string };

function themeState(id: ThemeId): ThemeState {
  const file = `src/themes/${id}.css`;
  const path = join(SRC_DIR, "themes", `${id}.css`);
  if (!existsSync(path)) {
    return { id, file, status: "pending", reason: "the file does not exist yet" };
  }
  const analysis = analyzeThemeFile(readFileSync(path, "utf8"), id);
  if (analysis.isStub) {
    return {
      id,
      file,
      status: "pending",
      reason: "still the skeleton's stub (no --ui-* declared)",
    };
  }
  return { id, file, status: "filled", analysis };
}

const THEMES = THEME_IDS.map(themeState);

describe("the contract itself", () => {
  it("lists each name once, every one a --ui-* custom property", () => {
    expect(TOKEN_NAMES.length).toBeGreaterThan(0);
    expect(new Set(TOKEN_NAMES).size).toBe(TOKEN_NAMES.length);
    expect(TOKEN_NAMES.filter((name) => !/^--ui-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))).toEqual([]);
  });

  it("flattens its groups in order, with no empty group", () => {
    expect(TOKEN_GROUPS.flatMap((group) => group.names)).toEqual(TOKEN_NAMES);
    expect(TOKEN_GROUPS.map((group) => group.names.length).filter((n: number) => n === 0)).toEqual(
      [],
    );
    expect(new Set(TOKEN_GROUPS.map((group) => group.id)).size).toBe(TOKEN_GROUPS.length);
  });
});

describe("theme files", () => {
  it("exist for the default theme, which every other theme's cascade falls back on", () => {
    // Skipping a stub is for themes still being written; the default file's absence would leave
    // every <html> with no tokens at all.
    expect(existsSync(join(SRC_DIR, "themes", `${DEFAULT_THEME_ID}.css`))).toBe(true);
  });

  for (const theme of THEMES) {
    if (theme.status === "pending") {
      it.skip(`${theme.file} — PENDING, contract not checked: ${theme.reason}`, () => {});
      continue;
    }
    const { analysis } = theme;

    describe(theme.file, () => {
      it("declares its tokens in the two canonical rules, inside @layer ui-theme, once each", () => {
        expect(analysis.structure).toEqual([]);
      });

      for (const mode of THEME_MODES) {
        it(`defines every contract name in ${mode} mode, and nothing outside the contract`, () => {
          expect(
            contractProblems(analysis, mode),
            `${theme.file} (${mode}) must declare exactly the names in tokens.ts`,
          ).toEqual([]);
        });
      }
    });
  }
});
