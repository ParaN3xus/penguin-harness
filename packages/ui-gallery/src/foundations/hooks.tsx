/**
 * Style hooks: the closed hook list (A-architecture §4), each on the minimal markup its recipes
 * expect, so a theme's hooks can be reviewed before any component carries them. The markup follows
 * the anatomy the theme files document: `.ui-frame` children carry `data-slot`, `.ui-live` carries
 * `data-live`, `.ui-underline-nav` holds `[role=tab]` items, `.ui-grid-dots` modifies `.ui-grid`,
 * cards take `.ui-pill-hover[data-shape=card]`, and `.ui-button` marks a button label.
 *
 * The base look of each sample lives in `@layer components` (foundations.css): a hook's recipe
 * sits in `@layer ui-theme` and must win over it, exactly as it wins over a component's utilities.
 */
import type { ReactNode } from "react";
import { useGallery } from "../state";
import { SubHeading } from "./shared";
import { SPECIMENS } from "./specimens";

function Hook({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="gf-block gf-hook">
      <SubHeading>
        <span className="gf-mono">.{name}</span>
      </SubHeading>
      <div className="gf-hook-body">{children}</div>
    </section>
  );
}

export function HooksPage() {
  const { state, S } = useGallery();
  const specimen = SPECIMENS[state.lang];
  return (
    <div className="gf-hooks">
      <Hook name="ui-glass · .ui-wash">
        <div className="ui-wash gh-wash">
          <div className="gh-wash-text" aria-hidden>
            {SPECIMENS.en.heading} · {SPECIMENS.zh.heading}
          </div>
          <div className="ui-glass gh-panel" role="menu">
            <span className="gh-menu-row">{S.foundations.sampleMenuRow}</span>
            <span className="gh-menu-row" data-active>
              {S.foundations.sampleMenuRow}
            </span>
            <span className="gh-menu-row">{S.foundations.sampleMenuRow}</span>
          </div>
        </div>
      </Hook>

      <Hook name="ui-grid · .ui-grid-dots">
        <div className="gh-grid-pair">
          <div className="ui-grid gh-grid" />
          <div className="ui-grid ui-grid-dots gh-grid gh-grid-dots">
            <span>{specimen.short}</span>
          </div>
        </div>
      </Hook>

      <Hook name="ui-ticks · .ui-pill-hover">
        <div className="gh-row">
          <div className="ui-ticks ui-pill-hover gh-card" data-shape="card">
            <span className="ui-eyebrow gh-eyebrow">{S.foundations.sampleCard}</span>
            <span>{specimen.heading}</span>
          </div>
          <button type="button" className="ui-pill-hover ui-button gh-button gh-button-secondary">
            {S.foundations.sampleButton}
          </button>
        </div>
      </Hook>

      <Hook name="ui-eyebrow · .ui-display">
        <span className="ui-eyebrow gh-eyebrow">Tool calls · Tokens</span>
        <h1 className="ui-display gh-display" lang="en">
          {SPECIMENS.en.heading}
        </h1>
        <h2 className="ui-display gh-display gh-display-2" lang="zh-CN">
          {SPECIMENS.zh.heading}
        </h2>
      </Hook>

      <Hook name="ui-live">
        <div className="gh-row">
          <span>
            {specimen.heading}
            <span className="ui-live gh-caret" data-live="caret">
              ▌
            </span>
          </span>
          <span className="ui-live gh-dot" data-live="dot" />
          <span className="ui-live gh-spinner" data-live="spinner" />
        </div>
      </Hook>

      <Hook name="ui-frame">
        <div className="ui-frame gh-frame">
          <div data-slot="head" className="gh-frame-head">
            <span>ts</span>
            <span>rag.ts</span>
            <button type="button" className="gh-frame-copy">
              copy
            </button>
          </div>
          <pre data-slot="body" className="gh-frame-body">
            {specimen.code}
          </pre>
          <div data-slot="foot" className="gh-frame-foot">
            412 ms · exit 0
          </div>
        </div>
        <div className="ui-frame gh-frame gh-frame-panes">
          <div data-slot="pane">{SPECIMENS.en.short}</div>
          <div data-slot="pane">{SPECIMENS.zh.short}</div>
        </div>
      </Hook>

      <Hook name="ui-underline-nav">
        <div className="ui-underline-nav gh-tabs" role="tablist">
          {["Overview", "Traces", "Files"].map((tab, i) => (
            <span key={tab} role="tab" aria-selected={i === 0} className="gh-tab">
              {tab}
            </span>
          ))}
        </div>
      </Hook>

      <Hook name="ui-button">
        <div className="gh-row">
          <button type="button" className="ui-button gh-button gh-button-primary">
            {S.foundations.sampleButton}
          </button>
          <button type="button" className="ui-button gh-button gh-button-secondary">
            {S.foundations.sampleButton}
          </button>
        </div>
      </Hook>
    </div>
  );
}
