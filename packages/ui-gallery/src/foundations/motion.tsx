/**
 * Motion: every duration × easing pair as a dot crossing a track (the move takes exactly the
 * duration, then holds), and the live-signal timing on a caret and a dot. With `motion=reduced`
 * every animation in the preview holds its first frame (chrome.css), which is also what makes
 * screenshots deterministic.
 */
import type { CSSProperties } from "react";
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

const DURATIONS = ["fast", "base", "slow"] as const;
const EASINGS = ["out", "in-out", "spring", "overlay-in", "overlay-out"] as const;

export function MotionPage() {
  const { tokens, S, state } = useGallery();
  const values = useActiveTokens();
  if (!tokens) return <Resolving />;
  return (
    <div className="gf-stack">
      <section className="gf-block">
        <SubHeading aside={state.motion === "reduced" ? S.foundations.reducedNote : undefined}>
          {S.foundations.durations}
        </SubHeading>
        <div className="gf-motion-grid">
          <span />
          {DURATIONS.map((duration) => (
            <span key={duration} className="gf-motion-head">
              <span className="gf-mono">{duration}</span>
              <TokenValue value={values[`--ui-dur-${duration}`]} className="gf-small" />
            </span>
          ))}
          {EASINGS.map((easing) => (
            <div key={easing} className="gf-motion-row">
              <span className="gf-motion-head">
                <span className="gf-mono">{easing}</span>
                <TokenValue value={values[`--ui-ease-${easing}`]} className="gf-small gf-wrap" />
              </span>
              {DURATIONS.map((duration) => (
                <span key={duration} className="gf-track">
                  <span
                    className="gf-track-dot"
                    style={
                      {
                        "--gf-dur": `var(--ui-dur-${duration})`,
                        "--gf-ease": `var(--ui-ease-${easing})`,
                      } as CSSProperties
                    }
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="gf-block">
        <SubHeading>{S.foundations.liveSignal}</SubHeading>
        <div className="gf-live">
          <span className="gf-live-text">
            {SPECIMENS[state.lang].heading}
            <span className="ui-live gh-caret" data-live="caret">
              ▌
            </span>
          </span>
          <span className="ui-live gh-dot" data-live="dot" />
          <span className="ui-live gh-spinner" data-live="spinner" />
          <TokenValue value={values["--ui-live-timing"]} className="gf-small" />
        </div>
      </section>
      <TokenTable names={groupNames("motion")} values={values} />
    </div>
  );
}
