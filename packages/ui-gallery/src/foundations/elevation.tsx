/**
 * Elevation: the five shadow levels on a surface card, and the glass recipe (the one Frost's
 * floating panels wear) over a wash, so blur and saturation have something to act on.
 */
import { useGallery } from "../state";
import {
  groupNames,
  Resolving,
  SubHeading,
  TokenTable,
  TokenValue,
  useActiveTokens,
} from "./shared";
import { SPECIMENS } from "./specimens";

const SHADOWS = ["flat", "raised", "overlay", "modal", "drawer"] as const;

export function ElevationPage({ backdrop }: { backdrop: string }) {
  const { tokens, S } = useGallery();
  const values = useActiveTokens();
  if (!tokens) return <Resolving />;
  const washed = backdrop !== "canvas";
  return (
    <div className="gf-stack">
      <section className="gf-block">
        <SubHeading>{S.foundations.shadows}</SubHeading>
        <div className="gf-elevation" data-wash={washed || undefined}>
          {SHADOWS.map((level) => {
            const name = `--ui-shadow-${level}`;
            return (
              <div key={level} className="gf-elevation-item">
                <div className="gf-elevation-card" style={{ boxShadow: `var(${name})` }}>
                  <span className="gf-mono">{level}</span>
                </div>
                <TokenValue value={values[name]} className="gf-small gf-wrap" />
              </div>
            );
          })}
        </div>
      </section>

      <section className="gf-block">
        <SubHeading>{S.foundations.glass}</SubHeading>
        <div className="gf-glass-stage" data-wash={washed || undefined}>
          <div className="gf-glass-lines" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                {SPECIMENS.en.heading} · {SPECIMENS.zh.heading}
              </span>
            ))}
          </div>
          <div className="gf-glass-panel">
            <span className="gf-mono gf-small">.ui-glass</span>
            <span className="gf-glass-row">{S.foundations.sampleMenuRow}</span>
            <span className="gf-glass-row" data-active>
              {S.foundations.sampleMenuRow}
            </span>
            <span className="gf-glass-row">{S.foundations.sampleMenuRow}</span>
          </div>
        </div>
        <TokenTable names={groupNames("elevation")} values={values} />
      </section>
    </div>
  );
}
