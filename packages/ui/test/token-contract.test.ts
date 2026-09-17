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
import {
  analyzeFile,
  analyzeThemeFile,
  contractProblems,
  matchesPolicyPath,
  scanSourceRoots,
  stripCssComments,
  unscannedRoots,
} from "../src/testing";
import type { SourceFile, ThemeFileAnalysis } from "../src/testing";
import { REPO_ROOT, SRC_DIR, WEB_DIR } from "./helpers/paths";

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

describe("the de-slop revision of the contract (K-redesign §2.5)", () => {
  it("adds the control radius and the outer rhythm steps, and drops the glass highlight", () => {
    // 187 names in W0, less the inset glow line glass drew, plus three: 189.
    for (const name of ["--ui-radius-control", "--ui-stack-0", "--ui-stack-4"]) {
      expect(TOKEN_NAMES).toContain(name);
    }
    expect(TOKEN_NAMES.includes("--ui-glass-highlight" as never)).toBe(false);
    expect(TOKEN_NAMES.length).toBe(189);
  });

  it("bridges the control radius, so a pressable control reads it as rounded-control", () => {
    // `@theme inline { … }` is a block with no selector, which the CSS reader does not file, so the
    // bridge line is matched in the comment-stripped sheet.
    const sheet = stripCssComments(readFileSync(join(SRC_DIR, "theme.css"), "utf8"));
    expect(sheet).toMatch(/@theme inline\s*\{[^}]*--radius-control:\s*var\(--ui-radius-control\);/);
  });
});

describe("token reads", () => {
  // A name a component or a recipe reads but no theme declares computes to nothing: a removed token
  // still read by a recipe (Frost's glass read the inset highlight) leaves the declaration invalid
  // at computed-value time, silently, in every theme. So every `--ui-*` name the source spells —
  // in stylesheets and in string literals, never in comments — must be in the contract.
  const GALLERY = join(REPO_ROOT, "packages", "ui-gallery", "src");
  const roots = {
    ui: SRC_DIR,
    web: join(WEB_DIR, "src"),
    ...(existsSync(GALLERY) ? { gallery: GALLERY } : {}),
  };
  const scan = scanSourceRoots(roots, { repoRoot: REPO_ROOT });
  const contract = new Set<string>(TOKEN_NAMES);
  const NAME = /--ui-[a-z0-9]+(?:-[a-z0-9]+)*/g;

  const spelled = (file: SourceFile): { name: string; line: number }[] => {
    if (file.name.endsWith(".css")) {
      return stripCssComments(file.text)
        .split("\n")
        .flatMap((text, i) => [...text.matchAll(NAME)].map((m) => ({ name: m[0], line: i + 1 })));
    }
    return analyzeFile(file).strings.flatMap((chunk) =>
      [...chunk.text.matchAll(NAME)].map((m) => ({ name: m[0], line: chunk.line })),
    );
  };

  it("scans the package, the web app and the gallery when it exists, and finds reads in each", () => {
    expect(unscannedRoots(scan)).toEqual([]);
    // A name pattern or a chunk reader that stopped matching would pass the check below over nothing.
    for (const root of Object.keys(roots)) {
      const reads = scan.files.filter((file) => file.root === root).flatMap(spelled);
      expect(reads.length, `${root} spells no --ui-* name`).toBeGreaterThan(0);
    }
  });

  it("name only contract tokens", () => {
    const strays = scan.files
      // The test machinery spells names in its own messages.
      .filter((file) => !(file.root === "ui" && matchesPolicyPath(file.rel, ["testing/"])))
      .flatMap((file) =>
        spelled(file)
          .filter((found) => !contract.has(found.name))
          .map((found) => `${file.id}:${found.line} ${found.name}`),
      );
    expect(
      strays,
      "Read a name tokens.ts lists, or add the name to the contract (and to every theme file).",
    ).toEqual([]);
  });
});
