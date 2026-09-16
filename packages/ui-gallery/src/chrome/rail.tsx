/**
 * The sticky left rail (unthemed): brand and mode switch, the view controls (theme, size,
 * language, compare, reduced motion), the scroll-spied section list grouped as the catalog, and
 * the feedback note. Every control writes the URL.
 */
import { THEME_IDS } from "@prismshadow/penguin-ui";
import { useEffect, useRef } from "react";
import { BASE } from "../lib/location";
import { THEME_NAMES, TIER_PX } from "../lib/themes";
import { formatGalleryQuery, LANGS, MODE_PREFS, TIERS } from "../lib/url-state";
import type { ModePref } from "../lib/url-state";
import { SECTION_ENTRIES, useCatalogText } from "../preview";
import type { SectionEntry } from "../preview";
import { useGallery } from "../state";
import { Segmented, SwitchRow } from "./controls";
import { ChromeIcon } from "./icons";

const MODE_ICONS = { light: "sun", dark: "moon", system: "monitor" } as const;

/** Section entries grouped in render order. */
function groups(): { id: string; entries: SectionEntry[] }[] {
  const out: { id: string; entries: SectionEntry[] }[] = [];
  for (const entry of SECTION_ENTRIES) {
    const last = out[out.length - 1];
    if (last && last.id === entry.group.id) last.entries.push(entry);
    else out.push({ id: entry.group.id, entries: [entry] });
  }
  return out;
}

const GROUPS = groups();

export function ModeSwitch() {
  const { S, state, update } = useGallery();
  return (
    <div className="g-mode" role="group" aria-label={S.rail.mode}>
      {MODE_PREFS.map((mode: ModePref) => (
        <button
          key={mode}
          type="button"
          title={S.rail.modes[mode]}
          aria-label={S.rail.modes[mode]}
          aria-pressed={state.mode === mode}
          onClick={() => update({ mode })}
        >
          <ChromeIcon name={MODE_ICONS[mode]} size={15} />
        </button>
      ))}
    </div>
  );
}

export function ViewControls({ compact = false }: { compact?: boolean }) {
  const { S, state, update } = useGallery();
  return (
    <div className="g-controls" data-compact={compact || undefined}>
      <div className="g-control">
        <span className="g-control-label">{S.rail.theme}</span>
        <Segmented
          label={S.rail.theme}
          value={state.theme}
          options={THEME_IDS.map((id) => ({ value: id, label: THEME_NAMES[id] }))}
          onChange={(theme) => update({ theme })}
        />
      </div>
      <div className="g-control">
        <span className="g-control-label">{S.rail.size}</span>
        <Segmented
          label={S.rail.size}
          value={state.tier}
          options={TIERS.map((tier) => ({
            value: tier,
            label: String(TIER_PX[tier]),
            title: S.rail.sizeTitle(TIER_PX[tier]),
          }))}
          onChange={(tier) => update({ tier })}
        />
      </div>
      <div className="g-control">
        <span className="g-control-label">{S.rail.language}</span>
        <Segmented
          label={S.rail.language}
          value={state.lang}
          options={LANGS.map((lang) => ({ value: lang, label: S.rail.langNames[lang] }))}
          onChange={(lang) => update({ lang })}
        />
      </div>
    </div>
  );
}

export function Rail({ activeId }: { activeId: string | null }) {
  const { S, state, update } = useGallery();
  const text = useCatalogText();
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const list = nav.current;
    const link = activeId ? list?.querySelector<HTMLElement>(`[data-id="${activeId}"]`) : null;
    if (!list || !link) return;
    const top = link.offsetTop - list.offsetTop;
    if (top < list.scrollTop + 24 || top > list.scrollTop + list.clientHeight - 48) {
      list.scrollTop = Math.max(0, top - list.clientHeight / 3);
    }
  }, [activeId]);

  const query = formatGalleryQuery({ ...state, variants: {} });
  return (
    <aside className="g-rail g-chrome">
      <div className="g-rail-head">
        <a className="g-brand" href={`${BASE}/${query}`}>
          <img src={`${BASE}/penguin-logo.svg`} alt="" width={30} height={30} />
          <span>
            <strong>{S.brand.title}</strong>
            <small>{S.brand.subtitle}</small>
          </span>
        </a>
        <ModeSwitch />
      </div>

      <ViewControls />
      <div className="g-switches">
        <SwitchRow
          label={S.rail.compare}
          checked={state.compare}
          onChange={(compare) => update({ compare })}
        />
        <SwitchRow
          label={S.rail.reducedMotion}
          checked={state.motion === "reduced"}
          onChange={(on) => update({ motion: on ? "reduced" : "full" })}
        />
      </div>

      <nav ref={nav} className="g-nav" aria-label={S.rail.sections}>
        <a className="g-nav-link g-nav-extra" href={`${BASE}/fonts${query}`}>
          <ChromeIcon name="type" size={14} />
          <span>{S.rail.fonts}</span>
        </a>
        {GROUPS.map(({ id, entries }, g) => {
          const group = entries[0]?.group;
          if (!group) return null;
          return (
            <div key={id} className="g-nav-group">
              <a className="g-nav-group-title" href={`#group-${id}`}>
                <span className="g-num">{String(g + 1).padStart(2, "0")}</span>
                {text.group(group).title}
              </a>
              {entries.map((entry) => (
                <a
                  key={entry.section.id}
                  className="g-nav-link"
                  href={`#${entry.section.id}`}
                  data-id={entry.section.id}
                  data-active={entry.section.id === activeId || undefined}
                  data-planned={!entry.renderable || undefined}
                >
                  <span>{text.section(entry.section).title}</span>
                </a>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="g-rail-foot">
        <strong>{S.rail.feedbackTitle}</strong>
        <p>{S.rail.feedbackBody}</p>
        <code>Console › Actions › Button › danger · sm · dark</code>
      </div>
    </aside>
  );
}
