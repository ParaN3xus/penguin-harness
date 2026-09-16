/** Shape: the radius scale, the same radii on control-shaped boxes, and the border widths. */
import { useGallery } from "../state";
import {
  Copyable,
  groupNames,
  Resolving,
  SubHeading,
  TokenTable,
  TokenValue,
  useActiveTokens,
  useRemToPx,
} from "./shared";

const RADII = ["xs", "sm", "md", "lg", "xl", "pill"] as const;

export function ShapePage() {
  const { tokens, S } = useGallery();
  const values = useActiveTokens();
  const toPx = useRemToPx();
  if (!tokens) return <Resolving />;
  return (
    <div className="gf-stack">
      <section className="gf-block">
        <SubHeading>{S.foundations.radiusScale}</SubHeading>
        <div className="gf-radius-grid">
          {RADII.map((step) => {
            const name = `--ui-radius-${step}`;
            const value = values[name];
            return (
              <div key={step} className="gf-radius-item">
                <div className="gf-radius-box" style={{ borderRadius: `var(${name})` }} />
                <Copyable text={name} className="gf-name" />
                <span>
                  <TokenValue value={value} className="gf-small" />
                  {value && toPx(value) !== value && <span className="gf-px">{toPx(value)}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="gf-block">
        <SubHeading>{S.foundations.onControls}</SubHeading>
        <div className="gf-shapes">
          <span className="gf-shape gf-shape-button" title="--ui-radius-md">
            {S.foundations.sampleButton}
          </span>
          <span className="gf-shape gf-shape-input" title="--ui-radius-md">
            {S.foundations.sampleInput}
          </span>
          <span className="gf-shape gf-shape-badge" title="--ui-radius-pill">
            {S.foundations.sampleBadge}
          </span>
          <span className="gf-shape gf-shape-menu" title="--ui-radius-md">
            <span className="gf-shape-menu-row">{S.foundations.sampleMenuRow}</span>
            <span className="gf-shape-menu-row" data-active>
              {S.foundations.sampleMenuRow}
            </span>
          </span>
          <span className="gf-shape gf-shape-card" title="--ui-radius-lg">
            {S.foundations.sampleCard}
          </span>
        </div>
      </section>

      <section className="gf-block">
        <SubHeading>{S.foundations.borderWidths}</SubHeading>
        <div className="gf-borders">
          {["--ui-border-w", "--ui-border-w-thick"].map((name) => (
            <div key={name} className="gf-border-row">
              <span className="gf-border-line" style={{ borderTopWidth: `var(${name})` }} />
              <Copyable text={name} className="gf-name" />
              <TokenValue value={values[name]} className="gf-small" />
            </div>
          ))}
        </div>
        <TokenTable names={groupNames("shape")} values={values} />
      </section>
    </div>
  );
}
