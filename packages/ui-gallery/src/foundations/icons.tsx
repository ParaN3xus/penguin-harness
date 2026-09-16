/**
 * Icons: the icon-size rungs from the Web App's `ICON_SIZE`, the theme's stroke / cap / join, and
 * every line icon the app declares (read from its source, see icon-registry.ts) drawn at the theme's
 * stroke. A path declared under several names shows once, with a count.
 */
import type { CSSProperties } from "react";
import { WEB_ICON_SIZES, WEB_ICONS } from "../registry";
import { useGallery } from "../state";
import { Copyable, groupNames, Resolving, SubHeading, TokenTable, useActiveTokens } from "./shared";

function Glyph({ d, size }: { d: string; size: number }) {
  const style: CSSProperties = {
    strokeWidth: "var(--ui-icon-stroke)",
    strokeLinecap: "var(--ui-icon-cap)" as CSSProperties["strokeLinecap"],
    strokeLinejoin: "var(--ui-icon-join)" as CSSProperties["strokeLinejoin"],
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      style={style}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const shortName = (name: string) => name.replace(/_ICONS?$/, "").replace(/^[A-Z_]+ICONS\./, "");

export function IconsPage({ size }: { size: string }) {
  const { tokens, S } = useGallery();
  const values = useActiveTokens();
  if (!tokens) return <Resolving />;
  const px = Number(size) || 16;
  const sources = [...new Set(WEB_ICONS.map((icon) => icon.sources[0] ?? ""))];
  const sample =
    WEB_ICONS.find((icon) => icon.names.includes("GEAR_ICON"))?.d ?? WEB_ICONS[0]?.d ?? "";
  return (
    <div className="gf-stack">
      <div className="gf-two">
        <section className="gf-block">
          <SubHeading aside={S.foundations.iconRegistry(WEB_ICONS.length, sources.length)}>
            {S.foundations.iconSizes}
          </SubHeading>
          <div className="gf-icon-sizes">
            {WEB_ICON_SIZES.map(({ name, px: rung }) => (
              <span key={name} className="gf-icon-size" title={`ICON_SIZE.${name}`}>
                <span className="gf-icon-size-box">
                  <Glyph d={sample} size={rung} />
                </span>
                <span className="gf-mono gf-small">{rung}</span>
                <span className="gf-muted gf-tiny">{name}</span>
              </span>
            ))}
          </div>
        </section>
        <section className="gf-block">
          <SubHeading>{S.foundations.iconStroke}</SubHeading>
          <TokenTable names={groupNames("icons")} values={values} />
        </section>
      </div>

      {sources.map((source) => {
        const icons = WEB_ICONS.filter((icon) => icon.sources[0] === source);
        return (
          <section key={source} className="gf-block">
            <SubHeading aside={icons.length}>
              <span className="gf-mono">{source}</span>
            </SubHeading>
            <div className="gf-icon-grid">
              {icons.map((icon) => (
                <div
                  key={icon.d}
                  className="gf-icon-tile"
                  title={`${icon.names.join("\n")}\n— ${icon.sources.join(", ")}`}
                >
                  <Glyph d={icon.d} size={px} />
                  <Copyable
                    text={icon.names[0] ?? ""}
                    className="gf-icon-name"
                    title={icon.names.join(", ")}
                  />
                  {icon.names.length > 1 && (
                    <span className="gf-icon-dupes" title={S.foundations.duplicateNames}>
                      ×{icon.names.length} {icon.names.slice(1).map(shortName).join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
