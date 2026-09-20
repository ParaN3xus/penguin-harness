/**
 * The fixed left rail (unthemed): the brand line with the mode switch; the tagline; the view
 * controls — theme (by its display name), accent (the active theme's own presets, each painted in
 * its colour, after 随主题), root size (the three real pixel sizes), language, viewport; the
 * compare and reduced-motion switches; a quiet scroll-spied list of the modules and the fonts
 * page; and the feedback note with a breadcrumb example in the chrome's language. Every control
 * writes the URL.
 *
 * At phone width the rail is a top bar — the brand line alone — and a menu button opens the rest
 * as a drawer under it, closed again by a module link, the button or Escape.
 */
import { THEME_IDS } from "@prismshadow/penguin-ui";
import { useEffect, useState } from "react";
import { accentPresetsOf, accentSwatch, THEME_ACCENT } from "../lib/accents";
import { BASE } from "../lib/location";
import { TIER_PX } from "../lib/themes";
import { formatGalleryQuery, LANGS, MODE_PREFS, TIERS, VIEWS } from "../lib/url-state";
import type { ModePref } from "../lib/url-state";
import { useText } from "../preview";
import { MODULES } from "../registry";
import { useGallery } from "../state";
import { Segmented, Swatches, SwitchRow } from "./controls";
import { ChromeIcon } from "./icons";

const MODE_ICONS = { light: "sun", dark: "moon", system: "monitor" } as const;
const VIEW_ICONS = { desktop: "monitor", phone: "phone" } as const;

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

/**
 * The accent row: 随主题 first, painted in the theme's own accent, then the theme's presets, each
 * in the colour it applies in the current mode (the package's light swatch until the probe has
 * resolved the page's CSS).
 */
function AccentControl() {
  const { S, state, mode, accents, update } = useGallery();
  const resolved = accents?.[state.theme][mode] ?? {};
  const options = [THEME_ACCENT, ...accentPresetsOf(state.theme)].map((id) => ({
    value: id,
    label: id === THEME_ACCENT ? S.rail.accentTheme : id,
    color: resolved[id] || accentSwatch(state.theme, id),
  }));
  // A remembered preset the active theme does not list shows as 随主题, which is what applies.
  const shown = options.some((option) => option.value === state.accent)
    ? state.accent
    : THEME_ACCENT;
  return (
    <Swatches
      label={S.rail.accent}
      value={shown}
      options={options}
      onChange={(accent) => update({ accent })}
    />
  );
}

export function ViewControls({ compact = false }: { compact?: boolean }) {
  const { S, state, update } = useGallery();
  const text = useText();
  return (
    <div className="g-controls" data-compact={compact || undefined}>
      <div className="g-control">
        <span className="g-control-label">{S.rail.theme}</span>
        <Segmented
          label={S.rail.theme}
          value={state.theme}
          options={THEME_IDS.map((id) => ({ value: id, label: text.theme(id) }))}
          onChange={(theme) => update({ theme })}
        />
      </div>
      {!compact && (
        <div className="g-control">
          <span className="g-control-label">{S.rail.accent}</span>
          <AccentControl />
        </div>
      )}
      <div className="g-control">
        <span className="g-control-label">{S.rail.size}</span>
        <Segmented
          label={S.rail.size}
          value={state.tier}
          options={TIERS.map((tier) => ({
            value: tier,
            label: `${TIER_PX[tier]}px`,
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
      {!compact && (
        <div className="g-control">
          <span className="g-control-label">{S.rail.viewport}</span>
          <Segmented
            label={S.rail.viewport}
            value={state.view}
            options={VIEWS.map((view) => ({
              value: view,
              label: (
                <span className="g-seg-icon">
                  <ChromeIcon name={VIEW_ICONS[view]} size={13} />
                  {S.rail.viewports[view]}
                </span>
              ),
              title: S.rail.viewports[view],
            }))}
            onChange={(view) => update({ view })}
          />
        </div>
      )}
    </div>
  );
}

export function Rail({ activeId }: { activeId: string | null }) {
  const { S, state, update } = useGallery();
  const text = useText();
  const [open, setOpen] = useState(false);
  const query = formatGalleryQuery({ ...state, variants: {} });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <aside className="g-rail g-chrome" data-open={open || undefined}>
      <div className="g-rail-head">
        <a className="g-brand" href={`${BASE}/${query}`}>
          <img src={`${BASE}/penguin-logo.svg`} alt="" width={28} height={28} />
          <strong>{S.brand.title}</strong>
        </a>
        <ModeSwitch />
        <button
          type="button"
          className="g-icon-button g-rail-menu"
          title={open ? S.rail.closeMenu : S.rail.menu}
          aria-label={open ? S.rail.closeMenu : S.rail.menu}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <ChromeIcon name={open ? "close" : "menu"} />
        </button>
      </div>

      <div className="g-rail-body">
        <p className="g-tagline">{S.brand.tagline}</p>

        <ViewControls />
        <div className="g-switches">
          <SwitchRow
            label={S.rail.compare}
            checked={state.compare === true}
            onChange={(compare) => update({ compare })}
          />
          <SwitchRow
            label={S.rail.reducedMotion}
            checked={state.motion === "reduced"}
            onChange={(on) => update({ motion: on ? "reduced" : "full" })}
          />
        </div>

        <nav className="g-nav" aria-label={S.rail.modules}>
          <span className="g-nav-eyebrow">{S.rail.modules}</span>
          {MODULES.list.map(({ module }) => (
            <a
              key={module.id}
              className="g-nav-link"
              href={`#${module.id}`}
              data-active={module.id === activeId || undefined}
              onClick={() => setOpen(false)}
            >
              {text.module(module).title}
            </a>
          ))}
          <a className="g-nav-link g-nav-fonts" href={`${BASE}/fonts${query}`}>
            <ChromeIcon name="type" size={14} />
            <span>{S.rail.fonts}</span>
          </a>
        </nav>

        <div className="g-rail-foot">
          <strong>{S.rail.feedbackTitle}</strong>
          <p>{S.rail.feedbackBody}</p>
          <code>{S.rail.feedbackExample}</code>
        </div>
      </div>
    </aside>
  );
}
