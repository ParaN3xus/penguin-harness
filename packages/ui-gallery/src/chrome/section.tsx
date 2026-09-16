/**
 * One gallery section: the header row (`NN Title — description` and its link / tokens / code
 * buttons), the card (a themed preview, three compare frames, a planned-component placeholder or a
 * screen link), the variant pills, the quotable breadcrumb, and the tokens / code drawer.
 */
import { THEME_IDS } from "@prismshadow/penguin-ui";
import type { ThemeId } from "@prismshadow/penguin-ui";
import { memo, useEffect, useRef, useState } from "react";
import type { ComponentSection, ScreenSection } from "../../../ui/src/catalog";
import { formatBreadcrumb } from "../lib/breadcrumb";
import { formatVariantKey, MATRIX_KEY, pickLabels } from "../lib/demos";
import type { VariantPick } from "../lib/demos";
import { absoluteUrl, BASE } from "../lib/location";
import { THEME_NAMES } from "../lib/themes";
import { paintColor } from "../lib/token-probe";
import { formatGalleryQuery, withVariant } from "../lib/url-state";
import { pickFor, useCatalogText } from "../preview";
import type { SectionEntry } from "../preview";
import { loadDemoSource, repoPath } from "../registry";
import { SCREENS } from "../screens";
import { useGallery } from "../state";
import { useCopy } from "./copy";
import { ChromeIcon } from "./icons";

function useBreadcrumb(entry: SectionEntry, pick: VariantPick, theme?: ThemeId): string {
  const { state, mode } = useGallery();
  const hasPills = Object.keys(entry.renderable?.axes ?? {}).length > 0;
  return formatBreadcrumb({
    theme: theme ?? state.theme,
    group: entry.group.title,
    section: entry.section.title,
    variant: hasPills ? pickLabels(entry.renderable?.axes, pick) : undefined,
    mode,
    lang: state.lang,
    tier: state.tier,
  });
}

function Pills({
  entry,
  pick,
  onPick,
}: {
  entry: SectionEntry;
  pick: VariantPick;
  onPick: (key: string) => void;
}) {
  const axes = entry.renderable?.axes ?? {};
  const names = Object.keys(axes);
  if (names.length === 0) return null;
  const matrix = pick.kind === "matrix";
  const choose = (axis: string, value: string) => {
    const selection = pick.kind === "single" ? { ...pick.selection } : {};
    selection[axis] = value;
    onPick(formatVariantKey(axes, { kind: "single", selection }));
  };
  return (
    <div className="g-pills g-chrome" role="toolbar" aria-label="Variants">
      {entry.renderable?.matrix && (
        <span className="g-pill-group">
          <button
            type="button"
            className="g-pill"
            aria-pressed={matrix}
            onClick={() => onPick(MATRIX_KEY)}
          >
            {MATRIX_KEY}
          </button>
        </span>
      )}
      {names.map((axis) => (
        <span key={axis} className="g-pill-group" role="group" aria-label={axis}>
          {(axes[axis] ?? []).map((value) => (
            <button
              key={value}
              type="button"
              className="g-pill"
              aria-pressed={!matrix && pick.kind === "single" && pick.selection[axis] === value}
              onClick={() => choose(axis, value)}
            >
              {value}
            </button>
          ))}
        </span>
      ))}
    </div>
  );
}

function Breadcrumb({ text, className = "" }: { text: string; className?: string }) {
  const { S } = useGallery();
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      className={`g-crumb ${className}`}
      title={S.section.copyBreadcrumb}
      onClick={() => copy("crumb", text)}
    >
      <ChromeIcon name={copied ? "check" : "copy"} size={13} />
      <span>{copied ? S.section.copied : text}</span>
    </button>
  );
}

/** One `/embed` frame per theme; each reports its content height so the frame never scrolls. */
function CompareFrames({ entry, pickKey }: { entry: SectionEntry; pickKey: string }) {
  const { S } = useGallery();
  return (
    <div className="g-compare">
      {THEME_IDS.map((theme) => (
        <CompareFrame
          key={theme}
          entry={entry}
          theme={theme}
          pickKey={pickKey}
          title={S.section.compareFrame(THEME_NAMES[theme])}
        />
      ))}
    </div>
  );
}

