/**
 * The hero: the product line, the one display title, a sentence and two buttons, over an app
 * window that plays a Task and answers a reader's clicks.
 *
 * It lives in the package rather than in the gallery because the landing page reuses it: the
 * gallery's module file (modules/hero.module.tsx) is a three-line wrapper, and a page that wants
 * the same opening imports `Hero` and sets the theme on its own root.
 *
 * Nothing here branches on the theme. The title carries `.ui-display` through `Heading`, the
 * window is an `AppShell`, and the rest is token utilities, so each theme lays the same markup
 * out its own way.
 */
import { fixturesFor } from "../fixtures";
import type { FixtureLang, Fixtures } from "../fixtures";
import { Button, GlyphIcon, Heading } from "../modules/parts";
import { useHeroScene } from "./scene";
import { HeroStart, HeroWindow } from "./window";

/** The hero's two pictures: a Task under way, and the window before one exists. */
export const HERO_VARIANTS = ["settled", "empty"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

function HeroIntro({ f }: { f: Fixtures }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] justify-items-center gap-4 text-center">
      <p className="text-sm font-(--ui-weight-medium) text-fg-muted">{f.copy.appName}</p>
      <Heading level={1}>{f.hero.title}</Heading>
      <p className="max-w-xl font-sans text-base leading-relaxed text-fg-muted">{f.hero.pitch}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" size="lg" leading={<GlyphIcon name="download" size={15} />}>
          {f.hero.primary}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          trailing={<GlyphIcon name="chevronRight" size={14} />}
        >
          {f.hero.secondary}
        </Button>
      </div>
    </div>
  );
}

/**
 * The whole section. The window reads the card's clock straight from the gallery's provider, and a
 * reader who clicks inside the mock settles that same clock through the scene controls
 * (hero/scene.ts), so the transport and the composition never disagree.
 *
 * The section is the container the window measures itself against, so the same composition falls
 * to one column inside the gallery's 390 px frame and on a phone alike.
 */
export function Hero({
  lang = "en",
  variant = "settled",
}: {
  lang?: FixtureLang;
  variant?: HeroVariant;
}) {
  const f = fixturesFor(lang);
  const { drive } = useHeroScene();
  return (
    <section className="@container grid grid-cols-[minmax(0,1fr)] gap-10">
      <HeroIntro f={f} />
      {/* Sending from the empty window is what ends it: the Session the prompt starts opens. */}
      {variant === "empty" && drive.sent === null ? (
        <HeroStart f={f} drive={drive} />
      ) : (
        <HeroWindow f={f} drive={drive} />
      )}
    </section>
  );
}
