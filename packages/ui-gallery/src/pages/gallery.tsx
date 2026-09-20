/**
 * `/` — the gallery: the rail beside one long page of the modules in `MODULE_IDS` order, opened
 * by the hero, each section a title and one sentence over its card. The page's own words are in
 * the rail; the main column is the modules.
 */
import { useEffect, useRef } from "react";
import { ModuleSection } from "../chrome/section";
import { Rail } from "../chrome/rail";
import { useScrollSpy } from "../lib/use-scroll-spy";
import { DEMOS, MODULES } from "../registry";
import { useGallery } from "../state";

const IDS = MODULES.list.map(({ module }) => module.id);
const PROBLEMS = [...MODULES.problems, ...DEMOS.problems];

export function GalleryPage() {
  const { S, state, tokens } = useGallery();
  const active = useScrollSpy(IDS);
  const scrolled = useRef(false);

  // The hash target moves while previews fill in (token-driven layout, framed embeds reporting
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

  return (
    <div className="g-app">
      <div className="g-frame" data-wide={state.compare !== false || undefined}>
        <Rail activeId={active} />
        <main className="g-main">
          {PROBLEMS.length > 0 && (
            <div className="g-problems g-chrome">
              <strong>{S.intro.problems}</strong>
              <ul>
                {PROBLEMS.map((problem) => (
                  <li key={problem}>
                    <code>{problem}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {MODULES.list.map((entry) => (
            <ModuleSection
              key={entry.module.id}
              entry={entry}
              pickKey={state.variants[entry.module.id]}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
