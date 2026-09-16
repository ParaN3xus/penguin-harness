/**
 * `/embed?demo=<section-id>&variant=<key>&theme=&mode=&tier=&lang=` — one section's preview alone,
 * on a real themed root: the unit the compare frames and `scripts/shots.mjs` render.
 *
 * It posts its height to a parent frame (`{ type: "gallery:height" }`) and marks
 * `<html data-gallery-ready>` once tokens are resolved and fonts have loaded, which is what the
 * screenshot script waits for.
 */
import { useEffect, useRef } from "react";
import { findEntry, pickFor } from "../preview";
import { useGallery } from "../state";

export function EmbedPage() {
  const { tokens, S } = useGallery();
  const params = new URLSearchParams(window.location.search);
  const entry = findEntry(params.get("demo") ?? "");
  const pick = entry ? pickFor(entry, params.get("variant") ?? undefined) : null;
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.parent === window) return;
    const post = () =>
      window.parent.postMessage(
        { type: "gallery:height", height: el.scrollHeight },
        window.location.origin,
      );
    post();
    const observer = new ResizeObserver(post);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!tokens) return;
    let live = true;
    void document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        if (live) document.documentElement.dataset.galleryReady = "1";
      }),
    );
    return () => {
      live = false;
    };
  }, [tokens]);

  return (
    <div
      ref={root}
      id="embed-root"
      className="g-preview g-embed"
      data-section={entry?.section.id}
      data-renderable={Boolean(entry?.renderable)}
      data-axes={JSON.stringify(entry?.renderable?.axes ?? {})}
      data-matrix={Boolean(entry?.renderable?.matrix)}
    >
      {entry && pick && entry.renderable ? (
        entry.renderable.render(pick)
      ) : (
        <p className="g-chrome g-muted">
          {entry
            ? `${entry.section.title}: ${S.planned.badge}`
            : `Unknown demo: ${params.get("demo") ?? ""}`}
        </p>
      )}
    </div>
  );
}
