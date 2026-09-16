/**
 * Colour: every colour token as a swatch with its value and, for inks, WCAG contrast against the
 * surfaces it sits on — for the active theme × mode, or as a matrix across all six.
 */
import { ACCENT_PRESETS, THEME_IDS, THEME_MODES, TONES } from "@prismshadow/penguin-ui";
import type { TokenGroupId } from "@prismshadow/penguin-ui";
import themeCss from "../../../ui/src/theme.css?raw";
import { composite, contrastRatio, toHex, wcagGrade } from "../lib/color";
import { THEME_NAMES } from "../lib/themes";
import { paintColor } from "../lib/token-probe";
import type { TokenValues } from "../lib/token-probe";
import { useGallery } from "../state";
import {
  Copyable,
  groupNames,
  Resolving,
  SubHeading,
  TokenValue,
  useActiveTokens,
  useGroupTitle,
} from "./shared";

const COLOR_GROUPS = [
  "color-surfaces",
  "color-text",
  "color-lines",
  "color-accent",
  "color-tones",
  "color-charts",
  "color-code",
] as const satisfies readonly TokenGroupId[];

/** The surfaces an ink is judged against (A-architecture §3.0), by token name. */
export function contrastTargets(name: string): string[] {
  const tone = /^--ui-tone-([a-z]+)-(fg|emphasis-fg)$/.exec(name);
  if (tone) {
    return tone[2] === "fg"
      ? ["--ui-canvas", "--ui-surface", `--ui-tone-${tone[1]}-bg`]
      : [`--ui-tone-${tone[1]}-emphasis`];
  }
  if (name === "--ui-accent-fg" || name === "--ui-fg-on-emphasis") return ["--ui-accent"];
  if (name.startsWith("--ui-fg")) return ["--ui-canvas", "--ui-surface", "--ui-inset"];
  if (/^--ui-chart-(\d|cache-|output)/.test(name)) return ["--ui-canvas", "--ui-surface"];
  return [];
}

function Contrast({ name, values }: { name: string; values: TokenValues }) {
  const targets = contrastTargets(name);
  const canvas = values["--ui-canvas"] || "#ffffff";
  if (targets.length === 0) return null;
  const graphic = name.startsWith("--ui-chart");
  return (
    <span className="gf-contrast">
      {targets.map((target) => {
        const bgValue = values[target];
        const bg = bgValue ? paintColor(bgValue, canvas) : null;
        const fg = bg && values[name] ? paintColor(values[name] ?? "", toHex(bg)) : null;
        if (!bg || !fg) return null;
        const ratio = contrastRatio(composite(fg, bg), bg);
        const grade = wcagGrade(ratio);
        const pass = graphic ? ratio >= 3 : grade !== "fail" && grade !== "AA large";
        return (
          <span
            key={target}
            className="gf-ratio"
            data-pass={pass}
            title={`${name} on ${target}: ${ratio.toFixed(2)}:1 (${grade})`}
          >
            <span className="gf-ratio-on">{target.replace("--ui-", "")}</span>
            {ratio.toFixed(1)}
          </span>
        );
      })}
    </span>
  );
}

/** The sRGB hex a non-hex colour resolves to (`oklch(…)` → `#f9fafb`), for eyes used to hex. */
function hexOf(value: string): string | null {
  const rgba = paintColor(value);
  return rgba ? toHex(rgba) : null;
}

function Hex({ value }: { value: string | undefined }) {
  if (!value || value.startsWith("#")) return null;
  const rgba = paintColor(value);
  return rgba ? <span className="gf-px">{toHex(rgba)}</span> : null;
}

function Swatch({ value, size = "md" }: { value: string | undefined; size?: "sm" | "md" }) {
  return (
    <span className={`gf-swatch gf-swatch-${size}`} data-unset={!value || undefined}>
      <span style={{ background: value || "transparent" }} />
    </span>
  );
}

