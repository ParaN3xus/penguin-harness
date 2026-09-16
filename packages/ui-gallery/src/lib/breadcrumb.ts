/**
 * The quotable address of whatever a preview card shows:
 *
 *   Console › Actions › Button › danger · sm · dark
 *
 * theme › group › section, then the variant pick (or `all` for a matrix), then the resolved mode,
 * then the language and root size only when they differ from en and 18 px. The parts are English
 * in both chrome languages: the breadcrumb names ids and code, and one quote must mean one view.
 */
import type { ThemeId } from "@prismshadow/penguin-ui";
import type { FontScale } from "@prismshadow/penguin-ui/boot";
import { THEME_NAMES, TIER_PX } from "./themes";
import type { Lang } from "./url-state";

export interface BreadcrumbParts {
  theme: ThemeId;
  group: string;
  section: string;
  /** The selected axis values in axis order, `["all"]` for a matrix; empty for a card without pills. */
  variant?: readonly string[];
  mode: "light" | "dark";
  lang: Lang;
  tier: FontScale;
}

export function formatBreadcrumb(parts: BreadcrumbParts): string {
  const path = [THEME_NAMES[parts.theme], parts.group, parts.section].join(" › ");
  const qualifiers = [...(parts.variant ?? []), parts.mode];
  if (parts.lang !== "en") qualifiers.push(parts.lang);
  if (parts.tier !== "md") qualifiers.push(`${TIER_PX[parts.tier]}px`);
  const tail = qualifiers.join(" · ");
  return parts.variant && parts.variant.length > 0 ? `${path} › ${tail}` : `${path} · ${tail}`;
}
