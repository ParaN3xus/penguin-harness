/**
 * Mirrors the licence text of every font package @prismshadow/penguin-ui depends on into
 * `src/fonts/LICENSES/<package>.txt` — verbatim except for whitespace: line endings become LF,
 * trailing spaces go and the file ends in one newline, because the repository stores text as LF
 * (.gitattributes) and a CRLF original (Commit Mono's) would otherwise read as drift after every
 * checkout.
 *
 * The texts are checked in so the licence a build ships is reviewable in the diff that changes a
 * font, and so the `penguinUi()` Vite plugin can emit them beside the fonts
 * (`fonts-licenses/<package>.txt` in every consumer's dist) without reaching into node_modules at
 * build time.
 *
 *   pnpm --filter @prismshadow/penguin-ui sync:font-licenses           rewrite the mirror
 *   pnpm --filter @prismshadow/penguin-ui sync:font-licenses --check   exit 1 on any drift, write nothing
 *
 * A font package is any `@fontsource/*` or `@fontsource-variable/*` dependency. Its file is named
 * after the package without its scope, so `@fontsource-variable/geist` → `geist.txt`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const mirrorDir = join(packageRoot, "src", "fonts", "LICENSES");
const check = process.argv.includes("--check");

const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
const fontPackages = Object.keys(manifest.dependencies ?? {})
  .filter((name) => /^@fontsource(-variable)?\//.test(name))
  .sort();

function normalizeWhitespace(text) {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  return `${lines.join("\n").trimEnd()}\n`;
}

// Resolve from this package, through each package's `exports` (fontsource exports `./LICENSE`).
const require = createRequire(join(packageRoot, "package.json"));
const expected = new Map();
for (const name of fontPackages) {
  const file = `${name.slice(name.indexOf("/") + 1)}.txt`;
  if (expected.has(file)) {
    console.error(`sync-font-licenses: ${name} and another dependency both mirror to ${file}`);
    process.exit(1);
  }
  const text = readFileSync(require.resolve(`${name}/LICENSE`), "utf8");
  expected.set(file, { name, text: normalizeWhitespace(text) });
}

const present = existsSync(mirrorDir)
  ? readdirSync(mirrorDir).filter((file) => file.endsWith(".txt"))
  : [];
const problems = [];
for (const [file, { name, text }] of expected) {
  const path = join(mirrorDir, file);
  if (!existsSync(path)) problems.push(`missing ${file} (${name})`);
  else if (readFileSync(path, "utf8") !== text) problems.push(`stale ${file} (${name})`);
}
for (const file of present) {
  if (!expected.has(file)) problems.push(`orphaned ${file} (no font dependency mirrors to it)`);
}

if (check) {
  if (problems.length > 0) {
    console.error(
      `Font licence mirror is out of date:\n  ${problems.join("\n  ")}\n` +
        "Run `pnpm --filter @prismshadow/penguin-ui sync:font-licenses`.",
    );
    process.exit(1);
  }
  console.log(`Font licence mirror is current (${expected.size} packages).`);
} else {
  mkdirSync(mirrorDir, { recursive: true });
  for (const file of present) if (!expected.has(file)) rmSync(join(mirrorDir, file));
  for (const [file, { text }] of expected) writeFileSync(join(mirrorDir, file), text);
  console.log(
    problems.length > 0
      ? `Updated the font licence mirror:\n  ${problems.join("\n  ")}`
      : `Font licence mirror already current (${expected.size} packages).`,
  );
}
