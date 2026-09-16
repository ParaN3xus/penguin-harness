#!/usr/bin/env node
/**
 * Screenshots of gallery sections through `/embed`, one PNG per section × variant × theme × mode ×
 * language, written to `<out>/<theme>/<mode>/<lang>/<section>[--<variant>].png`.
 *
 * Needs the gallery running (`pnpm dev:gallery`, port 7372) and Playwright's Chromium. Local only;
 * shots are never committed.
 *
 *   node scripts/shots.mjs --group foundations --themes github --modes light,dark --langs en,zh
 *   node scripts/shots.mjs --sections actions-button --variants all --out /tmp/button-shots
 *
 * Options (comma lists):
 *   --base      gallery origin                 (default http://localhost:7372)
 *   --out       output directory               (default packages/ui-gallery/shots)
 *   --group     catalog group ids              (default: every group)
 *   --sections  section ids                    (default: every section of the chosen groups)
 *   --themes    github,modern,geek             (default: all three)
 *   --modes     light,dark                     (default: both)
 *   --langs     en,zh                          (default: both)
 *   --tier      sm | md | lg                   (default md)
 *   --variants  default | all                  (default: each section's default pick only)
 *   --width     viewport width in px           (default 1280)
 *
 * Animations are frozen (`motion=reduced`) so two runs of the same tree compare pixel for pixel.
 * Sections with nothing to preview yet (planned components, screens) are skipped and listed.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { CATALOG } from "../../ui/src/catalog.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`unexpected argument: ${key}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${key} needs a value`);
    args[key.slice(2)] = value;
    i++;
  }
  return args;
}

const list = (value, fallback) =>
  value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;

const args = parseArgs(process.argv.slice(2));
const base = (args.base ?? "http://localhost:7372").replace(/\/$/, "");
const out = path.resolve(args.out ?? path.join(HERE, "..", "shots"));
const groups = list(
  args.group,
  CATALOG.map((g) => g.id),
);
const known = CATALOG.filter((g) => groups.includes(g.id)).flatMap((g) =>
  g.sections.map((s) => s.id),
);
const sections = list(args.sections, known);
const themes = list(args.themes, ["github", "modern", "geek"]);
const modes = list(args.modes, ["light", "dark"]);
const langs = list(args.langs, ["en", "zh"]);
const tier = args.tier ?? "md";
const allVariants = args.variants === "all";
const width = Number(args.width ?? 1280);

const unknown = sections.filter((id) => !CATALOG.some((g) => g.sections.some((s) => s.id === id)));
if (unknown.length > 0) {
  console.error(`unknown section ids: ${unknown.join(", ")}`);
  process.exit(2);
}

try {
  const res = await fetch(`${base}/`);
  if (!res.ok) throw new Error(String(res.status));
} catch (error) {
  console.error(
    `the gallery is not answering at ${base} (${error.message}); start it with \`pnpm dev:gallery\``,
  );
  process.exit(2);
}

function embedUrl({ section, variant, theme, mode, lang }) {
  const q = new URLSearchParams({ theme, mode, tier, lang, demo: section, motion: "reduced" });
  if (variant) q.set("variant", variant);
  return `${base}/embed?${q}`;
}

/** Every variant key for the axes the embed page reports. */
function variantKeys(axes, matrix) {
  let rows = [[]];
  for (const values of Object.values(axes))
    rows = rows.flatMap((row) => values.map((v) => [...row, v]));
  const keys = rows.map((row) => row.join(".")).filter(Boolean);
  return matrix ? ["all", ...keys] : keys;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

let written = 0;
const skipped = new Set();
const t0 = Date.now();
try {
  for (const section of sections) {
    for (const theme of themes) {
      for (const mode of modes) {
        for (const lang of langs) {
          const shoot = async (variant) => {
            await page.goto(embedUrl({ section, variant, theme, mode, lang }));
            await page.waitForSelector("html[data-gallery-ready]", { timeout: 30_000 });
            const root = page.locator("#embed-root");
            const info = await root.evaluate((el) => ({
              renderable: el.dataset.renderable === "true",
              axes: JSON.parse(el.dataset.axes ?? "{}"),
              matrix: el.dataset.matrix === "true",
            }));
            if (!info.renderable) return { skipped: true };
            const dir = path.join(out, theme, mode, lang);
            mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `${section}${variant ? `--${variant}` : ""}.png`);
            await root.screenshot({ path: file, animations: "disabled" });
            written++;
            console.log(file);
            return info;
          };
          const first = await shoot(undefined);
          if (first.skipped) {
            skipped.add(section);
            continue;
          }
          if (allVariants) {
            for (const key of variantKeys(first.axes, first.matrix)) await shoot(key);
          }
        }
      }
    }
  }
} finally {
  await browser.close();
}

if (skipped.size > 0) console.log(`skipped (nothing to preview yet): ${[...skipped].join(", ")}`);
if (errors.length > 0) {
  console.error(`page errors:\n  ${[...new Set(errors)].join("\n  ")}`);
  process.exitCode = 1;
}
console.log(`${written} shots in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${out}`);