function CompareFrame({
  entry,
  theme,
  pickKey,
  title,
}: {
  entry: SectionEntry;
  theme: ThemeId;
  pickKey: string;
  title: string;
}) {
  const { state } = useGallery();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const crumb = useBreadcrumb(entry, pickFor(entry, pickKey), theme);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number };
      if (data?.type === "gallery:height" && typeof data.height === "number")
        setHeight(Math.ceil(data.height));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  const src = `${BASE}/embed${formatGalleryQuery(
    { ...state, theme, compare: false, variants: {} },
    { demo: entry.section.id, variant: pickKey, frame: "1" },
  )}`;
  return (
    <figure className="g-compare-item">
      <figcaption className="g-chrome">
        <span className="g-compare-theme">{THEME_NAMES[theme]}</span>
        <Breadcrumb text={crumb} className="g-crumb-compact" />
      </figcaption>
      <iframe ref={frame} title={title} src={src} loading="lazy" style={{ height }} />
    </figure>
  );
}

function TokensDrawer({ entry }: { entry: SectionEntry }) {
  const { S, tokens, state, mode } = useGallery();
  const [copied, copy] = useCopy();
  const names = entry.renderable?.tokens ?? [];
  const values = tokens?.[state.theme][mode] ?? {};
  return (
    <div className="g-drawer-panel">
      <div className="g-drawer-title">
        {S.section.tokensIn(`${THEME_NAMES[state.theme]} · ${S.rail.modes[mode]}`)}
      </div>
      {names.length === 0 ? (
        <p className="g-muted">{S.section.noTokens}</p>
      ) : (
        <div className="g-token-list">
          {names.map((name) => {
            const value = values[name] ?? "";
            const color = paintColor(value);
            return (
              <button
                key={name}
                type="button"
                className="g-token"
                onClick={() => copy(name, `${name}: ${value};`)}
              >
                <span
                  className="g-token-swatch"
                  style={{ background: color ? value : "transparent" }}
                  data-empty={!color || undefined}
                />
                <span className="g-token-name">{name}</span>
                <span className="g-token-value" data-unset={!value || undefined}>
                  {copied === name ? S.section.copied : value || S.section.unset}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CodeDrawer({ entry }: { entry: SectionEntry }) {
  const { S } = useGallery();
  const code = entry.renderable?.code;
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    if (code?.kind !== "demo") return;
    let live = true;
    void loadDemoSource(code.path).then((text) => live && setSource(text));
    return () => {
      live = false;
    };
  }, [code]);
  if (!code) return null;
  return (
    <div className="g-drawer-panel">
      <div className="g-drawer-title">
        {code.kind === "demo" ? repoPath(code.path) : S.section.generatedFrom(code.file)}
      </div>
      {code.kind === "demo" && <pre className="g-code">{source ?? S.section.loadingCode}</pre>}
    </div>
  );
}

function PlannedCard({ section }: { section: ComponentSection }) {
  const { S } = useGallery();
  return (
    <div className="g-planned">
      <div className="g-planned-badges">
        <span className="g-badge">{S.planned.badge}</span>
        <span className="g-badge" title={S.planned.wave}>
          {section.wave}
        </span>
        <span className="g-badge">{S.planned.plans[section.plan]}</span>
      </div>
      <dl className="g-planned-list">
        <dt>{S.planned.exports}</dt>
        <dd>
          {section.components.map((name) => (
            <code key={name} className="g-chip">
              {name}
            </code>
          ))}
        </dd>
        {section.props && (
          <>
            <dt>{S.planned.props}</dt>
            <dd>
              <code>{section.props}</code>
            </dd>
          </>
        )}
        {section.replaces && (
          <>
            <dt>{S.planned.replaces}</dt>
            <dd>{section.replaces}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

/** A screen's thumbnail: the page laid out at a desktop viewport, scaled down to the card. */
const THUMB_VIEWPORT = { width: 1440, height: 810 };

function ScreenThumb({ title, src }: { title: string; src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / THUMB_VIEWPORT.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className="g-screen-thumb">
      <iframe
        title={title}
        src={src}
        loading="lazy"
        tabIndex={-1}
        style={{ ...THUMB_VIEWPORT, transform: `scale(${scale})` }}
      />
    </div>
  );
}

function ScreenCard({ section }: { section: ScreenSection }) {
  const { S, state } = useGallery();
  const exists = SCREENS[section.screen] !== undefined;
  const href = `${BASE}/screens/${section.screen}${formatGalleryQuery({ ...state, compare: false, variants: {} })}`;
  if (!exists) {
    return (
      <div className="g-planned">
        <div className="g-planned-badges">
          <span className="g-badge">{S.planned.badge}</span>
          <code className="g-chip">/screens/{section.screen}</code>
        </div>
        <p className="g-muted">{S.screens.missing(section.screen)}</p>
      </div>
    );
  }
  return (
    <div className="g-screen-card">
      <ScreenThumb title={section.title} src={`${href}&bare=1`} />
      <a className="g-button" href={href}>
        <ChromeIcon name="external" size={14} />
        {S.screens.open}
      </a>
    </div>
  );
}

export const Section = memo(function Section({
  entry,
  pickKey,
}: {
  entry: SectionEntry;
  pickKey: string | undefined;
}) {
  const { S, state, update } = useGallery();
  const text = useCatalogText();
  const [copied, copy] = useCopy();
  const [drawer, setDrawer] = useState<{ tokens: boolean; code: boolean }>({
    tokens: false,
    code: false,
  });
  const { section, renderable } = entry;
  const pick = pickFor(entry, pickKey);
  const key = formatVariantKey(renderable?.axes, pick);
  const crumb = useBreadcrumb(entry, pick);
  const { title, description } = text.section(section);

  const onPick = (next: string) => {
    const fallback = formatVariantKey(renderable?.axes, pickFor(entry, undefined));
    update((s) => withVariant(s, section.id, next === fallback ? null : next));
  };
  const link = () => {
    const variants = pickKey === undefined ? {} : { [section.id]: key };
    return absoluteUrl(`/${formatGalleryQuery({ ...state, variants })}#${section.id}`);
  };

  return (
    <section id={section.id} className="g-section" data-planned={!renderable || undefined}>
      <header className="g-section-head g-chrome">
        <span className="g-section-num">{entry.number}</span>
        <h2 className="g-section-title">{title}</h2>
        <p className="g-section-desc">{description}</p>
        <span className="g-section-actions">
          <button
            type="button"
            className="g-icon-button"
            title={S.section.copyLink}
            onClick={() => copy("link", link())}
          >
            <ChromeIcon name={copied === "link" ? "check" : "link"} />
          </button>
          {renderable && (
            <>
              <button
                type="button"
                className="g-icon-button"
                title={S.section.tokens}
                aria-pressed={drawer.tokens}
                onClick={() => setDrawer((d) => ({ ...d, tokens: !d.tokens }))}
              >
                <ChromeIcon name="tokens" />
              </button>
              <button
                type="button"
                className="g-icon-button"
                title={S.section.code}
                aria-pressed={drawer.code}
                onClick={() => setDrawer((d) => ({ ...d, code: !d.code }))}
              >
                <ChromeIcon name="code" />
              </button>
            </>
          )}
        </span>
      </header>

      {renderable ? (
        <div className="g-card">
          {state.compare ? (
            <CompareFrames entry={entry} pickKey={key} />
          ) : (
            <div className="g-preview" data-section={section.id}>
              <div className="g-preview-body">{renderable.render(pick)}</div>
            </div>
          )}
          <Pills entry={entry} pick={pick} onPick={onPick} />
          {!state.compare && (
            <div className="g-card-foot g-chrome">
              <Breadcrumb text={crumb} />
            </div>
          )}
        </div>
      ) : section.kind === "screen" ? (
        <div className="g-card g-card-plain g-chrome">
          <ScreenCard section={section} />
        </div>
      ) : section.kind === "component" ? (
        <div className="g-card g-card-plain g-chrome">
          <PlannedCard section={section} />
        </div>
      ) : null}

      {(drawer.tokens || drawer.code) && (
        <div className="g-drawer g-chrome">
          {drawer.tokens && <TokensDrawer entry={entry} />}
          {drawer.code && <CodeDrawer entry={entry} />}
        </div>
      )}
    </section>
  );
});
