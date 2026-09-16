/**
 * Typography: the four families with an en and a zh specimen, the role scale (page headings,
 * chat-markdown headings, body roles) each set in its own tokens with its metrics beside it, then
 * the weights and the tracking values.
 */
import type { CSSProperties } from "react";
import { useGallery } from "../state";
import { Copyable, Resolving, SubHeading, TokenValue, useActiveTokens, useRemToPx } from "./shared";
import { SPECIMENS } from "./specimens";

type Sample = "both" | "en" | "zh";

function langsOf(sample: string): ("en" | "zh")[] {
  return sample === "en" ? ["en"] : sample === "zh" ? ["zh"] : ["en", "zh"];
}

const FAMILIES = [
  "--ui-font-sans",
  "--ui-font-mono",
  "--ui-font-display",
  "--ui-font-cjk",
] as const;

interface Role {
  id: string;
  style: CSSProperties;
  /** The tokens printed beside the specimen. */
  metrics: string[];
  text: "heading" | "paragraph" | "short" | "code";
}

const heading = (n: number): Role => ({
  id: `h${n}`,
  style: {
    fontSize: `var(--ui-h${n}-size)`,
    lineHeight: `var(--ui-h${n}-lh)`,
    fontWeight: `var(--ui-h${n}-weight)`,
    letterSpacing: `var(--ui-h${n}-tracking)`,
    textTransform: `var(--ui-h${n}-transform)` as CSSProperties["textTransform"],
    fontFamily: `var(--ui-h${n}-font)`,
  },
  metrics: ["size", "lh", "weight", "tracking", "transform", "font"].map(
    (part) => `--ui-h${n}-${part}`,
  ),
  text: "heading",
});

const ROLES: Role[] = [
  ...[1, 2, 3, 4, 5, 6].map(heading),
  ...[1, 2, 3].map((n): Role => ({
    id: `md-h${n}`,
    style: {
      fontSize: `var(--ui-md-h${n}-size)`,
      fontWeight: "var(--ui-weight-strong)",
      lineHeight: 1.35,
    },
    metrics: [`--ui-md-h${n}-size`],
    text: "heading",
  })),
  {
    id: "prose",
    style: {
      fontSize: "var(--ui-text-prose-size)",
      lineHeight: "var(--ui-text-prose-lh)",
      fontWeight: "var(--ui-weight-body)",
    },
    metrics: ["--ui-text-prose-size", "--ui-text-prose-lh"],
    text: "paragraph",
  },
  {
    id: "body",
    style: {
      fontSize: "var(--ui-text-body-size)",
      lineHeight: "var(--ui-text-body-lh)",
      fontWeight: "var(--ui-weight-body)",
      letterSpacing: "var(--ui-tracking-body)",
    },
    metrics: ["--ui-text-body-size", "--ui-text-body-lh"],
    text: "paragraph",
  },
  {
    id: "small",
    style: { fontSize: "var(--ui-text-small-size)", lineHeight: "var(--ui-text-small-lh)" },
    metrics: ["--ui-text-small-size", "--ui-text-small-lh"],
    text: "short",
  },
  {
    id: "caption",
    style: {
      fontSize: "var(--ui-text-caption-size)",
      lineHeight: "var(--ui-text-caption-lh)",
      color: "var(--ui-fg-muted)",
    },
    metrics: ["--ui-text-caption-size", "--ui-text-caption-lh"],
    text: "short",
  },
  {
    id: "code",
    style: {
      fontFamily: "var(--ui-font-mono)",
      fontSize: "var(--ui-text-code-size)",
      lineHeight: "var(--ui-text-code-lh)",
      letterSpacing: "var(--ui-tracking-mono)",
    },
    metrics: ["--ui-text-code-size", "--ui-text-code-lh", "--ui-tracking-mono"],
    text: "code",
  },
];

function Metric({ name }: { name: string }) {
  const values = useActiveTokens();
  const toPx = useRemToPx();
  const value = values[name];
  const px = value ? toPx(value) : "";
  return (
    <span className="gf-metric">
      <Copyable
        text={name.replace(/^--ui-(h\d-|md-|text-)?/, "")}
        title={name}
        className="gf-metric-name"
      />
      <TokenValue value={value} className="gf-small" />
      {value && px !== value && <span className="gf-px">{px}</span>}
    </span>
  );
}

export function TypographyPage({ sample }: { sample: Sample | string }) {
  const { tokens, S } = useGallery();
  const values = useActiveTokens();
  if (!tokens) return <Resolving />;
  const langs = langsOf(sample);
  return (
    <div className="gf-stack">
      <section className="gf-block">
        <SubHeading>{S.foundations.families}</SubHeading>
        <div className="gf-families">
          {FAMILIES.map((name) => (
            <div key={name} className="gf-family">
              <div className="gf-family-meta">
                <Copyable text={name} className="gf-name" />
                <TokenValue value={values[name]} className="gf-small gf-wrap" />
              </div>
              {langs.map((lang) => (
                <div
                  key={lang}
                  lang={lang === "zh" ? "zh-CN" : "en"}
                  style={{ fontFamily: `var(${name})` }}
                >
                  <p className="gf-family-heading">{SPECIMENS[lang].heading}</p>
                  <p className="gf-family-para">
                    {name === "--ui-font-mono" ? SPECIMENS[lang].code : SPECIMENS[lang].paragraph}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="gf-block">
        <SubHeading>{S.foundations.roleScale}</SubHeading>
        <div className="gf-roles">
          {ROLES.map((role) => (
            <div key={role.id} className="gf-role">
              <div className="gf-role-meta">
                <span className="gf-role-id">{role.id}</span>
                {role.metrics.map((name) => (
                  <Metric key={name} name={name} />
                ))}
              </div>
              <div className="gf-role-specimens">
                {langs.map((lang) => (
                  <p
                    key={lang}
                    lang={lang === "zh" ? "zh-CN" : "en"}
                    style={role.style}
                    className="gf-role-text"
                  >
                    {SPECIMENS[lang][role.text]}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="gf-two">
        <section className="gf-block">
          <SubHeading>{S.foundations.weights}</SubHeading>
          {(["body", "medium", "strong"] as const).map((weight) => (
            <div key={weight} className="gf-inline-sample">
              <span style={{ fontWeight: `var(--ui-weight-${weight})` }}>
                {langs.map((lang) => SPECIMENS[lang].short).join(" / ")}
              </span>
              <Metric name={`--ui-weight-${weight}`} />
            </div>
          ))}
        </section>
        <section className="gf-block">
          <SubHeading>{S.foundations.tracking}</SubHeading>
          {(["body", "mono", "label"] as const).map((tracking) => (
            <div key={tracking} className="gf-inline-sample">
              <span
                style={{
                  letterSpacing: `var(--ui-tracking-${tracking})`,
                  fontFamily: tracking === "mono" ? "var(--ui-font-mono)" : undefined,
                  textTransform: tracking === "label" ? "uppercase" : undefined,
                  fontSize: tracking === "label" ? "var(--ui-text-caption-size)" : undefined,
                }}
              >
                {tracking === "label" ? "Tool calls · Tokens" : SPECIMENS.en.short}
              </span>
              <Metric name={`--ui-tracking-${tracking}`} />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