function SwatchRows({ names, values }: { names: readonly string[]; values: TokenValues }) {
  return (
    <div className="gf-swatch-grid">
      {names.map((name) => (
        <div key={name} className="gf-swatch-row">
          <Swatch value={values[name]} />
          <div className="gf-swatch-meta">
            <Copyable text={name} className="gf-name" />
            <span className="gf-value-line">
              <TokenValue value={values[name]} />
              <Hex value={values[name]} />
            </span>
            <Contrast name={name} values={values} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ToneTable({ values }: { values: TokenValues }) {
  const parts = ["fg", "bg", "line", "emphasis", "emphasis-fg"] as const;
  return (
    <div className="gf-tones">
      <div className="gf-tone-row gf-tone-head">
        <span />
        {parts.map((part) => (
          <span key={part} className="gf-mono gf-muted">
            {part}
          </span>
        ))}
        <span />
      </div>
      {TONES.map((tone) => {
        const v = (part: string) => values[`--ui-tone-${tone}-${part}`];
        return (
          <div key={tone} className="gf-tone-row">
            <span className="gf-mono">{tone}</span>
            {parts.map((part) => (
              <span key={part} className="gf-tone-cell" title={v(part)}>
                <Swatch value={v(part)} size="sm" />
                {v(part) ? (
                  <Copyable text={hexOf(v(part) ?? "") ?? v(part) ?? ""} className="gf-value" />
                ) : (
                  <TokenValue value={undefined} />
                )}
              </span>
            ))}
            <span className="gf-tone-sample">
              <span
                className="gf-pill"
                style={{ color: v("fg"), background: v("bg"), borderColor: v("line") }}
              >
                {tone}
              </span>
              <span
                className="gf-pill"
                style={{ color: v("emphasis-fg"), background: v("emphasis") }}
              >
                {tone}
              </span>
              <Contrast name={`--ui-tone-${tone}-fg`} values={values} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** `:root[data-accent="blue"] { --ui-accent: #2563eb; … }` blocks from theme.css. */
function accentPresets(): { preset: string; accent?: string; fg?: string; muted?: string }[] {
  return ACCENT_PRESETS.map((preset) => {
    const block =
      new RegExp(String.raw`\[data-accent="${preset}"\]\s*\{([^}]*)\}`).exec(themeCss)?.[1] ?? "";
    const read = (name: string) =>
      new RegExp(String.raw`${name}:\s*([^;]+);`).exec(block)?.[1]?.trim();
    return {
      preset,
      accent: read("--ui-accent"),
      fg: read("--ui-accent-fg"),
      muted: read("--ui-accent-muted"),
    };
  });
}

function AccentPreview({ values }: { values: TokenValues }) {
  const { S } = useGallery();
  return (
    <div className="gf-accent-row">
      <span
        className="gf-button-shape"
        style={{ background: values["--ui-accent"], color: values["--ui-accent-fg"] }}
      >
        --ui-accent
      </span>
      <span
        className="gf-button-shape"
        style={{
          background: values["--ui-accent-muted"],
          color: values["--ui-fg"],
          borderColor: values["--ui-accent-line"],
        }}
      >
        --ui-accent-muted
      </span>
      <span className="gf-divider-v" />
      <span className="gf-muted gf-small" title={S.foundations.presetsHint}>
        {S.foundations.presets}
      </span>
      {accentPresets().map(({ preset, accent, fg }) => (
        <span key={preset} className="gf-preset" title={`${preset}: ${accent ?? "?"}`}>
          <span className="gf-preset-dot" style={{ background: accent, color: fg }} />
          <span className="gf-mono gf-small">{preset}</span>
        </span>
      ))}
    </div>
  );
}

function CodePreview({ values }: { values: TokenValues }) {
  const gutter = { color: values["--ui-code-gutter"] };
  const lines: {
    n: string;
    bg?: string;
    before: string;
    mark?: string;
    markBg?: string;
    after?: string;
  }[] = [
    { n: "", bg: values["--ui-diff-hunk-bg"], before: "@@ -12,3 +12,3 @@" },
    {
      n: "12",
      bg: values["--ui-diff-del-bg"],
      before: "const hits = search(query).",
      mark: "slice(0, 3)",
      markBg: values["--ui-diff-del-word"],
      after: ";",
    },
    {
      n: "12",
      bg: values["--ui-diff-add-bg"],
      before: "const hits = search(query).",
      mark: "slice(0, 5)",
      markBg: values["--ui-diff-add-word"],
      after: ";",
    },
    {
      n: "13",
      before: "return ",
      mark: "cite(hits)",
      markBg: values["--ui-code-selection"],
      after: ";",
    },
  ];
  return (
    <div
      className="gf-code"
      style={{ background: values["--ui-code-bg"], borderColor: values["--ui-code-line"] }}
    >
      {lines.map((line, i) => (
        <div key={i} className="gf-code-line" style={{ background: line.bg }}>
          <span className="gf-gutter" style={gutter}>
            {line.n}
          </span>
          <span>
            {line.before}
            {line.mark && <span style={{ background: line.markBg }}>{line.mark}</span>}
            {line.after}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActiveView() {
  const values = useActiveTokens();
  const title = useGroupTitle();
  return (
    <div className="gf-stack">
      {COLOR_GROUPS.map((group) => (
        <section key={group} className="gf-block">
          <SubHeading>{title(group)}</SubHeading>
          {group === "color-accent" && <AccentPreview values={values} />}
          {group === "color-tones" ? (
            <ToneTable values={values} />
          ) : (
            <SwatchRows names={groupNames(group)} values={values} />
          )}
          {group === "color-code" && <CodePreview values={values} />}
        </section>
      ))}
    </div>
  );
}

function MatrixView() {
  const { tokens, S } = useGallery();
  const title = useGroupTitle();
  if (!tokens) return <Resolving />;
  const columns = THEME_IDS.flatMap((themeId) => THEME_MODES.map((mode) => ({ themeId, mode })));
  return (
    <div className="gf-matrix-wrap">
      <table className="gf-matrix">
        <thead>
          <tr>
            <th />
            {columns.map(({ themeId, mode }) => (
              <th key={`${themeId}-${mode}`}>
                {THEME_NAMES[themeId]} <span className="gf-muted">{S.rail.modes[mode]}</span>
              </th>
            ))}
          </tr>
        </thead>
        {COLOR_GROUPS.map((group) => (
          <tbody key={group}>
            <tr>
              <th colSpan={columns.length + 1} className="gf-matrix-group">
                {title(group)}
              </th>
            </tr>
            {groupNames(group).map((name) => (
              <tr key={name}>
                <th scope="row">
                  <Copyable text={name} className="gf-name" />
                </th>
                {columns.map(({ themeId, mode }) => {
                  const values = tokens[themeId][mode];
                  const value = values[name];
                  return (
                    <td key={`${themeId}-${mode}`} style={{ background: values["--ui-canvas"] }}>
                      <span
                        className="gf-matrix-cell"
                        style={{ color: values["--ui-fg"] }}
                        title={value}
                      >
                        <Swatch value={value} size="sm" />
                        {value ? (
                          <span className="gf-matrix-value">
                            {(value.startsWith("#") ? null : hexOf(value)) ?? value}
                          </span>
                        ) : (
                          <TokenValue value={value} />
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export function ColorPage({ view }: { view: string }) {
  const { tokens } = useGallery();
  if (!tokens) return <Resolving />;
  return view === "matrix" ? <MatrixView /> : <ActiveView />;
}
