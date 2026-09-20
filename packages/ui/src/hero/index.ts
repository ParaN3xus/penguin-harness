/**
 * The hero — the gallery's opening section and the composition the landing page reuses. The
 * package exports the section and its scene; the pieces of the window (hero/window.tsx) stay
 * inside, because what a caller wants is the whole opening in the theme it has set.
 */
export { HERO_VARIANTS, Hero } from "./hero";
export type { HeroVariant } from "./hero";
export { HERO_FRAMES, HERO_SCENE } from "./scene";
