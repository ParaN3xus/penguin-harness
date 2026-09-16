/**
 * Focus & selection: the focus ring drawn permanently on a button and a link shape, the input
 * focus treatment, a selection highlight, and a scroll box wearing the theme's scrollbar.
 */
import { useGallery } from "../state";
import { groupNames, Resolving, SubHeading, TokenTable, useActiveTokens } from "./shared";
import { SPECIMENS } from "./specimens";

export function FocusPage() {
  const { tokens, S, state } = useGallery();
  const values = useActiveTokens();
  if (!tokens) return <Resolving />;
  const specimen = SPECIMENS[state.lang];
  // Highlight a run of whole words (CJK has no spaces, so it falls back to a fixed slice).
  const text = specimen.paragraph;
  const from = text.indexOf(" ", 20) > 0 ? text.indexOf(" ", 20) + 1 : 20;
  const to = text.indexOf(" ", from + 30) > 0 ? text.indexOf(" ", from + 30) : from + 30;
  return (
    <div className="gf-stack">
      <div className="gf-two">
        <section className="gf-block">
          <SubHeading>{S.foundations.focusRing}</SubHeading>
          <div className="gf-focus-row">
            <span className="gf-shape gf-shape-button gf-focused">
              {S.foundations.sampleButton}
            </span>
            <span className="gf-shape gf-shape-secondary gf-focused">
              {S.foundations.sampleButton}
            </span>
            <span className="gf-link gf-focused">{specimen.heading}</span>
          </div>
          <SubHeading>{S.foundations.inputFocus}</SubHeading>
          <span className="gf-shape gf-shape-input gf-input-focused">
            {S.foundations.sampleInput}
          </span>
        </section>
        <section className="gf-block">
          <SubHeading>{S.foundations.selection}</SubHeading>
          <p className="gf-selection-sample">
            {text.slice(0, from)}
            <mark>{text.slice(from, to)}</mark>
            {text.slice(to)}
          </p>
          <SubHeading>{S.foundations.scrollbar}</SubHeading>
          <div className="gf-scroll-sample" tabIndex={0}>
            {Array.from({ length: 12 }, (_, i) => (
              <p key={i}>
                {i + 1}. {specimen.short}
              </p>
            ))}
          </div>
        </section>
      </div>
      <TokenTable names={groupNames("focus")} values={values} />
    </div>
  );
}
