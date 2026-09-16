/**
 * Spacing & density: control rungs built from padding-block + line-height with their measured
 * height (the number that must match across themes), row and menu-row padding, card and panel
 * padding, and the stack gaps.
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useGallery } from "../state";
import { groupNames, Resolving, SubHeading, TokenTable, useActiveTokens } from "./shared";

/** Renders its child and prints the child's rendered height in px, re-measured on resize. */
function Measured({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style: CSSProperties;
  className: string;
}) {
  const { S } = useGallery();
  const ref = useRef<HTMLSpanElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(Math.round(el.getBoundingClientRect().height * 10) / 10);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <span className="gf-measured">
      <span ref={ref} className={className} style={style}>
        {children}
      </span>
      <span className="gf-px">
        {height === null ? "…" : `${height}px`}{" "}
        <span className="gf-muted">{S.foundations.measured}</span>
      </span>
    </span>
  );
}

const RUNGS = [
  { rung: "sm", text: "small" },
  { rung: "md", text: "body" },
  { rung: "lg", text: "body" },
] as const;

export function DensityPage() {
  const { tokens, S } = useGallery();
  const values = useActiveTokens();
  if (!tokens) return <Resolving />;
  return (
    <div className="gf-stack">
      <section className="gf-block">
        <SubHeading>{S.foundations.controls}</SubHeading>
        <div className="gf-rungs">
          {RUNGS.map(({ rung, text }) => (
            <div key={rung} className="gf-rung">
              <span className="gf-mono gf-rung-id">{rung}</span>
              <Measured
                className="gf-control"
                style={{
                  paddingBlock: `var(--ui-control-py-${rung})`,
                  paddingInline: `var(--ui-control-px-${rung})`,
                  gap: `var(--ui-control-gap-${rung === "sm" ? "sm" : "md"})`,
                  fontSize: `var(--ui-text-${text}-size)`,
                  lineHeight: `var(--ui-text-${text}-lh)`,
                }}
              >
                <span className="gf-control-glyph" />
                {S.foundations.sampleButton}
              </Measured>
              <Measured
                className="gf-control gf-control-input"
                style={{
                  paddingBlock: `var(--ui-control-py-${rung})`,
                  paddingInline: `var(--ui-control-px-${rung})`,
                  fontSize: `var(--ui-text-${text}-size)`,
                  lineHeight: `var(--ui-text-${text}-lh)`,
                }}
              >
                {S.foundations.sampleInput}
              </Measured>
            </div>
          ))}
        </div>
      </section>

      <div className="gf-two">
        <section className="gf-block">
          <SubHeading>{S.foundations.rows}</SubHeading>
          <div className="gf-rows-sample">
            {[0, 1, 2].map((i) => (
              <Measured
                key={i}
                className="gf-row-sample"
                style={{ padding: "var(--ui-row-py) var(--ui-row-px)" }}
              >
                {S.foundations.sampleRow} {i + 1}
              </Measured>
            ))}
          </div>
          <div className="gf-rows-sample gf-menu-sample">
            {[0, 1, 2].map((i) => (
              <Measured
                key={i}
                className="gf-row-sample"
                style={{ padding: "var(--ui-menu-row-py) var(--ui-menu-row-px)" }}
              >
                {S.foundations.sampleMenuRow} {i + 1}
              </Measured>
            ))}
          </div>
        </section>
        <section className="gf-block">
          <SubHeading>{S.foundations.padding}</SubHeading>
          {(["card", "panel"] as const).map((kind) => (
            <div key={kind} className="gf-padding-box" style={{ padding: `var(--ui-${kind}-p)` }}>
              <span className="gf-padding-inner gf-mono gf-small">--ui-{kind}-p</span>
            </div>
          ))}
          <SubHeading>{S.foundations.stack}</SubHeading>
          {([1, 2, 3] as const).map((step) => (
            <div key={step} className="gf-stack-sample" style={{ gap: `var(--ui-stack-${step})` }}>
              <span />
              <span />
              <span />
              <span className="gf-mono gf-small">--ui-stack-{step}</span>
            </div>
          ))}
        </section>
      </div>
      <TokenTable names={groupNames("density")} values={values} />
    </div>
  );
}
