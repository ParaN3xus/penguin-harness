/**
 * `/` — the gallery: the rail beside one long page of numbered sections in catalog order, opened
 * by an intro with the demo count and each theme × mode's token coverage.
 */
import { THEME_IDS, THEME_MODES, TOKEN_NAMES } from "@prismshadow/penguin-ui";
import { useEffect, useRef } from "react";
import { Rail } from "../chrome/rail";
import { Section } from "../chrome/section";
import { useScrollSpy } from "../lib/use-scroll-spy";
import { THEME_NAMES } from "../lib/themes";
import { SECTION_ENTRIES, useCatalogText } from "../preview";
import type { SectionEntry } from "../preview";
import { DEMOS } from "../registry";
import { useGallery } from "../state";

const IDS = SECTION_ENTRIES.map((entry) => entry.section.id);

function Coverage() {
  const { S, tokens, state, mode } = useGallery();
  if (!tokens) return <p className="g-muted">{S.intro.resolving}</p>;
  const cells = THEME_IDS.flatMap((themeId) =>
    THEME_MODES.map((m) => {
      const values = tokens[themeId][m];
      const missing = TOKEN_NAMES.filter((name) => !values[name]);
      return { themeId, mode: m, missing };
    }),
  );
  const incomplete = cells.filter((cell) => cell.missing.length > 0);
  return (
    <div className="g-coverage">
      <div className="g-coverage-head">
        <strong>{S.intro.coverage}</strong>
        <span className="g-muted">{S.intro.coverageHint}</span>
      </div>
      <div className="g-coverage-chips">
        {cells.map(({ themeId, mode: m, missing }) => (
          <span
            key={`${themeId}-${m}`}
            className="g-coverage-chip"
            data-complete={missing.length === 0 || undefined}
            data-current={(themeId === state.theme && m === mode) || undefined}
          >
            {THEME_NAMES[themeId]} · {S.rail.modes[m]}
            <b>
              {TOKEN_NAMES.length - missing.length}/{TOKEN_NAMES.length}
            </b>
          </span>
        ))}
      </div>
      {incomplete.length > 0 && (
        <details className="g-missing">
          <summary>{S.intro.missingList}</summary>
          {incomplete.map(({ themeId, mode: m, missing }) => (
            <p key={`${themeId}-${m}`}>
              <b>
                {THEME_NAMES[themeId]} · {S.rail.modes[m]} ({missing.length})
              </b>{" "}
              <code>{missing.join(" ")}</code>
            </p>
          ))}
        </details>
      )}
    </div>
  );
}

function groupRuns(): SectionEntry[][] {
  const runs: SectionEntry[][] = [];
  for (const entry of SECTION_ENTRIES) {
    const last = runs[runs.length - 1];
    if (last && last[0]?.group.id === entry.group.id) last.push(entry);
    else runs.push([entry]);
  }
  return runs;
}

const RUNS = groupRuns();

export function GalleryPage() {
  const { S, state, tokens } = useGallery();
  const text = useCatalogText();
  const active = useScrollSpy(IDS);
  const scrolled = useRef(false);

  // The hash target moves while previews fill in (token-driven layout, compare frames reporting
  // their heights), so jump once the tokens have resolved and keep the target pinned while the
  // page above it keeps resizing — until the reader scrolls or a few seconds pass.
  useEffect(() => {
    if (scrolled.current || !tokens) return;
    scrolled.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    const pin = () => target.scrollIntoView();
    requestAnimationFrame(pin);
    const main = document.querySelector(".g-main");
    const observer = new ResizeObserver(pin);
    if (main) observer.observe(main);
    const release = () => {
      observer.disconnect();
      window.removeEventListener("wheel", release);
      window.removeEventListener("keydown", release);
      window.removeEventListener("pointerdown", release);
    };
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("keydown", release);
    window.addEventListener("pointerdown", release);
    const timer = window.setTimeout(release, 4000);
    return () => {
      window.clearTimeout(timer);
      release();
    };
  }, [tokens]);

  const demos = DEMOS.byId.size + DEMOS.uncatalogued.length;
  const renderable = SECTION_ENTRIES.filter((entry) => entry.renderable).length;
  return (
    <div className="g-app">
      <div className="g-frame" data-wide={state.compare || undefined}>
        <Rail activeId={active} />
        <main className="g-main">
          <header className="g-intro g-chrome">
            <h1>{S.intro.title}</h1>
            <p>{S.intro.body}</p>
            <p className="g-muted">
              {S.intro.summary(SECTION_ENTRIES.length, demos, SECTION_ENTRIES.length - renderable)}
            </p>
            <Coverage />
            {DEMOS.problems.length > 0 && (
              <div className="g-problems">
                <strong>{S.intro.problems}</strong>
                <ul>
                  {DEMOS.problems.map((problem) => (
                    <li key={problem}>
                      <code>{problem}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </header>
          {RUNS.map((entries, g) => {
            const group = entries[0]?.group;
            if (!group) return null;
            const { title, description } =
              group.id === "uncatalogued"
                ? { title: S.uncatalogued.title, description: S.uncatalogued.description }
                : text.group(group);
            return (
              <div key={group.id} id={`group-${group.id}`} className="g-group">
                <header className="g-group-head g-chrome">
                  <span className="g-num">{String(g + 1).padStart(2, "0")}</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </header>
                {entries.map((entry) => (
                  <Section
                    key={entry.section.id}
                    entry={entry}
                    pickKey={state.variants[entry.section.id]}
                  />
                ))}
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
